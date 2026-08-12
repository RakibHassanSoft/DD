const apiUrl = (process.env.API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
const requestCount = Number(process.env.REQUESTS ?? 25);
const concurrency = Number(process.env.CONCURRENCY ?? 5);

if (!Number.isInteger(requestCount) || requestCount < 1 || !Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error('REQUESTS and CONCURRENCY must be positive integers.');
}

const startedAt = performance.now();
const results = await Promise.all(Array.from({ length: requestCount }, async (_, index) => {
  await new Promise((resolve) => setTimeout(resolve, Math.floor(index / concurrency) * 10));
  const requestStartedAt = performance.now();
  try {
    const response = await fetch(`${apiUrl}/health/live`, { signal: AbortSignal.timeout(10_000) });
    return { ok: response.ok, status: response.status, durationMs: performance.now() - requestStartedAt };
  } catch (error) {
    return { ok: false, status: 0, durationMs: performance.now() - requestStartedAt, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}));

const failures = results.filter((result) => !result.ok);
const durations = results.map((result) => result.durationMs).sort((left, right) => left - right);
const percentile = (p) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * p) - 1)];
console.log(JSON.stringify({ apiUrl, requests: requestCount, concurrency, passed: results.length - failures.length, failed: failures.length, p50Ms: Math.round(percentile(0.5)), p95Ms: Math.round(percentile(0.95)), totalMs: Math.round(performance.now() - startedAt) }, null, 2));
if (failures.length) process.exitCode = 1;
