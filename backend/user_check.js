const mongoose = require("mongoose");
const User = require("./models/user.js");

const mongoURI = "mongodb+srv://devangajudiya39_db_user:Devang543@cluster0.dqvkelh.mongodb.net/hospital-management-system";
mongoose.connect(mongoURI).then(async () => {
    console.log("Connected to MongoDB");
    const user = await User.findOne({ email: "de@123" });
    console.log("User found:", user);
    
    if (user) {
        const isMatch = await user.comparePassword("123");
        console.log("Password match for '123':", isMatch);
    }
    
    mongoose.connection.close();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
