// Saved progress lives in localStorage on this device only; every access is guarded
// because storage can be missing or blocked (private windows, embedded previews).
const KEY = 'candy-cascade:v1';

const DEFAULTS = { unlocked: 1, stars: {}, best: {}, sound: true, music: true };

export function loadProgress(snapshot = null) {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    saved = null;
  }
  const progress = { ...DEFAULTS, ...(saved ?? {}) };
  // A hot-reload snapshot may know about progress that storage could not keep.
  if (snapshot && snapshot.unlocked > progress.unlocked) Object.assign(progress, snapshot);
  progress.stars = { ...progress.stars };
  progress.best = { ...progress.best };
  return progress;
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable: progress still lasts for this session.
  }
}

export function totalStars(progress) {
  return Object.values(progress.stars).reduce((sum, n) => sum + n, 0);
}
