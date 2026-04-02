const mongoose = require("mongoose");
const paisantSchema = new mongoose.Schema({
    name: {
        type: String,
        required:false
    },
    address: {
        type: {
            houseNumber: {
                type: String,
                required:false
            },
            street: {
                type: String,
                required:false
            },
            city: {
                type: String,
                required:false  
            },
            state: {
                type: String,

                required:false
            },
            country: {  
                type: String,
                required:false
            },
        },
        required:false
    },
    phoneNumber: {
        type: Number,
        required:false
    },
    email: {    
        type: String,
        required:false
    },
    role: {
        type: String,
        require:true    
    }
}, {
    timestamps: true
})
module.exports = mongoose.model("Paisant", paisantSchema);