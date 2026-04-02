const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const app = express();
const port = 8080;

app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
}));

// DB Connection
const mongoURI = "mongodb+srv://devangajudiya39_db_user:Devang543@cluster0.dqvkelh.mongodb.net/hospital-management-system";
mongoose.connect(mongoURI).then(() => {
    console.log("Connected to MongoDB database");
}).catch((err) => {
    console.error("Error connecting to database", err);
});

// Routers
const authRouter = require("./router/auth.js");
const adminRouter = require("./router/admin.js");
const patientRouter = require("./router/patient.js");
const doctorRouter = require("./router/doctor.js");
const labRouter = require("./router/lab.js");
const pharmacyRouter = require("./router/pharmacy.js");
const receptionistRouter = require("./router/receptionist.js");
const billRouter = require("./router/bill.js");

// API Mounts
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/patient", patientRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/lab", labRouter);
app.use("/api/pharmacy", pharmacyRouter);
app.use("/api/receptionist", receptionistRouter);
app.use("/api/billing", billRouter);


app.get("/", (req, res) => {
    res.send("HMS API is running.");
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});