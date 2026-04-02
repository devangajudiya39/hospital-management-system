const express = require("express");
const pharmacyRouter = express.Router();
const Prescription = require("../models/Prescription.js");
const Medicine = require("../models/Medicine.js");
const Bill = require("../models/Bill.js");
const { authenticate, authorizeRole } = require("../middleware/authMiddleware.js");

pharmacyRouter.use(authenticate, authorizeRole("pharmacist", "admin"));

// Get approved prescriptions
pharmacyRouter.get("/prescriptions", async (req, res) => {
    try {
        const prescriptions = await Prescription.find({ status: "approved" })
            .populate({ path: "patientId", populate: { path: "userId", select: "name" } })
            .populate("doctorId", "name")
            .populate("medicines.medicineId")
            .sort({ createdAt: -1 });

        const result = prescriptions.map(p => ({
            _id: p._id,
            status: p.status,
            medicines: p.medicines,
            patientId: {
                _id: p.patientId?._id,
                name: p.patientId?.userId?.name || "—"
            },
            doctorId: {
                _id: p.doctorId?._id,
                name: p.doctorId?.name || "—"
            }
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Dispense Medicine
pharmacyRouter.post("/dispense/:id", async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id);
        if (!prescription || prescription.status !== "approved") {
            return res.status(400).json({ message: "Prescription not found or not approved" });
        }

        let totalMedsCost = 0;

        // Deduct stock and calculate cost
        for (let item of prescription.medicines) {
            const med = await Medicine.findById(item.medicineId);
            if (!med) continue;

            if (med.stockQuantity < item.quantity) {
                 // In realistic scenario, we'd halt or partially dispense. 
                 // For now, assume strict stock deduction.
                 return res.status(400).json({ message: `Insufficient stock for ${med.name}` });
            }

            med.stockQuantity -= item.quantity;
            await med.save();

            totalMedsCost += (med.unitPrice * item.quantity);
        }

        prescription.status = "dispensed";
        await prescription.save();

        // Update Billing
        let bill = await Bill.findOne({ patientId: prescription.patientId, status: { $in: ["unpaid", "partially_paid"] } });
        if(bill) {
            bill.medicineCost += totalMedsCost;
            await bill.save();
        } else {
            const newBill = new Bill({ patientId: prescription.patientId, medicineCost: totalMedsCost });
            await newBill.save();
        }

        res.json({ message: "Medicines dispensed and stock deductive. Billing updated.", prescription });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Inventory: Add New Stock
pharmacyRouter.post("/stock", async (req, res) => {
    try {
        const { name, quantity, price, lowStockThreshold } = req.body;
        
        let med = await Medicine.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
        if (med) {
            med.stockQuantity += quantity;
            med.unitPrice = price; // update price if needed
            med.lowStockThreshold = lowStockThreshold;
            await med.save();
            return res.status(200).json({ message: "Stock updated successfully", medicine: med });
        }
        
        const newMed = new Medicine({ 
            name, 
            unitPrice: price, 
            stockQuantity: quantity, 
            lowStockThreshold 
        });
        await newMed.save();
        res.status(201).json({ message: "Medicine added to inventory", medicine: newMed });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Inventory: Get all
pharmacyRouter.get("/inventory", async (req, res) => {
    try {
        const meds = await Medicine.find();
        res.json(meds);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Inventory: Update Stock
pharmacyRouter.patch("/update-stock/:id", async (req, res) => {
    const { quantityToAdd } = req.body; // sending increment amount
    try {
        const med = await Medicine.findById(req.params.id);
        if(!med) return res.status(404).json({ message: "Medicine not found" });

        med.stockQuantity += Number(quantityToAdd);
        await med.save();

        const alert = med.stockQuantity <= med.lowStockThreshold ? ` ALERT: Low stock for ${med.name}` : "";
        res.json({ message: `Stock updated.${alert}`, medicine: med });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = pharmacyRouter;
