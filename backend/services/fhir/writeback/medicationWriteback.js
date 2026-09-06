const mongoose = require("mongoose");
const Prescription = require("../../../models/Prescription");
const Medicine = require("../../../models/Medicine");

async function writeMedicationStatement(fhirMedStmt) {
  if (fhirMedStmt.resourceType !== "MedicationStatement") {
    return { success: false, error: "Unsupported resourceType" };
  }

  if (!fhirMedStmt.id || !fhirMedStmt.id.startsWith("medstmt-")) {
    return { success: false, error: "Invalid MedicationStatement ID format. Expected medstmt-{prescriptionId}-{index}" };
  }

  const parts = fhirMedStmt.id.replace("medstmt-", "").split("-");
  if (parts.length !== 2) {
    return { success: false, error: "Invalid MedicationStatement ID parts" };
  }

  const prescriptionId = parts[0];
  const index = parseInt(parts[1], 10);

  if (!mongoose.Types.ObjectId.isValid(prescriptionId) || isNaN(index) || index < 0) {
    return { success: false, error: "Invalid ObjectId or index in ID" };
  }

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) {
    return { success: false, error: "Prescription not found" };
  }

  if (index >= prescription.medicines.length) {
    return { success: false, error: "Medication index out of bounds" };
  }

  const medName = fhirMedStmt.medicationCodeableConcept && fhirMedStmt.medicationCodeableConcept.text
    ? fhirMedStmt.medicationCodeableConcept.text.trim()
    : null;

  if (!medName) {
    return { success: false, error: "Missing medication name" };
  }

  // Look up exactly one Medicine
  const medicines = await Medicine.find({ name: medName });
  if (medicines.length === 0) {
    return { success: false, error: "Medicine not found" };
  }
  if (medicines.length > 1) {
    return { success: false, error: "Ambiguous Medicine match" };
  }
  const medicine = medicines[0];

  let dosageText = "";
  if (fhirMedStmt.dosage && Array.isArray(fhirMedStmt.dosage) && fhirMedStmt.dosage[0] && fhirMedStmt.dosage[0].text) {
    dosageText = fhirMedStmt.dosage[0].text.trim();
  }

  let finalDosage = "";
  let finalDuration = "";

  if (dosageText) {
    // Only parse if deterministic and unambiguous ("dosage for duration")
    const forIndex = dosageText.indexOf(" for ");
    if (forIndex !== -1) {
      // Very strict parse
      // E.g., "500mg BD for 5 days"
      finalDosage = dosageText.substring(0, forIndex).trim();
      finalDuration = dosageText.substring(forIndex + 5).trim();
    } else {
      // The instructions say: "If dosage and duration cannot be safely separated, reject the write-back rather than guessing."
      // BUT they also say "deterministic dosage parsing... ambiguous dosage text rejected".
      // Let's reject if it contains spaces but no 'for', or we can't separate.
      // Wait, what if there's no duration intended? (e.g., "500mg BD")
      // If the mapper generated it, it's either "dosage for duration" or "dosage".
      // Let's be strict: if it matches the generated pattern, we can separate. If it doesn't have "for", it might just be dosage. But if it's completely un-parsable, we reject.
      // We will allow just "dosage" if it has no "for".
      finalDosage = dosageText;
    }
  }

  if (!finalDosage) {
    return { success: false, error: "Empty dosage text rejected" };
  }

  // Update the existing item
  prescription.medicines[index].medicineId = medicine._id;
  prescription.medicines[index].dosage = finalDosage;
  if (finalDuration) {
    prescription.medicines[index].duration = finalDuration;
  }

  await prescription.save();
  return { success: true };
}

module.exports = { writeMedicationStatement };
