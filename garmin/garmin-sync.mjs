const ENDPOINT = "https://garmin-sync-test.durart.workers.dev/health";

/** Validate mock data without allowing it into production training records. */
export function validateMock(payload) {
  if (payload?.status !== "ok" || payload.mode !== "mock" ||
      payload.authenticated !== true) throw new Error("Nieprawidłowa odpowiedź testowa.");
  const limits = {steps: [0, 200000], weightKg: [1, 500], sleepSeconds: [0, 86400], hrvMs: [0, 1000], bodyBattery: [0, 100]};
  const data = {};
  for (const [key, [min, max]] of Object.entries(limits)) {
    const value = payload.data?.[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
      throw new Error("Nieprawidłowe dane testowe.");
    data[key] = value;
  }
  return {mode: "mock", data};
}

/** Token is supplied for each request and never persisted by this module. */
export async function syncMock(token, fetcher = globalThis.fetch, endpoint = ENDPOINT) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".workers.dev") || url.username || url.password || url.search || url.hash || url.pathname !== "/health" || url.port) throw new Error("Nieprawidłowy adres Workera.");
  if (typeof token !== "string" || !token.trim()) throw new Error("Wprowadź token synchronizacji.");
  const response = await fetcher(url.href, {
    method: "GET", headers: {Authorization: "Bearer " + token.trim()},
    cache: "no-store", credentials: "omit", redirect: "error",
    signal: AbortSignal.timeout(20000)
  });
  if (response.status === 401 || response.status === 403) throw new Error("Brak dostępu. Sprawdź token.");
  if (!response.ok) throw new Error("Synchronizacja nie powiodła się.");
  return {...validateMock(await response.json()), syncedAt: new Date().toISOString()};
}
