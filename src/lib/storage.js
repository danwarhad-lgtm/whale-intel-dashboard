/**
 * localStorage wrappers for client-side persistence.
 * Keys are prefixed with `whale-intel.` so they don't collide.
 *
 * SSR-safe: every accessor checks for `window` and returns a default when
 * called on the server.
 */

const KEY = {
  alerts: "whale-intel.alerts",
  watchlist: "whale-intel.watchlist",
  settings: "whale-intel.settings",
  reports: "whale-intel.reports",
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** @template T */
function readJson(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or serialization error — ignore */
  }
}

/* --------------------- Alerts --------------------- */

/**
 * @typedef {Object} Alert
 * @property {string} id
 * @property {string} type
 * @property {string} severity
 * @property {string} title
 * @property {string} message
 * @property {string} [tokenSymbol]
 * @property {string|null} [exchange]
 * @property {number} [valueUsd]
 * @property {string} source
 * @property {string} createdAt
 * @property {boolean} [read]
 */

/** @returns {Alert[]} */
export function getAlerts() {
  return readJson(KEY.alerts, []);
}

/** @param {Alert} alert */
export function addAlert(alert) {
  const list = getAlerts();
  const next = [alert, ...list].slice(0, 200);
  writeJson(KEY.alerts, next);
  return next;
}

/** @param {string} id */
export function deleteAlert(id) {
  const list = getAlerts().filter((a) => a.id !== id);
  writeJson(KEY.alerts, list);
  return list;
}

export function markAlertRead(id) {
  const list = getAlerts().map((a) => (a.id === id ? { ...a, read: true } : a));
  writeJson(KEY.alerts, list);
  return list;
}

export function clearAlerts() {
  writeJson(KEY.alerts, []);
  return [];
}

/* --------------------- Watchlist --------------------- */

/**
 * @typedef {Object} WatchlistItem
 * @property {string} id
 * @property {string} symbol
 * @property {string} name
 * @property {string} [coingeckoId]
 * @property {string} addedAt
 * @property {string} [note]
 */

/** @returns {WatchlistItem[]} */
export function getWatchlist() {
  return readJson(KEY.watchlist, []);
}

/** @param {WatchlistItem} item */
export function addWatchlistItem(item) {
  const list = getWatchlist();
  if (list.some((w) => w.symbol.toLowerCase() === item.symbol.toLowerCase())) {
    return list;
  }
  const next = [item, ...list];
  writeJson(KEY.watchlist, next);
  return next;
}

/** @param {string} id */
export function removeWatchlistItem(id) {
  const list = getWatchlist().filter((w) => w.id !== id);
  writeJson(KEY.watchlist, list);
  return list;
}

/* --------------------- Settings --------------------- */

const DEFAULT_SETTINGS = {
  // Profile
  displayName: "",
  defaultCurrency: "USD",
  language: "en",
  timezone: "auto",
  // Appearance
  theme: "dark",
  density: "comfortable",
  accentColor: "indigo",
  fontScale: 100,
  reduceMotion: false,
  showGrid: true,
  // Data
  dataMode: "live",
  refreshIntervalSec: 60,
  whaleMinUsd: 1_000_000,
  preferredChain: "ethereum",
  preferredGasChain: "eth",
  pageSize: 50,
  // Alerts
  enableAlertsExchange: true,
  enableAlertsWhale: true,
  enableAlertsStablecoin: true,
  notificationSound: false,
  alertThresholdHigh: 90,
  alertThresholdMedium: 70,
  // Display
  showSparklines: true,
  showLogos: true,
  numberFormat: "compact",
  percentDecimals: 2,
  // Privacy
  storeLocally: true,
  shareUsage: false,
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readJson(KEY.settings, {}) };
}

/**
 * @param {string} key
 * @param {*} value
 */
export function setSetting(key, value) {
  const current = getSettings();
  const next = { ...current, [key]: value };
  writeJson(KEY.settings, next);
  return next;
}

export function setSettings(partial) {
  const current = getSettings();
  const next = { ...current, ...partial };
  writeJson(KEY.settings, next);
  return next;
}

/* --------------------- Reports --------------------- */

/**
 * @typedef {Object} Report
 * @property {string} id
 * @property {string} title
 * @property {string} createdAt
 * @property {string} period
 * @property {Object} summary
 * @property {Array<{name:string, value:string|number}>} highlights
 */

/** @returns {Report[]} */
export function getReports() {
  return readJson(KEY.reports, []);
}

/** @param {Report} report */
export function addReport(report) {
  const list = getReports();
  const next = [report, ...list].slice(0, 50);
  writeJson(KEY.reports, next);
  return next;
}

export function deleteReport(id) {
  const list = getReports().filter((r) => r.id !== id);
  writeJson(KEY.reports, list);
  return list;
}

export function clearReports() {
  writeJson(KEY.reports, []);
  return [];
}

export const STORAGE_KEYS = KEY;
