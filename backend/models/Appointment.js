const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  date: { type: Date, required: true },
  slot: { type: String, required: true },
  status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled", "rescheduled"], default: "pending" },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" }
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
