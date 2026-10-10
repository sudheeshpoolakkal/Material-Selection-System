export const materialProperties = [
  { key: "density", label: "Density", unit: "g/cm³" },
  { key: "bulkModulus", label: "Bulk modulus (Voigt)", unit: "GPa" },
  { key: "shearModulus", label: "Shear modulus (Voigt)", unit: "GPa" },
  { key: "yieldStrength", label: "Yield strength", unit: "MPa" },
  { key: "youngModulus", label: "Young’s modulus", unit: "GPa" },
  { key: "testTemperature", label: "Test temperature", unit: "°C" },
  { key: "hardnessVickers", label: "Vickers hardness", unit: "HV" },
  { key: "tensileStrength", label: "Tensile strength", unit: "MPa" },
  { key: "specificStrength", label: "Specific strength", unit: "kN·m/kg", derived: true },
  { key: "thermalConductivity", label: "Thermal conductivity", unit: "W/m·K" },
  { key: "maxServiceTemp", label: "Service temperature ceiling", unit: "°C" },
  { key: "corrosionResistance", label: "Corrosion resistance", unit: "" },
  { key: "cost", label: "Relative cost", unit: "" },
  { key: "thermalExpansion", label: "Thermal expansion", unit: "µm/m·K" },
  { key: "specificHeat", label: "Specific heat capacity", unit: "J/kg·K" },
  { key: "electricalResistivity", label: "Electrical resistivity", unit: "µΩ·m" },
  { key: "magnetizable", label: "Magnetizable", unit: "" },
  { key: "elongation", label: "Elongation (A5)", unit: "%" },
  { key: "elongationA80", label: "Elongation (A80)", unit: "%" },
  { key: "elongationUnspecified", label: "Elongation (gauge unspecified)", unit: "%" },
  { key: "elasticModulus", label: "Elastic modulus (method unspecified)", unit: "GPa" },
  { key: "hardnessBrinell", label: "Brinell hardness", unit: "HB" },
  { key: "hardnessRockwellC", label: "Rockwell C hardness", unit: "HRC" },
  { key: "hardnessRockwellB", label: "Rockwell B hardness", unit: "HRB" },
  { key: "hardnessRockwellR", label: "Rockwell R hardness", unit: "HRR" },
  { key: "hardnessRockwellM", label: "Rockwell M hardness", unit: "HRM" },
  { key: "hardnessShoreA", label: "Shore A hardness", unit: "Shore A" },
  { key: "hardnessShore00", label: "Shore 00 hardness", unit: "Shore 00" },
  { key: "meltingPoint", label: "Melting point", unit: "°C" },
  { key: "electricalConductivityIACS", label: "Electrical conductivity", unit: "% IACS" },
  { key: "totalMassLoss", label: "Total mass loss (TML)", unit: "%" },
  { key: "collectedVolatileCondensableMaterial", label: "Condensable material (CVCM)", unit: "%" },
  { key: "waterVaporRegained", label: "Water vapor regained (WVR)", unit: "%" },
  { key: "thermalConductivityInPlane", label: "Thermal conductivity (in-plane)", unit: "W/m·K" },
  { key: "thermalConductivityThroughThickness", label: "Thermal conductivity (through thickness)", unit: "W/m·K" },
  { key: "bandGap", label: "Band gap", unit: "eV" },
  { key: "formationEnergy", label: "Formation energy per atom", unit: "eV/atom" },
  { key: "bulkModulusVRH", label: "Bulk modulus (Voigt–Reuss–Hill)", unit: "GPa" },
  { key: "shearModulusVRH", label: "Shear modulus (Voigt–Reuss–Hill)", unit: "GPa" },
  { key: "poissonRatio", label: "Poisson ratio", unit: "" },
  { key: "thermalExpansionCoefficient", label: "Thermal expansion coefficient", unit: "µm/m·K" },
  { key: "emissivity", label: "Emissivity", unit: "" },
  { key: "solarAbsorptivity", label: "Solar absorptivity", unit: "" },
  { key: "reusableTemperatureLimit", label: "Reusable temperature limit (TPSX)", unit: "°C" },
  { key: "singleUseTemperatureLimit", label: "Single-use temperature limit (TPSX)", unit: "°C" },
];

export function reportedProperties(material) {
  return materialProperties.filter(({ key }) => material.properties[key] != null);
}

export function propertyValue(material, key) {
  const value = material.properties[key];
  if (value == null) return null;
  const bounds = material.metadata?.propertyBounds?.[key];
  if (bounds?.max != null) return `${bounds.min.toLocaleString()}–${bounds.max.toLocaleString()}`;
  if (bounds?.min != null) return `≥ ${bounds.min.toLocaleString()}`;
  return value.toLocaleString();
}

export function evidenceLabel(kind) {
  return kind === "computed" ? "Computed properties" : kind === "literature-extracted" ? "Supplier / reference data" : "Experimental source record";
}
