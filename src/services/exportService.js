import Papa from "papaparse";

/**
 * Exports data to a CSV file.
 * @param {Array} data - Array of objects to export.
 * @param {String} filename - Name of the file to save.
 */
export const exportToCSV = (data, filename = "research_data.csv") => {
  if (!data || data.length === 0) {
    console.warn("No data available for export");
    return;
  }

  // Convert objects to CSV string
  const csv = Papa.unparse(data);

  // Create a blob and download link
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  window.URL.revokeObjectURL(url);
};

/**
 * Prepares the property dataset for research analysis.
 * Joins property info, compatibility scores, and commute data into a flat structure.
 */
export const prepareResearchDataset = (properties, userPrefs) => {
  return properties.map(property => ({
    PropertyID: property.id,
    PropertyName: property.propertyName,
    Location: property.location,
    Rent: property.price || property.rent,
    CompatibilityScore: property.compatibility?.score || 0,
    CommuteDistance_KM: property.commute?.distance || 0,
    CommuteTime_Transit: property.commute?.modes?.transit || 0,
    CommuteTime_Walk: property.commute?.modes?.walking || 0,
    CommuteRating: property.commute?.rating?.label || 'N/A',
    PropertyType: property.propertyType,
    Furnishing: property.furnishing,
    StudyEnvironment: property.studyEnvironment,
    CleaningExpectation: property.cleaningExpectation,
    ExportDate: new Date().toISOString().split('T')[0]
  }));
};
