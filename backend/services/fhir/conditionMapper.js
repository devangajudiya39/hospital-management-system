function mapCondition(consultationDoc) {
  if (!consultationDoc || !consultationDoc.diagnosis || consultationDoc.diagnosis.trim() === "") {
    return null; // Do not create an empty Condition
  }

  const consultationId = consultationDoc._id ? consultationDoc._id.toString() : null;
  if (!consultationId) return null;

  const patientId = consultationDoc.patientId ? (typeof consultationDoc.patientId === 'object' && consultationDoc.patientId._id ? consultationDoc.patientId._id.toString() : consultationDoc.patientId.toString()) : null;
  if (!patientId) return null;

  return {
    resourceType: "Condition",
    id: `cond-${consultationId}`,
    clinicalStatus: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
        code: "active"
      }]
    },
    code: {
      text: consultationDoc.diagnosis.trim()
    },
    subject: {
      reference: `Patient/${patientId}`
    },
    encounter: {
      reference: `Encounter/${consultationId}`
    }
  };
}

module.exports = { mapCondition };
