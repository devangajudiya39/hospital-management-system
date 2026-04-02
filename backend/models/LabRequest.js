const mongoose = require("mongoose");

const labRequestSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  consultationId: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation" },
  testType: { type: String, required: true },
  notes: { type: String },
  status: { type: String, enum: ["pending", "in-progress", "completed"], default: "pending" },
  cost: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model("LabRequest", labRequestSchema);
