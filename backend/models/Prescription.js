const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema({
  consultationId: { type: mongoose.Schema.Types.ObjectId, ref: "Consultation", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  medicines: [{
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
    dosage: { type: String },
    duration: { type: String },
    quantity: { type: Number }
  }],
  status: { type: String, enum: ["pending", "approved", "dispensed"], default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("Prescription", prescriptionSchema);
