const mongioose = require("mongoose");
const labSchema = new mongioose.Schema({
    name: {
        type: String,
        required: false
    },
    location: { 
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
module.exports = mongioose.model("Lab", labSchema);
