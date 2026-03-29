import FluxoRepository from './repository.js';

export const FluxoState = (() => {
  const clone = (value) => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  const state = {
    auth: { currentRole: 'gestor', currentUser: null },
    data: {
      politica: {},
      colaboradores: [],
      verbas: [],
      despesas: [],
      prestacoes: [],
      logAcoes: [],
    },
    ui: {
      itensPrest: [],
      catSelecionada: null,
      fotoPrestUrl: null,
      verbaSelecionadaId: null,
      rascunhoOffline: [],
    },
    meta: {
      schemaVersion: 2,
      hydratedAt: null,
    },
  };

  const listeners = new Set();

  function notify() {
    listeners.forEach((listener) => {
      try { listener(get()); } catch (error) { console.error('FluxoState listener error', error); }
    });
  }

  function mergeState(target, source) {
    if (!source || typeof source !== 'object') return target;
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      if (Array.isArray(sourceValue)) {
        target[key] = clone(sourceValue);
        return;
      }
      if (sourceValue && typeof sourceValue === 'object') {
        if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
          target[key] = {};
        }
        mergeState(target[key], sourceValue);
        return;
      }
      target[key] = sourceValue;
    });
    return target;
  }

  async function bootstrap(seed) {
    const base = clone(seed || {});
    mergeState(state, base);

    if (FluxoRepository) {
      const persisted = await Promise.resolve(FluxoRepository.loadState());
      if (persisted) mergeState(state, persisted);
      const draft = await Promise.resolve(FluxoRepository.loadDraft());
      state.ui.rascunhoOffline = draft;
    }

    state.meta.hydratedAt = new Date().toISOString();
    notify();
    return get();
  }

  function get() {
    return state;
  }

  function setAuth(authPatch) {
    mergeState(state.auth, authPatch || {});
    notify();
    return state.auth;
  }

  function setUi(uiPatch) {
    mergeState(state.ui, uiPatch || {});
    notify();
    return state.ui;
  }

  function replaceCollection(name, items) {
    if (!Object.prototype.hasOwnProperty.call(state.data, name)) return;
    state.data[name] = clone(items || []);
    notify();
  }

  async function save() {
    if (FluxoRepository) {
      await Promise.resolve(FluxoRepository.saveState({
        auth: state.auth,
        data: state.data,
        ui: { ...state.ui, rascunhoOffline: [] },
        meta: state.meta,
      }));
      await Promise.resolve(FluxoRepository.saveDraft(state.ui.rascunhoOffline || []));
    }
    notify();
  }

  function resetUiPrestacao() {
    state.ui.itensPrest = [];
    state.ui.catSelecionada = null;
    state.ui.fotoPrestUrl = null;
    state.ui.verbaSelecionadaId = null;
    notify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    bootstrap,
    get,
    setAuth,
    setUi,
    replaceCollection,
    save,
    resetUiPrestacao,
    subscribe,
  };
})();

export default FluxoState;
