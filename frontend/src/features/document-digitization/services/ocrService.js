import { checkAbnormalValue } from '../utils/referenceRanges';

export const processDocumentOCR = async (file) => {
  // Pure local simulation - zero backend required right now
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockEntities = [
        { id: '1', name: 'Hemoglobin', category: 'Lab Value', value: 10.8, unit: 'g/dL' },
        { id: '2', name: 'FastingGlucose', category: 'Lab Value', value: 142, unit: 'mg/dL' },
        { id: '3', name: 'Amoxicillin', category: 'Medication', dosage: '500mg', frequency: 'Twice daily' },
        { id: '4', name: 'Anemia', category: 'Diagnosis', severity: 'Mild' }
      ];

      const evaluated = mockEntities.map((item) => {
        if (item.category === 'Lab Value') {
          const check = checkAbnormalValue(item.name, item.value);
          return { ...item, status: check.status, isAbnormal: check.isAbnormal };
        }
        return { ...item, status: 'NORMAL', isAbnormal: false };
      });

      resolve({
        id: `doc-${Date.now()}`,
        fileName: file.name,
        date: new Date().toISOString().split('T')[0],
        rawText: `PATIENT REPORT:\nHemoglobin: 10.8 g/dL\nFasting Glucose: 142 mg/dL\nRx: Amoxicillin 500mg BD\nImpression: Mild Anemia`,
        entities: evaluated
      });
    }, 1200);
  });
};