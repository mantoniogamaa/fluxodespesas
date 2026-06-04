function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createMemoryAdapter(seed = {}) {
  let snapshot = clone(seed.state ?? null);
  let draft = clone(seed.draft ?? []);

  return {
    kind: 'memory',
    storageKey: 'memory:state',
    draftKey: 'memory:draft',
    loadState() {
      return clone(snapshot);
    },
    saveState(payload) {
      snapshot = clone(payload);
      return clone(snapshot);
    },
    loadDraft() {
      return clone(draft) || [];
    },
    saveDraft(items) {
      draft = clone(Array.isArray(items) ? items : []);
      return clone(draft);
    },
    clearDraft() {
      draft = [];
    },
    clearAll() {
      snapshot = null;
      draft = [];
    },
    inspect() {
      return { kind: 'memory' };
    },
  };
}

export default createMemoryAdapter;
