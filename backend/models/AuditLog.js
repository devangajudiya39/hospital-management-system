const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  details: { type: String },
  ipAddress: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("AuditLog", auditLogSchema);
