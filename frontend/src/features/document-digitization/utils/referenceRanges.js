export const REFERENCE_RANGES = {
  Hemoglobin: { min: 13.5, max: 17.5, unit: "g/dL" },
  WBC: { min: 4500, max: 11000, unit: "cells/mcL" },
  FastingGlucose: { min: 70, max: 99, unit: "mg/dL" },
  Platelets: { min: 150000, max: 450000, unit: "mcL" },
};

export const checkAbnormalValue = (testName, numericValue) => {
  const range = REFERENCE_RANGES[testName];
  if (!range) return { status: "NORMAL", isAbnormal: false };

  if (numericValue < range.min) return { status: "LOW", isAbnormal: true, range };
  if (numericValue > range.max) return { status: "HIGH", isAbnormal: true, range };
  return { status: "NORMAL", isAbnormal: false, range };
};