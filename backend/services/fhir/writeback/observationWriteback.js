const mongoose = require("mongoose");
const LabReport = require("../../../models/LabReport");
const LabRequest = require("../../../models/LabRequest");
const Patient = require("../../../models/Patient");

async function writeObservation(fhirObservation) {
  if (fhirObservation.resourceType !== "Observation") {
    return { success: false, error: "Unsupported resourceType" };
  }

  if (!fhirObservation.id || !fhirObservation.id.startsWith("obs-")) {
    return { success: false, error: "Invalid Observation ID format. Expected obs-{labReportId}" };
  }

  const labReportId = fhirObservation.id.replace("obs-", "");
  if (!mongoose.Types.ObjectId.isValid(labReportId)) {
    return { success: false, error: "Invalid LabReport ObjectId in Observation ID" };
  }

  const labReport = await LabReport.findById(labReportId).populate("requestId");
  if (!labReport) {
    return { success: false, error: "LabReport not found" };
  }

  // Pre-validation: verify Patient reference if provided
  if (fhirObservation.subject && fhirObservation.subject.reference) {
    const refParts = fhirObservation.subject.reference.split("/");
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
    // Verify it matches the labReport
    if (labReport.patientId.toString() !== patientId) {
      return { success: false, error: "Mismatched Patient relationship for LabReport" };
    }
  }

  // Pre-validation: verify code matches testType
  if (fhirObservation.code && fhirObservation.code.text) {
    const suppliedTestType = fhirObservation.code.text.trim();
    if (!labReport.requestId || labReport.requestId.testType !== suppliedTestType) {
      return { success: false, error: "Mismatched LabRequest testType" };
    }
  }

  // Update allowed fields
  if (fhirObservation.valueString && fhirObservation.valueString.trim() !== "") {
    labReport.resultDetails = fhirObservation.valueString.trim();
  }

  if (fhirObservation.status) {
    if (fhirObservation.status === "final") {
      labReport.status = "completed";
    } else if (fhirObservation.status === "registered") {
      labReport.status = "pending";
    }
  }

  await labReport.save();

  return { success: true };
}

module.exports = { writeObservation };
