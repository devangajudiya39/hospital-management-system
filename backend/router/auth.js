const express = require("express");
const authRouter = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user.js");
const { JWT_SECRET, authenticate, authorizeRole } = require("../middleware/authMiddleware.js");
const { sendEmail } = require("../emails_services/EmailSerbvices.js");

// Send welcome/test email
async function sendtestEmail(req, res) {
    try {
        const { email, name } = req.body;
        const payload = {
            to: email,
            subject: "Test Email from HMS",
            body: `<p>Hello ${name},</p><p>Welcome to the Hospital Management System.</p>`
        };
        await sendEmail(payload.to, payload.subject, payload.body);
        return res.json({ status: 200, message: "Email sent successfully" });
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: "Failed to send email" });
    }
}

// Register User
authRouter.post("/register", async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        console.log(existingUser);
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const newUser = new User({ name, email, password, role });
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Send test/welcome email
authRouter.post("/send-test-email", sendtestEmail);

// Login User
authRouter.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        console.log(email, password);
        const user = await User.findOne({ email });
        console.log(user);
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Account deactivated. Contact admin." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "10h" }
        );

        res.json({ message: "Login successful", token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Get Profile Info
authRouter.get("/profile", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update Profile
authRouter.put("/profile", authenticate, async (req, res) => {
    const { name } = req.body;
    try {
        const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true }).select("-password");
        res.json({ message: "Profile updated", user });
    } catch (error) {
        res.status(500).json({ message: "Failed to update profile" });
    }
});
// Forgot Password
authRouter.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP and expiration (10 mins)
        user.resetOtp = otp;
        user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        const subject = "Password Reset OTP - Hospital Management System";
        const body = `
            <p>Hello ${user.name},</p>
            <p>You requested a password reset. Here is your One Time Password (OTP):</p>
            <h2 style="color: #0d9488; letter-spacing: 2px;">${otp}</h2>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you did not request this, please safely ignore this email.</p>
        `;

        await sendEmail(email, subject, body);
        res.json({ message: "A 6-digit OTP has been sent to your email" });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: "Failed to send reset OTP" });
    }
});

// Reset Password
authRouter.post("/reset-password", async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const user = await User.findOne({ 
            email, 
            resetOtp: otp, 
            resetOtpExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Note: hashing is handled by the pre-save hook in user model
        user.password = newPassword;
        user.resetOtp = undefined;
        user.resetOtpExpires = undefined;
        await user.save();

        res.json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Failed to reset password" });
    }
});

module.exports = authRouter;