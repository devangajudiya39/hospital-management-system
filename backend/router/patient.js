const express = require("express");
const patientRouter = express.Router();
const Appointment = require("../models/Appointment.js");
const Consultation = require("../models/Consultation.js");
const LabReport = require("../models/LabReport.js");
const Bill = require("../models/Bill.js");
const Patient = require("../models/Patient.js");
const Doctor = require("../models/doctor.js");
const { authenticate, authorizeRole } = require("../middleware/authMiddleware.js");

// All patient endpoints require patient role (some might allow admin/receptionist)
patientRouter.use(authenticate, authorizeRole("patient", "admin", "receptionist"));

// ─── GET ALL DOCTORS (for booking dropdown) ───────────────────────────────────
patientRouter.get("/doctors", async (req, res) => {
    try {
        const doctors = await Doctor.find({}, "name specialization email _id");
        res.json(doctors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Helper to get patient details from user id
const getPatientId = async (userId) => {
    let patient = await Patient.findOne({ userId });
    if (!patient) {
        // Auto-create patient profile if empty
        patient = new Patient({ userId });
        await patient.save();
    }
    return patient._id;
};

// Check Doctor Availability
patientRouter.get("/availability", async (req, res) => {
    const { doctorId, date } = req.query;
    try {
        const doc = await Doctor.findById(doctorId);
        if(!doc) return res.status(404).json({message: "Doctor not found"});
        
        // Return dummy slots minus booked slots
        const allSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM"];
        const booked = await Appointment.find({ doctorId, date: new Date(date).setHours(0,0,0,0), status: { $ne: "cancelled" }});
        const bookedSlots = booked.map(b => b.slot);
        
        const availableSlots = allSlots.filter(s => !bookedSlots.includes(s));
        res.json({ availableSlots });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Book Appointment — TEMP: payment check bypassed for testing
patientRouter.post("/book", async (req, res) => {
    const { doctorId, date, slot } = req.body;
    try {
        const patientId = await getPatientId(req.user.id);

        // Check slot availability
        const existing = await Appointment.findOne({
            doctorId, date: new Date(date), slot, status: { $ne: "cancelled" }
        });
        if (existing) return res.status(400).json({ message: "Slot already booked" });

        const appt = new Appointment({
            patientId,
            doctorId,
            date: new Date(date),
            slot,
            status: "confirmed",
        });
        await appt.save();

        res.status(201).json({ message: "Appointment booked successfully", appointment: appt });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.post("/cancel", async (req, res) => {
    const { appointmentId } = req.body;
    try {
        const appt = await Appointment.findById(appointmentId);
        if (!appt) return res.status(404).json({ message: "Appointment not found" });
        
        appt.status = "cancelled";
        await appt.save();
        res.json({ message: "Appointment cancelled" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.post("/reschedule", async (req, res) => {
    const { appointmentId, newDate, newSlot } = req.body;
    try {
        const appt = await Appointment.findById(appointmentId);
        if (!appt) return res.status(404).json({ message: "Appointment not found" });

        appt.date = new Date(newDate);
        appt.slot = newSlot;
        appt.status = "rescheduled";
        await appt.save();
        res.json({ message: "Appointment rescheduled successfully", appointment: appt });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.get("/history", async (req, res) => {
    try {
        const patientId = await getPatientId(req.user.id);
        const history = await Consultation.find({ patientId }).populate("doctorId").populate("appointmentId");
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.get("/reports", async (req, res) => {
    try {
        const patientId = await getPatientId(req.user.id);
        const reports = await LabReport.find({ patientId }).populate("doctorId").populate("requestId");
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

patientRouter.get("/bills", async (req, res) => {
    try {
        const patientId = await getPatientId(req.user.id);
        const bills = await Bill.find({ patientId });
        res.json(bills);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = patientRouter;
