const mongoose = require("mongoose");
const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false
    },
    specialization: {
        type: String,
        required: false
    },
    phoneNumber: {
        type: Number,   
        required: false
    },
    email: {
        type: String,
        required: false
    },
    role: {
        type: String,
        require:true
    }
}, {
    timestamps: true
})
module.exports = mongoose.model("Doctor", doctorSchema);