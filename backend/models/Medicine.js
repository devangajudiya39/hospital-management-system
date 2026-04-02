const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  manufacturer: { type: String },
  unitPrice: { type: Number, required: true },
  stockQuantity: { type: Number, required: true, default: 0 },
  lowStockThreshold: { type: Number, default: 10 }
}, { timestamps: true });

module.exports = mongoose.model("Medicine", medicineSchema);
