const express = require("express");
const doctorRouter = express.Router();
const Appointment = require("../models/Appointment.js");
const Consultation = require("../models/Consultation.js");
const Prescription = require("../models/Prescription.js");
const LabRequest = require("../models/LabRequest.js");
const LabReport = require("../models/LabReport.js");
const Doctor = require("../models/doctor.js");
const Bill = require("../models/Bill.js");
const Medicine = require("../models/Medicine.js");
const Patient = require("../models/Patient.js");
const Room = require("../models/Room.js");
const { authenticate, authorizeRole } = require("../middleware/authMiddleware.js");

doctorRouter.use(authenticate, authorizeRole("doctor", "admin"));

// Helper: Get Doctor document by user email
const getDoctorByEmail = async (email) => {
    return await Doctor.findOne({ email });
};

// ─── GET SCHEDULE ────────────────────────────────────────────────────────────
doctorRouter.get("/schedule", async (req, res) => {
    try {
        const doctor = await getDoctorByEmail(req.user.email);
        if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const appointments = await Appointment.find({
            doctorId: doctor._id,
            date: { $gte: startOfDay }
        }).populate({ path: "patientId", populate: { path: "userId", select: "name email" } });

        // Flatten for frontend: attach patient name from nested userId
        const result = appointments.map(a => ({
            _id: a._id,
            slot: a.slot,
            date: a.date,
            status: a.status,
            patientId: {
                _id: a.patientId?._id,
                name: a.patientId?.userId?.name || "Unknown",
                userId: a.patientId?.userId?._id
            }
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── MARK APPOINTMENT SEEN ───────────────────────────────────────────────────
doctorRouter.patch("/appointment/:id/seen", async (req, res) => {
    try {
        const appt = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: "completed" },
            { new: true }
        );
        if (!appt) return res.status(404).json({ message: "Appointment not found" });
        res.json({ message: "Appointment marked as completed", appointment: appt });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET PATIENT DETAIL ───────────────────────────────────────────────────────
doctorRouter.get("/patient/:patientId", async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.patientId)
            .populate("userId", "name email")
            .populate("roomId");

        if (!patient) return res.status(404).json({ message: "Patient not found" });

        // Fetch past consultations for this patient
        const consultations = await Consultation.find({ patientId: patient._id })
            .populate("doctorId", "name specialization")
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({ patient, consultations });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── CREATE CONSULTATION ─────────────────────────────────────────────────────
doctorRouter.post("/consultation", async (req, res) => {
    const { patientId, appointmentId, symptoms, diagnosis, notes } = req.body;
    try {
        const doctor = await getDoctorByEmail(req.user.email);
        if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

        const consultation = new Consultation({
            patientId,
            doctorId: doctor._id,
            appointmentId,
            symptoms,
            diagnosis,
            notes,
            status: "completed"
        });
        await consultation.save();

        // Update appointment status
        await Appointment.findByIdAndUpdate(appointmentId, { status: "completed" });

        // Trigger Billing update (Consultation Fee = 500)
        let bill = await Bill.findOne({ patientId, status: { $in: ["unpaid", "partially_paid"] } });
        if (!bill) {
            bill = new Bill({ patientId, consultationFee: 500, totalAmount: 500, finalAmountDue: 500 });
        } else {
            bill.consultationFee = (bill.consultationFee || 0) + 500;
            bill.totalAmount = (bill.consultationFee || 0) + (bill.labCharges || 0) + (bill.medicineCost || 0) + (bill.roomCharges || 0);
            bill.finalAmountDue = bill.totalAmount - (bill.partialPaymentReceived || 0);
        }
        await bill.save();

        res.status(201).json({ message: "Consultation created", consultation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GENERATE PRESCRIPTION ───────────────────────────────────────────────────
doctorRouter.post("/prescription", async (req, res) => {
    const { consultationId, patientId, medicines } = req.body;
    try {
        const doctor = await getDoctorByEmail(req.user.email);
        if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

        const prescription = new Prescription({
            consultationId,
            patientId,
            doctorId: doctor._id,
            medicines,
            status: "approved"
        });
        await prescription.save();
        res.status(201).json({ message: "Prescription generated", prescription });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── REQUEST LAB TEST ────────────────────────────────────────────────────────
doctorRouter.post("/lab-request", async (req, res) => {
    const { patientId, consultationId, testType, notes } = req.body;
    try {
        const doctor = await getDoctorByEmail(req.user.email);
        if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

        const reqTest = new LabRequest({
            patientId,
            doctorId: doctor._id,
            consultationId: consultationId || undefined,
            testType,
            notes,
            status: "pending",
            cost: 1000
        });
        await reqTest.save();

        // Add to Bill
        let bill = await Bill.findOne({ patientId, status: { $in: ["unpaid", "partially_paid"] } });
        if (bill) {
            bill.labCharges = (bill.labCharges || 0) + 1000;
            bill.totalAmount = (bill.consultationFee || 0) + (bill.labCharges || 0) + (bill.medicineCost || 0) + (bill.roomCharges || 0);
            bill.finalAmountDue = bill.totalAmount - (bill.partialPaymentReceived || 0);
            await bill.save();
        } else {
            const newBill = new Bill({ patientId, labCharges: 1000, totalAmount: 1000, finalAmountDue: 1000 });
            await newBill.save();
        }

        res.status(201).json({ message: "Lab request generated", labRequest: reqTest });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET LAB REPORTS ─────────────────────────────────────────────────────────
doctorRouter.get("/reports", async (req, res) => {
    try {
        const doctor = await getDoctorByEmail(req.user.email);
        if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

        const reports = await LabReport.find({ doctorId: doctor._id })
            .populate({ path: "patientId", populate: { path: "userId", select: "name" } })
            .populate("requestId")
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET ROOMS ───────────────────────────────────────────────────────────────
doctorRouter.get("/rooms", async (req, res) => {
    try {
        const rooms = await Room.find().populate({
            path: "currentPatientId",
            populate: { path: "userId", select: "name" }
        });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── GET MEDICINES (for prescription dropdown) ───────────────────────────────
doctorRouter.get("/medicines", async (req, res) => {
    try {
        const meds = await Medicine.find({ stockQuantity: { $gt: 0 } });
        res.json(meds);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = doctorRouter;
