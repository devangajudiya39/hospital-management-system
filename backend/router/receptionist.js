const express = require("express");
const receptionistRouter = express.Router();
const Appointment = require("../models/Appointment.js");
const Room = require("../models/Room.js");
const Patient = require("../models/Patient.js");
const { authenticate, authorizeRole } = require("../middleware/authMiddleware.js");

receptionistRouter.use(authenticate, authorizeRole("receptionist", "admin"));

// Manage Appointments — deep-populate patient name via userId
receptionistRouter.get("/appointments", async (req, res) => {
    try {
        const appts = await Appointment.find()
            .populate({ path: "patientId", populate: { path: "userId", select: "name email" } })
            .populate("doctorId", "name specialization")
            .sort({ date: -1 });

        // Flatten for frontend so patientId.name and doctorId.name are always available
        const result = appts.map(a => ({
            _id:       a._id,
            slot:      a.slot,
            date:      a.date,
            status:    a.status,
            patientId: {
                _id:  a.patientId?._id,
                name: a.patientId?.userId?.name || "—",
            },
            doctorId: {
                _id:  a.doctorId?._id,
                name: a.doctorId?.name || "—",
            },
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Check Room availability
receptionistRouter.get("/rooms/available", async (req, res) => {
    try {
        const rooms = await Room.find({ status: "available" });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Allocate Room
receptionistRouter.post("/rooms/allocate", async (req, res) => {
    const { patientId, roomId } = req.body;
    try {
        const room = await Room.findById(roomId);
        if (!room || room.status !== "available") {
            return res.status(400).json({ message: "Room not available" });
        }

        const patient = await Patient.findById(patientId);
        if(!patient) return res.status(404).json({ message: "Patient not found" });

        room.status = "occupied";
        room.currentPatientId = patientId;
        await room.save();

        patient.roomId = roomId;
        await patient.save();

        res.json({ message: `Room ${room.roomNumber} allocated to patient successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Discharge / Deallocate Room (Usually triggered by Final Payment, but receptionist can also force)
receptionistRouter.post("/rooms/deallocate", async (req, res) => {
    const { roomId } = req.body;
    try {
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (room.currentPatientId) {
            const patient = await Patient.findById(room.currentPatientId);
            if (patient) {
                patient.roomId = null;
                await patient.save();
            }
        }

        room.status = "available";
        room.currentPatientId = null;
        await room.save();

        res.json({ message: "Room deallocated" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = receptionistRouter;
