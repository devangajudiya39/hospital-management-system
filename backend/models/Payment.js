const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  type: { type: String, enum: ["APPOINTMENT", "FINAL"], required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" }, // Provided if it's an appointment payment
  billId: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" }, // Provided if it's a final payment
  paymentMethod: { type: String },
  transactionId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
