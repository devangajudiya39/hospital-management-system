const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ["general", "private", "icu"], required: true },
  status: { type: String, enum: ["available", "occupied", "maintenance"], default: "available" },
  dailyRate: { type: Number, required: true },
  currentPatientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", default: null }
}, { timestamps: true });

module.exports = mongoose.model("Room", roomSchema);
