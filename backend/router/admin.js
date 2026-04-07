const express = require("express");
const adminRouter = express.Router();
const User = require("../models/user.js");
const { authenticate, authorizeRole } = require("../middleware/authMiddleware.js");

// All admin routes are protected
adminRouter.use(authenticate, authorizeRole("admin"));

// Create User (Roles: Doctor, Lab Staff, Pharmacist, Receptionist)
adminRouter.post("/create-user", async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const newUser = new User({ name, email, password, role, isActive: true });
        await newUser.save();
        res.status(201).json({ message: "User created successfully", user: { id: newUser._id, email: newUser.email, role: newUser.role } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Deactivate User
adminRouter.patch("/deactivate-user/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isActive = !user.isActive; // toggle active status
        await user.save();
        res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, isActive: user.isActive });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get users list (for management)
adminRouter.get("/users", async (req, res) => {
    try {
        const users = await User.find({ role: { $in: ["doctor", "lab_staff", "pharmacist", "receptionist", "patient"] } }).select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Analytics mock or real data grouping
adminRouter.get("/reports", async (req, res) => {
    res.json({ message: "General Reports endpoint - ready for aggregation" });
});

// Revenue Analytics
adminRouter.get("/revenue", async (req, res) => {
    const Bill = require("../models/Bill.js");
    try {
        const paidBills = await Bill.find({ status: { $in: ["partially_paid", "paid"] } });
        const totalRevenue = paidBills.reduce((acc, bill) => {
            return acc + (bill.status === "paid" ? (bill.totalAmount || 0) : (bill.partialPaymentReceived || 0));
        }, 0);
        const billsCount = paidBills.filter(bill => bill.status === "paid").length;
        res.json({ totalRevenue, billsCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = adminRouter;
