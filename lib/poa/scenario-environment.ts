export function parseScenarioEnvironment(value: string | null | undefined) {
  const text = value ?? "";
  const prefix = "Operational Environment:\n";
  const separator = "\n\nMeteorological Environment:\n";
  const split = text.indexOf(separator, prefix.length);
  if (text.startsWith(prefix) && split >= 0) {
    return { operationalEnvironment: text.slice(prefix.length, split), meteorologicalEnvironment: text.slice(split + separator.length) };
  }
  return { operationalEnvironment: text, meteorologicalEnvironment: "" };
}

export function formatScenarioEnvironment(operational: string, meteorological: string) {
  if (!operational.trim() && !meteorological.trim()) return null;
  return `Operational Environment:\n${operational.trim()}\n\nMeteorological Environment:\n${meteorological.trim()}`;
}
