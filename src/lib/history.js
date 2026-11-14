const keyFor = (tool) => `imageprompt-history:${tool}`;

export function getHistory(tool) {
  try { return JSON.parse(localStorage.getItem(keyFor(tool)) || '[]'); } catch { return []; }
}

export function saveHistory(tool, item) {
  const entries = getHistory(tool);
  entries.unshift({ ...item, createdAt: new Date().toISOString() });
  localStorage.setItem(keyFor(tool), JSON.stringify(entries.slice(0, 20)));
}
