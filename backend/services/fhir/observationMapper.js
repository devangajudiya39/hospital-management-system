function mapObservation(labReportDoc) {
  if (!labReportDoc) return null;

  const labReportId = labReportDoc._id ? labReportDoc._id.toString() : null;
  if (!labReportId) return null;

  const patientId = labReportDoc.patientId ? (typeof labReportDoc.patientId === 'object' && labReportDoc.patientId._id ? labReportDoc.patientId._id.toString() : labReportDoc.patientId.toString()) : null;
  if (!patientId) return null;

  // Requires populated requestId (LabRequest)
  const testType = labReportDoc.requestId && labReportDoc.requestId.testType ? labReportDoc.requestId.testType : null;
  if (!testType) return null; // If testType is missing, we can't create a valid Observation

  const observation = {
    resourceType: "Observation",
    id: `obs-${labReportId}`,
    status: labReportDoc.status === "completed" ? "final" : "registered",
    category: [{
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/observation-category",
        code: "laboratory",
        display: "Laboratory"
      }]
    }],
    code: {
      text: testType.trim()
    },
    subject: {
      reference: `Patient/${patientId}`
    }
  };

  if (labReportDoc.resultDetails && labReportDoc.resultDetails.trim() !== "") {
    observation.valueString = labReportDoc.resultDetails.trim();
  } else {
    // If there is no value string but the observation exists, it's valid, but we handle it safely
    // Usually observation must have a value or dataAbsentReason, but valueString is optional in R4
  }

  return observation;
}

module.exports = { mapObservation };
