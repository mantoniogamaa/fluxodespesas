import { createLocalStorageAdapter } from './local-storage-adapter.js';

function assertAdapter(candidate) {
  const required = ['loadState', 'saveState', 'loadDraft', 'saveDraft', 'clearDraft', 'clearAll'];
  const missing = required.filter((name) => typeof candidate?.[name] !== 'function');
  if (missing.length) {
    throw new Error(`Adapter inválido. Métodos ausentes: ${missing.join(', ')}`);
  }
}

let activeAdapter = createLocalStorageAdapter();

export const FluxoRepository = {
  use(nextAdapter) {
    assertAdapter(nextAdapter);
    activeAdapter = nextAdapter;
    return activeAdapter;
  },
  reset() {
    activeAdapter = createLocalStorageAdapter();
    return activeAdapter;
  },
  getAdapter() {
    return activeAdapter;
  },
  inspect() {
    return activeAdapter?.inspect?.() || { kind: activeAdapter?.kind || 'unknown' };
  },
  loadState() {
    return activeAdapter.loadState();
  },
  saveState(payload) {
    return activeAdapter.saveState(payload);
  },
  loadDraft() {
    return activeAdapter.loadDraft();
  },
  saveDraft(items) {
    return activeAdapter.saveDraft(items);
  },
  clearDraft() {
    return activeAdapter.clearDraft();
  },
  clearAll() {
    return activeAdapter.clearAll();
  },
};

export default FluxoRepository;
