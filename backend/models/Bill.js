const mongoose = require("mongoose");

const billSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  consultationFee: { type: Number, default: 0 },
  labCharges: { type: Number, default: 0 },
  medicineCost: { type: Number, default: 0 },
  roomCharges: { type: Number, default: 0 },
  partialPaymentReceived: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  finalAmountDue: { type: Number, default: 0 },
  status: { type: String, enum: ["unpaid", "partially_paid", "paid"], default: "unpaid" },
}, { timestamps: true });

module.exports = mongoose.model("Bill", billSchema);
