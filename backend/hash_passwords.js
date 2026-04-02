require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/user.js");

const mongoURI = "mongodb+srv://devangajudiya39_db_user:Devang543@cluster0.dqvkelh.mongodb.net/hospital-management-system";

mongoose.connect(mongoURI).then(async () => {
    console.log("Connected to DB to fix passwords...");
    const users = await User.find({});
    let count = 0;
    for (let u of users) {
        if (!u.password.startsWith("$2")) {
            console.log(`Hashing password for user: ${u.email}`);
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(u.password, salt);
            await User.updateOne({ _id: u._id }, { $set: { password: hashed } });
            count++;
        }
    }
    console.log(`Successfully fixed passwords for ${count} users.`);
    mongoose.connection.close();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
