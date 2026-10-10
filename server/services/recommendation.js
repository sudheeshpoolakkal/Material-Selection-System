const { costRank, resistanceRank } = require("./catalog");
const numericRules = {
  minBulkModulus: ["bulkModulus", "min", 0],
  minTensileStrength: ["tensileStrength", "min", 0],
  maxDensity: ["density", "max", 0],
  minThermalConductivity: ["thermalConductivity", "min", 0],
  minServiceTemp: ["maxServiceTemp", "min", -273.15],
  maxTotalMassLoss: ["totalMassLoss", "max", 0],
  maxCVCM: ["collectedVolatileCondensableMaterial", "max", 0],
  volume: ["volume", "min", 0],
  maxWeight: ["maxWeight", "max", 0],
};
const defaultWeights = { strength: 35, lightness: 40, cost: 25, thermal: 0, stiffness: 0, vacuum: 0 };
function validateRequirements(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Requirements must be an object.");
  const r = {};
  for (const key of [
    "keyword",
    "category",
    "application",
    "corrosionResistance",
    "maxCost",
    "process",
    "dataKind",
  ]) {
    if (input[key] !== undefined && typeof input[key] !== "string")
      throw new Error(`${key} must be text.`);
    if (input[key]?.trim()) r[key] = input[key].trim().slice(0, 255);
  }
  for (const [key, [, , floor]] of Object.entries(numericRules)) {
    if (input[key] === undefined || input[key] === "") continue;
    if (
      (typeof input[key] !== "number" && typeof input[key] !== "string") ||
      input[key] === null
    )
      throw new Error(`Enter a valid ${key} value.`);
    const v = Number(input[key]);
    if (
      !Number.isFinite(v) ||
      v < floor ||
      ((key === "volume" || key === "maxWeight") && v === 0)
    )
      throw new Error(`Enter a valid ${key} value.`);
    r[key] = v;
  }
  if (r.maxWeight && !r.volume)
    throw new Error("Component volume is required to evaluate a mass limit.");
  if (r.maxCost && !costRank[r.maxCost])
    throw new Error("Choose a valid relative cost tier.");
  if (r.corrosionResistance && !resistanceRank[r.corrosionResistance])
    throw new Error("Choose a valid corrosion resistance tier.");
  r.weights = { ...defaultWeights };
  if (input.weights !== undefined) {
    if (
      !input.weights ||
      typeof input.weights !== "object" ||
      Array.isArray(input.weights)
    )
      throw new Error("Weights must be an object.");
    for (const key of Object.keys(defaultWeights)) {
      const v = Number(input.weights[key] ?? defaultWeights[key]);
      if (!Number.isFinite(v) || v < 0 || v > 100)
        throw new Error("Weights must be between 0 and 100.");
      r.weights[key] = v;
    }
  }
  if (Object.values(r.weights).reduce((a, b) => a + b, 0) === 0)
    throw new Error("At least one priority must be greater than zero.");
  return r;
}
function recommend(materials, input, context = {}) {
  const r = validateRequirements(input);
  const factors = {
    strength: (m) => m.properties.tensileStrength,
    lightness: (m) => m.properties.density,
    cost: (m) => costRank[m.properties.cost],
    thermal: (m) => m.properties.thermalConductivity,
    stiffness: (m) => m.properties.bulkModulus,
    vacuum: (m) => m.properties.collectedVolatileCondensableMaterial,
  };
  const bounds = {};
  for (const [k, fn] of Object.entries(factors)) {
    const vals = materials.map(fn).filter(Number.isFinite);
    bounds[k] = vals.length ? vals.reduce(([lo, hi], value) => [Math.min(lo, value), Math.max(hi, value)], [Infinity, -Infinity]) : [0, 0];
  }
  if (context.bounds) Object.assign(bounds, context.bounds);
  const excluded = [];
  const candidates = [];
  for (const m of materials) {
    const p = m.properties,
      failed = [],
      reasons = [];
    if (
      r.keyword &&
      !`${m.name} ${m.description} ${m.category} ${m.applications.join(" ")} ${(m.metadata?.searchAliases || []).join(" ")}`
        .toLowerCase()
        .includes(r.keyword.toLowerCase())
    )
      failed.push("Does not match search");
    if (r.dataKind && m.dataKind !== r.dataKind) failed.push("Different evidence type");
    if (r.category && m.category !== r.category)
      failed.push("Different material family");
    if (r.application && !m.applications.includes(r.application))
      failed.push("Application not listed");
    for (const [key, [prop, op]] of Object.entries(numericRules)) {
      if (r[key] === undefined || key === "volume" || key === "maxWeight")
        continue;
      if (!Number.isFinite(p[prop])) failed.push(`${prop}: missing data`);
      else if (op === "min" ? p[prop] < r[key] : p[prop] > r[key])
        failed.push(`${prop}: outside limit`);
      else
        reasons.push({
          label:
            key === "maxTotalMassLoss" ? "Total mass loss limit"
              : key === "maxCVCM" ? "Condensable material limit"
              : key === "minBulkModulus"
              ? "Bulk modulus minimum"
              : key === "minServiceTemp"
              ? "Temperature ceiling"
              : key === "maxDensity"
                ? "Density limit"
                : key === "minThermalConductivity"
                  ? "Conductivity minimum"
                  : "Tensile minimum",
          value: p[prop],
          limit: r[key],
          status: "pass",
        });
    }
    if (r.corrosionResistance) {
      const rank = resistanceRank[p.corrosionResistance];
      if (!rank || rank < resistanceRank[r.corrosionResistance])
        failed.push("Corrosion rating below requirement");
      else
        reasons.push({
          label: "Corrosion resistance",
          value: p.corrosionResistance,
          limit: r.corrosionResistance,
          status: "pass",
        });
    }
    if (r.maxCost) {
      const rank = costRank[p.cost];
      if (!rank || rank > costRank[r.maxCost])
        failed.push("Relative cost exceeds budget tier");
      else
        reasons.push({
          label: "Cost ceiling",
          value: p.cost,
          limit: r.maxCost,
          status: "pass",
        });
    }
    if (r.process) {
      if (!m.processes.includes(r.process))
        failed.push("Manufacturing route has no supporting data");
      else
        reasons.push({
          label: "Manufacturing route",
          value: r.process,
          status: "pass",
        });
    }
    const estimatedMass = r.volume && Number.isFinite(p.density) ? (p.density * r.volume) / 1000 : null;
    if (r.maxWeight) {
      if (estimatedMass === null) failed.push("density: missing data for mass calculation");
      else if (estimatedMass > r.maxWeight)
        failed.push("Estimated mass exceeds limit");
      else
        reasons.push({
          label: "Mass limit",
          value: Number(estimatedMass.toFixed(3)),
          limit: r.maxWeight,
          status: "pass",
        });
    }
    if (!Object.entries(factors).some(([key, fn]) => r.weights[key] > 0 && Number.isFinite(fn(m)))) failed.push("No data for the active ranking priorities");
    if (failed.length) {
      excluded.push({ id: m.id, name: m.name, reasons: failed });
      continue;
    }
    const breakdown = {};
    const weightTotal = Object.values(r.weights).reduce((a, b) => a + b, 0);
    let score = 0;
    for (const [key, fn] of Object.entries(factors)) {
      const [lo, hi] = bounds[key],
        val = fn(m);
      let normalized = Number.isFinite(val)
        ? hi === lo
          ? 1
          : (val - lo) / (hi - lo)
        : 0;
      if ((key === "lightness" || key === "cost" || key === "vacuum") && Number.isFinite(val) && hi !== lo)
        normalized = 1 - normalized;
      const contribution = ((normalized * r.weights[key]) / weightTotal) * 100;
      score += contribution;
      breakdown[key] = {
        value: Number.isFinite(val) ? val : null,
        missing: !Number.isFinite(val),
        normalized: Number((normalized * 100).toFixed(1)),
        weight: r.weights[key],
        normalizedWeight: Number(
          ((r.weights[key] / weightTotal) * 100).toFixed(1),
        ),
        contribution: Number(contribution.toFixed(1)),
      };
    }
    candidates.push({
      ...m,
      score: Number(score.toFixed(1)),
      missingPriorities: Object.keys(factors).filter(key => r.weights[key] > 0 && !Number.isFinite(factors[key](m))),
      breakdown,
      reasons,
      estimatedMass:
        estimatedMass === null ? null : Number(estimatedMass.toFixed(3)),
    });
  }
  candidates.sort((a, b) => b.score - a.score || a.id - b.id);
  return {
    materials: candidates.map((m, i) => ({ ...m, rank: i + 1 })),
    count: candidates.length,
    total: materials.length,
    excluded,
    requirements: r,
    method:
      "Weighted min–max normalization over the reference catalog. Strength, conductivity and Voigt bulk modulus are maximized; density, relative cost and vacuum-test CVCM are minimized. Missing weighted properties contribute zero and candidates with no active property data are excluded. Hard constraints are applied before ranking. The score is a relative preference score, not a probability or certification.",
  };
}
module.exports = { recommend, validateRequirements, defaultWeights, numericRules };
