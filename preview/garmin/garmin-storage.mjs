import { validateMock, validateLive } from "./garmin-sync.mjs";

const KEY = "moja-silownia-garmin-mock-v1" + (globalThis.location?.pathname.includes("/preview/") ? "-preview" : "-app");

export function saveSnapshot(snapshot, storage = globalThis.localStorage) {
  const clean = validateMock({...snapshot, status: "ok", authenticated: true});
  if (!Number.isFinite(Date.parse(snapshot.syncedAt))) throw new Error("Nieprawidłowa data synchronizacji.");
  storage.setItem(KEY, JSON.stringify({...clean, syncedAt: snapshot.syncedAt}));
}

export function loadSnapshot(storage = globalThis.localStorage) {
  try {
    const snapshot = JSON.parse(storage.getItem(KEY));
    if (!snapshot || !Number.isFinite(Date.parse(snapshot.syncedAt))) return null;
    return {...validateMock({...snapshot, status: "ok", authenticated: true}), syncedAt: snapshot.syncedAt};
  } catch {
    return null;
  }
}

export function clearSnapshot(storage = globalThis.localStorage) {
  storage.removeItem(KEY);
}


const LIVE_KEY = KEY.replace("-mock-", "-live-");
export function loadLiveSnapshot(storage = globalThis.localStorage) {
  try {
    const snapshot = JSON.parse(storage.getItem(LIVE_KEY));
    return validateLive({...snapshot, authenticated:true});
  } catch { return null; }
}
export function saveLiveSnapshot(snapshot, storage = globalThis.localStorage) {
  const clean = validateLive({...snapshot, authenticated:true});
  const previous = loadLiveSnapshot(storage);
  if (previous && Date.parse(previous.syncedAt) > Date.parse(clean.syncedAt)) return previous;
  const data = {...clean.data};
  for (const key of Object.keys(data)) {
    const old = previous?.data[key];
    const next = data[key];
    if (old && (!next || old.date > next.date)) data[key] = old;
    else if (old && next && old.date === next.date) {
      data[key] = {...next};
      for (const field of Object.keys(next)) {
        if (next[field] === null && old[field] != null) data[key][field] = old[field];
      }
    }
  }
  const merged = {...clean,data};
  storage.setItem(LIVE_KEY,JSON.stringify(merged));
  return merged;
}
export function clearLiveSnapshot(storage = globalThis.localStorage) {
  storage.removeItem(LIVE_KEY);
}
