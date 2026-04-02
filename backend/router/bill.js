const express = require("express");
const billRouter = express.Router();
const Bill = require("../models/Bill.js");
const Payment = require("../models/Payment.js");
const Appointment = require("../models/Appointment.js");
const Room = require("../models/Room.js");
const Patient = require("../models/Patient.js");
const { authenticate, authorizeRole } = require("../middleware/authMiddleware.js");

billRouter.use(authenticate); // Allow patients and roles

// Calculate Partial Fee (for Appointment)
billRouter.post("/calculate-partial-fee", async (req, res) => {
    try {
        // Flat standard partial fee for all appointments
        const partialFee = 200; 
        res.json({ partialFee });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Process Appointment Payment
billRouter.post("/process-appointment-payment", async (req, res) => {
    const { patientId, amount, paymentMethod } = req.body;
    // In real-world, we'd integrate Stripe/Razorpay here. Assuming success:
    try {
        const payment = new Payment({
            patientId,
            amount,
            status: "success",
            type: "APPOINTMENT",
            paymentMethod,
            transactionId: "TXN_" + Math.random().toString(36).substr(2, 9).toUpperCase()
        });
        await payment.save();

        // Add to billing as partial payment
        let bill = await Bill.findOne({ patientId, status: { $in: ["unpaid", "partially_paid"] } });
        if (!bill) {
             bill = new Bill({ patientId, partialPaymentReceived: amount, status: "partially_paid" });
        } else {
             bill.partialPaymentReceived += amount;
             bill.status = "partially_paid";
        }
        await bill.save();

        res.json({ message: "Appointment payment successful. Proceed to book.", payment });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Calculate Final Bill
billRouter.get("/calculate-bill/:patientId", async (req, res) => {
    try {
        const bill = await Bill.findOne({ patientId: req.params.patientId, status: { $in: ["unpaid", "partially_paid"] } });
        if(!bill) return res.status(404).json({ message: "No active bill found" });

        // Room charges logic (simplified)
        const patient = await Patient.findById(req.params.patientId).populate("roomId");
        if(patient && patient.roomId) {
            bill.roomCharges = patient.roomId.dailyRate; // e.g. 1 day charge for simplicity
        }

        bill.totalAmount = bill.consultationFee + bill.labCharges + bill.medicineCost + bill.roomCharges;
        bill.finalAmountDue = bill.totalAmount - bill.partialPaymentReceived;
        await bill.save();

        res.json({ bill });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Generate Invoice
billRouter.get("/generate-invoice/:billId", async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.billId).populate("patientId");
        if(!bill) return res.status(404).json({ message: "Bill not found" });

        res.json({ invoice: bill, message: "Invoice data ready for PDF generation in frontend" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Process Final Payment
billRouter.post("/process-final-payment", async (req, res) => {
    const { billId, paymentMethod } = req.body;
    try {
        const bill = await Bill.findById(billId);
        if(!bill) return res.status(404).json({ message: "Bill not found" });

        const payment = new Payment({
            patientId: bill.patientId,
            amount: bill.finalAmountDue,
            status: "success",
            type: "FINAL",
            billId: bill._id,
            paymentMethod,
            transactionId: "TXN_" + Math.random().toString(36).substr(2, 9).toUpperCase()
        });
        await payment.save();

        bill.status = "paid";
        bill.finalAmountDue = 0;
        await bill.save();

        // TRIGGER: Discharge & Room Deallocation
        const patient = await Patient.findById(bill.patientId);
        if(patient && patient.roomId) {
            const room = await Room.findById(patient.roomId);
            if(room) {
                room.status = "available";
                room.currentPatientId = null;
                await room.save();
            }
            patient.roomId = null;
            await patient.save();
        }

        res.json({ message: "Final payment successful. Patient discharged and room deallocated.", payment, bill });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = billRouter;
