import { getSupabaseClient, getWorkspaceId, isSupabaseEnabled } from './supabase-client.js';

function ensureClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado. Preencha config.js com URL e anon key.');
  return client;
}

export async function signInWithPassword(email, password) {
  const client = ensureClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutCloud() {
  if (!isSupabaseEnabled()) return;
  const client = ensureClient();
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function getSessionUser() {
  if (!isSupabaseEnabled()) return null;
  const client = ensureClient();
  const { data: { session }, error } = await client.auth.getSession();
  if (error || !session) return null;
  return session.user || null;
}

export async function getProfile(userId) {
  const client = ensureClient();
  const { data, error } = await client.from('app_profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function loadWorkspaceState(workspaceId = getWorkspaceId()) {
  const client = ensureClient();
  const { data, error } = await client.from('workspace_state').select('payload, updated_at').eq('workspace_id', workspaceId).maybeSingle();
  if (error) throw error;
  return data?.payload || null;
}

export async function saveWorkspaceState({ workspaceId = getWorkspaceId(), payload, ownerUserId }) {
  const client = ensureClient();
  const row = {
    workspace_id: workspaceId,
    owner_user_id: ownerUserId,
    payload,
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from('workspace_state').upsert(row, { onConflict: 'workspace_id' });
  if (error) throw error;
  return row;
}

export async function loadWorkspaceDraft({ workspaceId = getWorkspaceId(), userId }) {
  const client = ensureClient();
  const { data, error } = await client.from('workspace_drafts').select('items').eq('workspace_id', workspaceId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.items || [];
}

export async function saveWorkspaceDraft({ workspaceId = getWorkspaceId(), userId, items }) {
  const client = ensureClient();
  const row = {
    workspace_id: workspaceId,
    user_id: userId,
    items: Array.isArray(items) ? items : [],
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from('workspace_drafts').upsert(row, { onConflict: 'workspace_id,user_id' });
  if (error) throw error;
  return row;
}

export async function clearWorkspaceDraft({ workspaceId = getWorkspaceId(), userId }) {
  const client = ensureClient();
  const { error } = await client.from('workspace_drafts').delete().eq('workspace_id', workspaceId).eq('user_id', userId);
  if (error) throw error;
}

export function mapCloudIdentity(profile, user) {
  return {
    email: user.email,
    role: profile.role,
    name: profile.nome,
    colabId: profile.colaborador_id || null,
    userId: user.id,
    workspaceId: profile.workspace_id || getWorkspaceId(),
  };
}
