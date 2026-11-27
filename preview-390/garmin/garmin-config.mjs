const KEY = "moja-silownia-garmin-mock-config-v1-rc390";

export function validateConfig(config) {
  const url = new URL(config.endpoint);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".workers.dev") ||
      url.pathname !== "/health" || url.username || url.password ||
      url.search || url.hash || url.port) throw new Error("Nieprawidłowy adres Workera.");
  if (typeof config.token !== "string" || !config.token.trim() || /[\r\n]/.test(config.token))
    throw new Error("Nieprawidłowy token.");
  return {endpoint: url.href, token: config.token.trim()};
}

export function saveConfig(config, storage = globalThis.localStorage) {
  storage.setItem(KEY, JSON.stringify(validateConfig(config)));
}

export function loadConfig(storage = globalThis.localStorage) {
  try { return validateConfig(JSON.parse(storage.getItem(KEY))); }
  catch { return null; }
}

export function clearConfig(storage = globalThis.localStorage) {
  storage.removeItem(KEY);
}
