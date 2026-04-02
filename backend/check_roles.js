require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user.js");

const mongoURI = "mongodb+srv://devangajudiya39_db_user:Devang543@cluster0.dqvkelh.mongodb.net/hospital-management-system";

mongoose.connect(mongoURI).then(async () => {
    const pharmaUsers = await User.find({ role: { $regex: /pharm/, $options: "i" } });
    console.log("Pharmacy Users:", pharmaUsers.map(u => ({ email: u.email, role: u.role })));
    process.exit(0);
}).catch(console.error);
