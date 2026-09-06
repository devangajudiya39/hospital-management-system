function mapMedicationStatements(prescriptionDoc) {
  if (!prescriptionDoc || !prescriptionDoc.medicines || !Array.isArray(prescriptionDoc.medicines) || prescriptionDoc.medicines.length === 0) {
    return [];
  }

  const prescriptionId = prescriptionDoc._id ? prescriptionDoc._id.toString() : null;
  if (!prescriptionId) return [];

  const patientId = prescriptionDoc.patientId ? (typeof prescriptionDoc.patientId === 'object' && prescriptionDoc.patientId._id ? prescriptionDoc.patientId._id.toString() : prescriptionDoc.patientId.toString()) : null;
  if (!patientId) return [];

  const statements = [];

  prescriptionDoc.medicines.forEach((med, index) => {
    // Requires populated Medicine
    const medicineName = med.medicineId && med.medicineId.name ? med.medicineId.name : null;
    if (!medicineName) return; // Skip if no medicine name available

    const statement = {
      resourceType: "MedicationStatement",
      id: `medstmt-${prescriptionId}-${index}`,
      status: "active",
      subject: {
        reference: `Patient/${patientId}`
      },
      medicationCodeableConcept: {
        text: medicineName
      }
    };

    if (med.dosage || med.duration) {
      let dosageText = med.dosage || "";
      if (med.duration) {
        dosageText += dosageText ? ` for ${med.duration}` : med.duration;
      }
      statement.dosage = [{
        text: dosageText.trim()
      }];
    }

    statements.push(statement);
  });

  return statements;
}

module.exports = { mapMedicationStatements };
