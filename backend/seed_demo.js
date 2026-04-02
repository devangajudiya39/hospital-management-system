const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

// Models
const User = require("./models/user");
const Doctor = require("./models/doctor");
const Patient = require("./models/Patient");
const Room = require("./models/Room");
const Appointment = require("./models/Appointment");
const Consultation = require("./models/Consultation");
const Medicine = require("./models/Medicine");
const Prescription = require("./models/Prescription");
const LabRequest = require("./models/LabRequest");
const LabReport = require("./models/LabReport");
const Bill = require("./models/Bill");
const Payment = require("./models/Payment");

const mongoURI = process.env.MONGO_URI || "mongodb+srv://devangajudiya39_db_user:Devang543@cluster0.dqvkelh.mongodb.net/hospital-management-system";

async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  console.log("collections cleared.");
}

const seedDemoData = async () => {
  try {
    console.log("Connecting to MongoDB for Full Demo Seeding...");
    await mongoose.connect(mongoURI);
    console.log("Connected.");

    // WARNING: For demo purposes, we will clear all data. In production this shouldn't be done!
    await clearCollections();

    // 1. Create Medicines
    console.log("Creating Modules...");
    const medicinesData = [
      { name: "Paracetamol 500mg", unitPrice: 2.0, stockQuantity: 500, lowStockThreshold: 100 },
      { name: "Amoxicillin 500mg", unitPrice: 8.0, stockQuantity: 200, lowStockThreshold: 50 },
      { name: "Ibuprofen 400mg", unitPrice: 3.5, stockQuantity: 300, lowStockThreshold: 50 },
    ];
    const createdMedicines = await Medicine.insertMany(medicinesData);

    // 2. Create Rooms
    const roomsData = [
      { roomNumber: "101", type: "general", dailyRate: 500 },
      { roomNumber: "102", type: "general", dailyRate: 500 },
      { roomNumber: "201", type: "private", dailyRate: 1500 },
      { roomNumber: "301", type: "icu", dailyRate: 5000 },
    ];
    const createdRooms = await Room.insertMany(roomsData);

    // 3. Create Users
    console.log("Creating Users...");
    const dummyUsers = [
      { name: "Admin Setup", email: "admin@demo.com", password: "password", role: "admin" },
      { name: "Receptionist Emma", email: "reception@demo.com", password: "password", role: "receptionist" },
      { name: "Pharmacist Phil", email: "pharma@demo.com", password: "password", role: "pharmacist" },
      { name: "Lab Staff Luke", email: "lab@demo.com", password: "password", role: "lab_staff" },
    ];

    for (let u of dummyUsers) {
      await new User(u).save();
    }

    // DOCTORS
    const doc1Info = { name: "Dr. Gregory House", email: "house@demo.com", password: "password", role: "doctor" };
    const doc2Info = { name: "Dr. Meredith Grey", email: "grey@demo.com", password: "password", role: "doctor" };
    const docUser1 = await new User(doc1Info).save();
    const docUser2 = await new User(doc2Info).save();

    const createdDoc1 = await new Doctor({
      name: doc1Info.name, specialization: "Diagnostic Medicine", phoneNumber: 1234567890, email: doc1Info.email, role: "doctor"
    }).save();

    const createdDoc2 = await new Doctor({
      name: doc2Info.name, specialization: "General Surgery", phoneNumber: 1234567891, email: doc2Info.email, role: "doctor"
    }).save();

    console.log("Creating Patients...");
    // PATIENTS
    const patient1Info = { name: "John Doe", email: "john@demo.com", password: "password", role: "patient" };
    const patient2Info = { name: "Jane Smith", email: "jane@demo.com", password: "password", role: "patient" };

    const patientUser1 = await new User(patient1Info).save();
    const patientUser2 = await new User(patient2Info).save();

    const createdPatient1 = await new Patient({
      userId: patientUser1._id, dateOfBirth: new Date("1980-01-01"), gender: "male", phoneNumber: "9876543210", address: "123 Main St", medicalHistory: "None"
    }).save();

    const createdPatient2 = await new Patient({
      userId: patientUser2._id, dateOfBirth: new Date("1995-05-15"), gender: "female", phoneNumber: "9876543211", address: "456 Elm St", medicalHistory: "Asthma"
    }).save();

    console.log("Creating Appointments & Workflows...");
    // 4. Create Appointments
    // Setup a flow for Patient 1 -> House (Completed)
    const appt1 = await new Appointment({
      patientId: createdPatient1._id,
      doctorId: createdDoc1._id,
      date: new Date(),
      slot: "10:00 AM",
      status: "completed"
    }).save();

    // Setup a flow for Patient 2 -> Grey (Pending)
    const appt2 = await new Appointment({
      patientId: createdPatient2._id,
      doctorId: createdDoc2._id,
      date: new Date(new Date().getTime() + 86400000), // tomorrow
      slot: "11:00 AM",
      status: "confirmed"
    }).save();

    // 5. Create Consultation for Patient 1
    const consult1 = await new Consultation({
      patientId: createdPatient1._id,
      doctorId: createdDoc1._id,
      appointmentId: appt1._id,
      symptoms: "Fever, headache, chills",
      diagnosis: "Common Cold",
      notes: "Rest and fluids. Prescribed simple antipyretics.",
      status: "completed"
    }).save();

    // 6. Create Prescription for Patient 1
    const script1 = await new Prescription({
      consultationId: consult1._id,
      patientId: createdPatient1._id,
      doctorId: createdDoc1._id,
      medicines: [
        { medicineId: createdMedicines[0]._id, dosage: "1-0-1", duration: "3 days", quantity: 6 }
      ],
      status: "pending"
    }).save();

    // 7. Create Lab Request & Report for Patient 1
    const labReq1 = await new LabRequest({
      patientId: createdPatient1._id,
      doctorId: createdDoc1._id,
      consultationId: consult1._id,
      testType: "Complete Blood Count",
      notes: "Check hematocrit levels",
      status: "completed",
      cost: 50
    }).save();

    await new LabReport({
      requestId: labReq1._id,
      patientId: createdPatient1._id,
      doctorId: createdDoc1._id,
      resultDetails: "WBC count slightly elevated. Otherwise normal.",
      status: "completed"
    }).save();

    // 8. Create Bills
    const bill1 = await new Bill({
      patientId: createdPatient1._id,
      consultationFee: 1000,
      labCharges: 50,
      medicineCost: 12, // 6 * 2.0
      roomCharges: 0,
      partialPaymentReceived: 500,
      totalAmount: 1062,
      finalAmountDue: 562,
      status: "partially_paid"
    }).save();

    const payment1 = await new Payment({
      patientId: createdPatient1._id,
      billId: bill1._id,
      amount: 500,
      paymentMethod: "credit_card",
      type: "FINAL",
      transactionId: "TXN123456",
      status: "success"
    }).save();

    console.log("Full Demo Seeding complete!");
    console.log("You can log in with:");
    console.log("Admin: admin@demo.com / password");
    console.log("Doctor: house@demo.com / password");
    console.log("Receptionist: reception@demo.com / password");
    console.log("Pharmacist: pharma@demo.com / password");
    console.log("Lab: lab@demo.com / password");
    console.log("Patient: john@demo.com / password");
    process.exit(0);

  } catch (err) {
    console.error("Demo seeding failed:", err);
    process.exit(1);
  }
};

seedDemoData();
