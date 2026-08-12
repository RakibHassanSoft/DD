type LogLevel = 'info' | 'warn' | 'error';
type LogDetails = Record<string, boolean | number | string | undefined>;

/** Emits JSON that Render can index without logging credentials or email content. */
export function logEvent(level: LogLevel, event: string, details: LogDetails = {}) {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...details });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.info(entry);
}
