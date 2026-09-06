function mapPatient(patientDoc) {
  if (!patientDoc) return null;
  
  const id = patientDoc._id ? patientDoc._id.toString() : null;
  if (!id) return null;

  const fhirPatient = {
    resourceType: "Patient",
    id: id
  };

  // Handle populated user
  if (patientDoc.userId && patientDoc.userId.name) {
    fhirPatient.name = [{
      text: patientDoc.userId.name
    }];
  }

  if (patientDoc.gender) {
    fhirPatient.gender = patientDoc.gender; // "male", "female", "other" map cleanly
  }

  if (patientDoc.dateOfBirth) {
    try {
      const d = new Date(patientDoc.dateOfBirth);
      if (!isNaN(d.getTime())) {
        fhirPatient.birthDate = d.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    } catch(e) {}
  }

  const telecom = [];
  if (patientDoc.phoneNumber) {
    telecom.push({
      system: "phone",
      value: patientDoc.phoneNumber
    });
  }
  
  if (patientDoc.userId && patientDoc.userId.email) {
    telecom.push({
      system: "email",
      value: patientDoc.userId.email
    });
  }

  if (telecom.length > 0) {
    fhirPatient.telecom = telecom;
  }

  return fhirPatient;
}

module.exports = { mapPatient };
