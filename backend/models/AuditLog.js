const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
  action: { type: String, required: true },
  details: { type: String },
  resourceType: { type: String },
  resourceId: { type: String },
  purpose: { type: String },
  consentId: { type: mongoose.Schema.Types.ObjectId, ref: "Consent" },
  success: { type: Boolean, default: true },
  reason: { type: String },
  ipAddress: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("AuditLog", auditLogSchema);
