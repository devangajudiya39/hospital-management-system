const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const mongoURI = process.env.MONGO_URI || "mongodb+srv://devangajudiya39_db_user:Devang543@cluster0.dqvkelh.mongodb.net/hospital-management-system";

const seedData = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoURI);
        console.log("Connected.");
        
        const dummyUsers = [
            { name: "Admin Test", email: "admin@hms.com", password: "password123", role: "admin", isActive: true },
            { name: "Dr. Doctor Test", email: "doctor@hms.com", password: "password123", role: "doctor", isActive: true },
            { name: "Patient Test", email: "patient@hms.com", password: "password123", role: "patient", isActive: true },
            { name: "Receptionist Test", email: "receptionist@hms.com", password: "password123", role: "receptionist", isActive: true },
            { name: "Pharmacist Test", email: "pharmacist@hms.com", password: "password123", role: "pharmacist", isActive: true },
            { name: "Lab Staff Test", email: "lab@hms.com", password: "password123", role: "lab_staff", isActive: true }
        ];

        for (let u of dummyUsers) {
            const existing = await User.findOne({ email: u.email });
            if (!existing) {
                const newUser = new User(u);
                await newUser.save();
                console.log(`Created: ${u.role} (${u.email})`);
            } else {
                console.log(`Already exists: ${u.role} (${u.email})`);
            }
        }
        console.log("Seeding complete!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

seedData();
