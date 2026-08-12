const aliases: Record<string, string> = { first_name: 'firstName', last_name: 'lastName', job_title: 'jobTitle' };
export function extractVariables(content: string) { return [...new Set([...content.matchAll(/{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g)].map((match) => match[1]))]; }
export function renderPersonalization(content: string, contact: Record<string, unknown>) {
  const custom = (contact.customFields ?? {}) as Record<string, string>;
  const missing: string[] = [];
  const rendered = content.replace(/{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g, (_match, variable: string) => {
    const key = aliases[variable] ?? variable;
    const value = contact[key] ?? custom[variable] ?? custom[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    missing.push(variable);
    if (variable === 'first_name') return 'there';
    if (variable === 'company') return 'your team';
    return '';
  });
  return { rendered, missingVariables: [...new Set(missing)] };
}
