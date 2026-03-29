import { createLocalStorageAdapter } from './local-storage-adapter.js';

function assertAdapter(candidate) {
  const required = ['loadState', 'saveState', 'loadDraft', 'saveDraft', 'clearDraft', 'clearAll'];
  const missing = required.filter((name) => typeof candidate?.[name] !== 'function');
  if (missing.length) {
    throw new Error(`Adapter inválido. Métodos ausentes: ${missing.join(', ')}`);
  }
}

let activeAdapter = createLocalStorageAdapter();
let cloudAdapter = null;

async function fireAndForget(task, label) {
  try {
    await task;
  } catch (error) {
    console.error(`FluxoRepository ${label} error`, error);
  }
}

export const FluxoRepository = {
  use(nextAdapter) {
    assertAdapter(nextAdapter);
    activeAdapter = nextAdapter;
    return activeAdapter;
  },
  attachCloud(nextAdapter) {
    if (!nextAdapter) {
      cloudAdapter = null;
      return null;
    }
    assertAdapter(nextAdapter);
    cloudAdapter = nextAdapter;
    return cloudAdapter;
  },
  detachCloud() {
    cloudAdapter = null;
  },
  reset() {
    activeAdapter = createLocalStorageAdapter();
    cloudAdapter = null;
    return activeAdapter;
  },
  getAdapter() {
    return activeAdapter;
  },
  inspect() {
    return {
      local: activeAdapter?.inspect?.() || { kind: activeAdapter?.kind || 'unknown' },
      cloud: cloudAdapter?.inspect?.() || null,
    };
  },
  loadState() {
    return activeAdapter.loadState();
  },
  saveState(payload) {
    activeAdapter.saveState(payload);
    if (cloudAdapter?.saveState) void fireAndForget(cloudAdapter.saveState(payload), 'saveState');
    return payload;
  },
  loadDraft() {
    return activeAdapter.loadDraft();
  },
  saveDraft(items) {
    const draft = activeAdapter.saveDraft(items);
    if (cloudAdapter?.saveDraft) void fireAndForget(cloudAdapter.saveDraft(draft), 'saveDraft');
    return draft;
  },
  clearDraft() {
    activeAdapter.clearDraft();
    if (cloudAdapter?.clearDraft) void fireAndForget(cloudAdapter.clearDraft(), 'clearDraft');
  },
  clearAll() {
    activeAdapter.clearAll();
    if (cloudAdapter?.clearAll) void fireAndForget(cloudAdapter.clearAll(), 'clearAll');
  },
  async hydrateRemote() {
    if (!cloudAdapter?.loadState) return null;
    return await cloudAdapter.loadState();
  },
  async hydrateRemoteDraft() {
    if (!cloudAdapter?.loadDraft) return [];
    return await cloudAdapter.loadDraft();
  },
};

export default FluxoRepository;
