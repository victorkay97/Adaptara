import { BPS_DENOMINATOR } from "./constants";
import { CONSTITUTION_FIELDS, type ConstitutionValidation, type ConstitutionValidationError, type FinancialConstitution } from "./types";

export function validateConstitution(input: unknown): ConstitutionValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { valid: false, errors: [{ field: "constitution", message: "Constitution must be an object." }] };
  const record = input as Record<string, unknown>;
  const errors: ConstitutionValidationError[] = [];
  for (const key of Object.keys(record)) if (!(CONSTITUTION_FIELDS as readonly string[]).includes(key)) errors.push({ field: "constitution", message: `Unknown field: ${key}.` });
  for (const field of CONSTITUTION_FIELDS) {
    const value = record[field];
    if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > BPS_DENOMINATOR) errors.push({ field, message: `${field} must be an integer from 0 to 10,000 BPS.` });
  }
  return errors.length ? { valid: false, errors } : { valid: true, value: Object.fromEntries(CONSTITUTION_FIELDS.map((field) => [field, record[field]])) as unknown as FinancialConstitution };
}
