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


function metric(value, min, max) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
    throw new Error("Nieprawidłowa wartość Garmin.");
  return value;
}
function dated(value, normalize) {
  if (value === null) return null;
  const date = value?.date;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)
    throw new Error("Nieprawidłowa data Garmin.");
  return {date, ...normalize(value)};
}
export function validateLive(payload) {
  if (!["ok","partial"].includes(payload?.status) || payload.mode !== "live" ||
      payload.authenticated !== true || !Number.isFinite(Date.parse(payload.syncedAt)))
    throw new Error("Nieprawidłowa odpowiedź Garmin.");
  const d = payload.data;
  return {mode:"live", status:payload.status, syncedAt:payload.syncedAt, data:{
    weight:dated(d?.weight,v=>({weightKg:metric(v.weightKg,20,350)})),
    sleep:dated(d?.sleep,v=>({sleepSeconds:metric(v.sleepSeconds,0,86400),sleepScore:metric(v.sleepScore,0,100)})),
    hrv:dated(d?.hrv,v=>({lastNightAvgMs:metric(v.lastNightAvgMs,1,1000),weeklyAvgMs:metric(v.weeklyAvgMs,1,1000),status:typeof v.status==="string"?v.status.slice(0,40):null})),
    bodyBattery:dated(d?.bodyBattery,v=>({value:metric(v.value,0,100)}))
  }};
}
export async function syncLive(token, fetcher = globalThis.fetch, endpoint = ENDPOINT) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".workers.dev") ||
      url.username || url.password || url.search || url.hash || url.port ||
      !["/health","/garmin/gym"].includes(url.pathname))
    throw new Error("Nieprawidłowy adres Workera.");
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token.trim()))
    throw new Error("Nieprawidłowy token synchronizacji.");
  url.pathname = "/garmin/gym";
  const response = await fetcher(url.href,{method:"GET",headers:{Authorization:"Bearer "+token.trim()},
    cache:"no-store",credentials:"omit",redirect:"error",signal:AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error("Synchronizacja nie powiodła się.");
  return validateLive(await response.json());
}
