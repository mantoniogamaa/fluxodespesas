const DEFAULT_STATE_KEY = 'fluxo_app_state_v3';
const DEFAULT_DRAFT_KEY = 'fluxo_prestacao_rascunho_v3';

function createMemoryStorageArea() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
  };
}

function resolveStorageArea(storageArea) {
  if (storageArea && typeof storageArea.getItem === 'function') return storageArea;
  if (typeof globalThis !== 'undefined' && globalThis.localStorage && typeof globalThis.localStorage.getItem === 'function') {
    return globalThis.localStorage;
  }
  return createMemoryStorageArea();
}

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn('FluxoRepository parse error', error);
    return fallback;
  }
}

export function createLocalStorageAdapter(options = {}) {
  const storageKey = options.storageKey || DEFAULT_STATE_KEY;
  const draftKey = options.draftKey || DEFAULT_DRAFT_KEY;
  const area = resolveStorageArea(options.storageArea);

  return {
    kind: 'local-storage',
    storageKey,
    draftKey,
    loadState() {
      return safeParse(area.getItem(storageKey), null);
    },
    saveState(payload) {
      area.setItem(storageKey, JSON.stringify(payload));
      return payload;
    },
    loadDraft() {
      return safeParse(area.getItem(draftKey), []);
    },
    saveDraft(items) {
      const draft = Array.isArray(items) ? items : [];
      area.setItem(draftKey, JSON.stringify(draft));
      return draft;
    },
    clearDraft() {
      area.removeItem(draftKey);
    },
    clearAll() {
      area.removeItem(storageKey);
      area.removeItem(draftKey);
    },
    inspect() {
      return { kind: 'local-storage', storageKey, draftKey };
    },
  };
}

export default createLocalStorageAdapter;
