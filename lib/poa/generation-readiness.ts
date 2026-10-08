export function hasCompleteTaskCoverage(requiredCodes: readonly string[], coveredCodes: ReadonlySet<string>) {
  return requiredCodes.length > 0 && requiredCodes.every((code) => coveredCodes.has(code));
}
