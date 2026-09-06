const mongoose = require("mongoose");
const Consultation = require("../../../models/Consultation");
const Patient = require("../../../models/Patient");
const Doctor = require("../../../models/doctor");

async function writeEncounter(fhirEncounter) {
  if (fhirEncounter.resourceType !== "Encounter") {
    return { success: false, error: "Unsupported resourceType" };
  }

  const consultationId = fhirEncounter.id;
  if (!consultationId || !mongoose.Types.ObjectId.isValid(consultationId)) {
    return { success: false, error: "Invalid or missing Encounter ID format" };
  }

  // Pre-validation: verify Consultation exists
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    return { success: false, error: "Consultation not found" };
  }

  // Pre-validation: verify Patient reference if provided
  if (fhirEncounter.subject && fhirEncounter.subject.reference) {
    const refParts = fhirEncounter.subject.reference.split("/");
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
      return { success: false, error: "Mismatched Patient relationship" };
    }
  }

  // Pre-validation: verify Practitioner reference if provided
  if (fhirEncounter.participant && Array.isArray(fhirEncounter.participant)) {
    for (const p of fhirEncounter.participant) {
      if (p.individual && p.individual.reference) {
        const refParts = p.individual.reference.split("/");
        if (refParts.length === 2 && refParts[0] === "Practitioner") {
          const doctorId = refParts[1];
          if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return { success: false, error: "Invalid Practitioner ObjectId in reference" };
          }
          const doctor = await Doctor.findById(doctorId);
          if (!doctor) {
            return { success: false, error: "Referenced Practitioner not found" };
          }
        }
      }
    }
  }

  let statusUpdated = false;
  if (fhirEncounter.status) {
    if (fhirEncounter.status === "finished") {
      consultation.status = "completed";
      statusUpdated = true;
    } else if (fhirEncounter.status === "planned") {
      consultation.status = "pending";
      statusUpdated = true;
    }
  }

  if (statusUpdated) {
    await consultation.save();
  }

  return { success: true };
}

module.exports = { writeEncounter };
