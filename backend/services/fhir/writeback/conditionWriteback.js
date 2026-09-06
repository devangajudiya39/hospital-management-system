const mongoose = require("mongoose");
const Consultation = require("../../../models/Consultation");
const Patient = require("../../../models/Patient");

async function writeCondition(fhirCondition) {
  if (fhirCondition.resourceType !== "Condition") {
    return { success: false, error: "Unsupported resourceType" };
  }

  if (!fhirCondition.id || !fhirCondition.id.startsWith("cond-")) {
    return { success: false, error: "Invalid Condition ID format. Expected cond-{consultationId}" };
  }

  const consultationId = fhirCondition.id.replace("cond-", "");
  if (!mongoose.Types.ObjectId.isValid(consultationId)) {
    return { success: false, error: "Invalid Consultation ObjectId in Condition ID" };
  }

  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    return { success: false, error: "Consultation not found" };
  }

  // Pre-validation: verify Patient reference if provided
  if (fhirCondition.subject && fhirCondition.subject.reference) {
    const refParts = fhirCondition.subject.reference.split("/");
    if (refParts.length !== 2 || refParts[0] !== "Patient") {
      return { success: false, error: "Invalid Patient reference format" };
    }
    const patientId = refParts[1];
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return { success: false, error: "Invalid Patient ObjectId in reference" };
    }
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return { success: false, error: "Referenced Patient not found" };
    }
    // Verify it matches the consultation
    if (consultation.patientId.toString() !== patientId) {
      return { success: false, error: "Mismatched Patient relationship for Consultation" };
    }
  }

  const diagnosisText = fhirCondition.code && fhirCondition.code.text ? fhirCondition.code.text.trim() : "";
  if (!diagnosisText) {
    return { success: false, error: "Empty diagnosis rejected" };
  }

  // Update explicitly permitted field
  consultation.diagnosis = diagnosisText;
  await consultation.save();

  return { success: true };
}

module.exports = { writeCondition };
