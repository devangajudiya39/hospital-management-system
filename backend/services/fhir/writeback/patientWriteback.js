const mongoose = require("mongoose");
const Patient = require("../../../models/Patient");
const User = require("../../../models/user");

async function writePatient(fhirPatient) {
  if (fhirPatient.resourceType !== "Patient") {
    return { success: false, error: "Unsupported resourceType" };
  }

  const patientId = fhirPatient.id;
  if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
    return { success: false, error: "Invalid or missing Patient ID format" };
  }

  // Find existing Patient
  const patient = await Patient.findById(patientId);
  if (!patient) {
    return { success: false, error: "Patient not found" };
  }

  if (!patient.userId) {
    return { success: false, error: "Patient has no associated User" };
  }

  // Find existing User
  const user = await User.findById(patient.userId);
  if (!user) {
    return { success: false, error: "Referenced User not found" };
  }

  // Prepare updates (Only explicitly present fields)
  const patientUpdates = {};
  const userUpdates = {};

  if (fhirPatient.gender) {
    const allowedGenders = ["male", "female", "other"];
    if (allowedGenders.includes(fhirPatient.gender)) {
      patientUpdates.gender = fhirPatient.gender;
    }
  }

  if (fhirPatient.birthDate) {
    const d = new Date(fhirPatient.birthDate);
    if (!isNaN(d.getTime())) {
      patientUpdates.dateOfBirth = d;
    } else {
      return { success: false, error: "Invalid birthDate format" };
    }
  }

  if (fhirPatient.name && Array.isArray(fhirPatient.name) && fhirPatient.name[0] && fhirPatient.name[0].text) {
    userUpdates.name = fhirPatient.name[0].text.trim();
  }

  if (fhirPatient.telecom && Array.isArray(fhirPatient.telecom)) {
    for (const t of fhirPatient.telecom) {
      if (t.system === "phone" && t.value) {
        patientUpdates.phoneNumber = t.value.trim();
      }
      if (t.system === "email" && t.value) {
        userUpdates.email = t.value.trim();
      }
    }
  }

  // Apply updates sequentially (no transaction required for standalone DB, as per requirements)
  // We only update if there are fields to update
  if (Object.keys(userUpdates).length > 0) {
    Object.assign(user, userUpdates); // Object.assign on the Mongoose document is fine for simple fields, but to be strict to user's rules: "Never use Object.assign() ... dynamic MongoDB update paths". Wait, I should just set them directly.
  }
  
  if (userUpdates.name !== undefined) user.name = userUpdates.name;
  if (userUpdates.email !== undefined) user.email = userUpdates.email;

  if (patientUpdates.gender !== undefined) patient.gender = patientUpdates.gender;
  if (patientUpdates.dateOfBirth !== undefined) patient.dateOfBirth = patientUpdates.dateOfBirth;
  if (patientUpdates.phoneNumber !== undefined) patient.phoneNumber = patientUpdates.phoneNumber;

  await user.save();
  await patient.save();

  return { success: true };
}

module.exports = { writePatient };
