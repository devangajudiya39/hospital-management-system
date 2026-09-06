function mapEncounter(consultationDoc) {
  if (!consultationDoc) return null;

  const id = consultationDoc._id ? consultationDoc._id.toString() : null;
  if (!id) return null;

  const fhirEncounter = {
    resourceType: "Encounter",
    id: id,
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory"
    }
  };

  // Status mapping
  if (consultationDoc.status === "completed") {
    fhirEncounter.status = "finished";
  } else if (consultationDoc.status === "pending") {
    fhirEncounter.status = "planned";
  } else {
    // safe fallback for valid FHIR Encounter status
    fhirEncounter.status = "unknown";
  }

  // Subject (Patient)
  const patientId = consultationDoc.patientId ? (typeof consultationDoc.patientId === 'object' && consultationDoc.patientId._id ? consultationDoc.patientId._id.toString() : consultationDoc.patientId.toString()) : null;
  if (patientId) {
    fhirEncounter.subject = {
      reference: `Patient/${patientId}`
    };
  }

  // Participant (Practitioner)
  const doctorId = consultationDoc.doctorId ? (typeof consultationDoc.doctorId === 'object' && consultationDoc.doctorId._id ? consultationDoc.doctorId._id.toString() : consultationDoc.doctorId.toString()) : null;
  if (doctorId) {
    fhirEncounter.participant = [{
      individual: {
        reference: `Practitioner/${doctorId}`
      }
    }];
  }

  // Period (from populated appointment)
  if (consultationDoc.appointmentId && consultationDoc.appointmentId.date) {
    try {
      const d = new Date(consultationDoc.appointmentId.date);
      if (!isNaN(d.getTime())) {
        fhirEncounter.period = {
          start: d.toISOString()
        };
      }
    } catch (e) {}
  }

  return fhirEncounter;
}

module.exports = { mapEncounter };
