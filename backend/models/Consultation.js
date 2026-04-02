const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
  symptoms: { type: String },
  diagnosis: { type: String },
  notes: { type: String },
  status: { type: String, enum: ["pending", "completed"], default: "completed" },
}, { timestamps: true });

module.exports = mongoose.model("Consultation", consultationSchema);
