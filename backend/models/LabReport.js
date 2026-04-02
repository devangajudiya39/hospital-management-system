const mongoose = require("mongoose");

const labReportSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: "LabRequest", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  resultDetails: { type: String, required: true },
  fileUrl: { type: String }, // Path to uploaded PDF/Image report
  status: { type: String, enum: ["pending", "completed"], default: "completed" }
}, { timestamps: true });

module.exports = mongoose.model("LabReport", labReportSchema);
