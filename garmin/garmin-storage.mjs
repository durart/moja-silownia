import { validateMock } from "./garmin-sync.mjs";

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
