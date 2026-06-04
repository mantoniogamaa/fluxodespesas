import {
  loadFullState,
  saveRascunho,
  loadRascunho,
  clearRascunho,
} from './supabase-service.js';

export function createSupabaseCloudAdapter(getCloudContext) {
  return {
    kind: 'supabase-cloud',

    async loadState() {
      const ctx = getCloudContext?.();
      if (!ctx?.userId) return null;
      return await loadFullState();
    },

    async saveState(_payload) {
      // No novo modelo relacional, cada entidade é salva individualmente
      // via saveColaborador, saveFluxo, etc. — não há mais saveState em bloco.
      return _payload;
    },

    async loadDraft() {
      const ctx = getCloudContext?.();
      if (!ctx?.userId) return [];
      return await loadRascunho(ctx.userId);
    },

    async saveDraft(items) {
      const ctx = getCloudContext?.();
      if (!ctx?.userId) return items;
      await saveRascunho(ctx.userId, items);
      return items;
    },

    async clearDraft() {
      const ctx = getCloudContext?.();
      if (!ctx?.userId) return;
      await clearRascunho(ctx.userId);
    },

    async clearAll() {
      const ctx = getCloudContext?.();
      if (!ctx?.userId) return;
      await clearRascunho(ctx.userId);
    },

    inspect() {
      const ctx = getCloudContext?.() || {};
      return { kind: 'supabase-cloud', workspaceId: ctx.workspaceId || null, userId: ctx.userId || null };
    },
  };
}

export default createSupabaseCloudAdapter;
