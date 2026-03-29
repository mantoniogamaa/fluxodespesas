import {
  loadWorkspaceState,
  saveWorkspaceState,
  loadWorkspaceDraft,
  saveWorkspaceDraft,
  clearWorkspaceDraft,
} from './supabase-service.js';

export function createSupabaseCloudAdapter(getCloudContext) {
  return {
    kind: 'supabase-cloud',
    async loadState() {
      const ctx = getCloudContext?.();
      if (!ctx?.workspaceId) return null;
      return await loadWorkspaceState(ctx.workspaceId);
    },
    async saveState(payload) {
      const ctx = getCloudContext?.();
      if (!ctx?.workspaceId || !ctx?.userId) return payload;
      return await saveWorkspaceState({ workspaceId: ctx.workspaceId, payload, ownerUserId: ctx.userId });
    },
    async loadDraft() {
      const ctx = getCloudContext?.();
      if (!ctx?.workspaceId || !ctx?.userId) return [];
      return await loadWorkspaceDraft({ workspaceId: ctx.workspaceId, userId: ctx.userId });
    },
    async saveDraft(items) {
      const ctx = getCloudContext?.();
      if (!ctx?.workspaceId || !ctx?.userId) return items;
      return await saveWorkspaceDraft({ workspaceId: ctx.workspaceId, userId: ctx.userId, items });
    },
    async clearDraft() {
      const ctx = getCloudContext?.();
      if (!ctx?.workspaceId || !ctx?.userId) return;
      return await clearWorkspaceDraft({ workspaceId: ctx.workspaceId, userId: ctx.userId });
    },
    async clearAll() {
      const ctx = getCloudContext?.();
      if (!ctx?.workspaceId || !ctx?.userId) return;
      await clearWorkspaceDraft({ workspaceId: ctx.workspaceId, userId: ctx.userId });
    },
    inspect() {
      const ctx = getCloudContext?.() || {};
      return { kind: 'supabase-cloud', workspaceId: ctx.workspaceId || null, userId: ctx.userId || null };
    },
  };
}

export default createSupabaseCloudAdapter;
