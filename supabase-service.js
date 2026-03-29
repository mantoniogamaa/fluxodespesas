import { getSupabaseClient, getWorkspaceId, isSupabaseEnabled } from './supabase-client.js';

function ensureClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado. Preencha config.js com URL e anon key.');
  return client;
}

const empresaId = () => getWorkspaceId('principal');

// ============================================================
// AUTH
// ============================================================

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
  const { data, error } = await client
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export function mapCloudIdentity(profile, user) {
  return {
    email: user.email,
    role: profile.role,
    name: profile.nome,
    colabId: profile.colaborador_id || null,
    userId: user.id,
    workspaceId: profile.empresa_id || getWorkspaceId(),
  };
}

// ============================================================
// COLABORADORES
// ============================================================

export async function loadColaboradores() {
  const client = ensureClient();
  const { data, error } = await client
    .from('colaboradores')
    .select(`*, departamento:departamentos(id, nome), centro_custo:centros_custo(id, codigo, nome), politica:politicas(id, nome, limites)`)
    .eq('empresa_id', empresaId())
    .order('nome');
  if (error) throw error;
  return data || [];
}

export async function saveColaborador(payload) {
  const client = ensureClient();
  const row = {
    empresa_id:      empresaId(),
    nome:            payload.nome,
    email:           payload.email,
    telefone:        payload.telefone || null,
    cpf:             payload.cpf || null,
    cargo:           payload.cargo || null,
    departamento_id: payload.departamento_id || null,
    centro_custo_id: payload.centro_custo_id || null,
    politica_id:     payload.politica_id || null,
    chave_pix:       payload.chave_pix || null,
    avatar_color:    payload.avatar_color || '#4F7CFF',
    status:          payload.status || 'ativo',
    updated_at:      new Date().toISOString(),
  };
  if (payload.id) {
    const { data, error } = await client.from('colaboradores').update(row).eq('id', payload.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await client.from('colaboradores').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function toggleColaboradorStatus(id, novoStatus) {
  const client = ensureClient();
  const { data, error } = await client
    .from('colaboradores')
    .update({ status: novoStatus, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// DEPARTAMENTOS
// ============================================================

export async function loadDepartamentos() {
  const client = ensureClient();
  const { data, error } = await client
    .from('departamentos')
    .select('*')
    .eq('empresa_id', empresaId())
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data || [];
}

export async function saveDepartamento(payload) {
  const client = ensureClient();
  const row = { empresa_id: empresaId(), nome: payload.nome, descricao: payload.descricao || null, ativo: payload.ativo !== false, updated_at: new Date().toISOString() };
  if (payload.id) {
    const { data, error } = await client.from('departamentos').update(row).eq('id', payload.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await client.from('departamentos').insert(row).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// CENTROS DE CUSTO
// ============================================================

export async function loadCentrosCusto() {
  const client = ensureClient();
  const { data, error } = await client
    .from('centros_custo')
    .select('*, departamento:departamentos(id, nome)')
    .eq('empresa_id', empresaId())
    .eq('ativo', true)
    .order('codigo');
  if (error) throw error;
  return data || [];
}

export async function saveCentroCusto(payload) {
  const client = ensureClient();
  const row = { empresa_id: empresaId(), codigo: payload.codigo, nome: payload.nome, departamento_id: payload.departamento_id || null, ativo: payload.ativo !== false, updated_at: new Date().toISOString() };
  if (payload.id) {
    const { data, error } = await client.from('centros_custo').update(row).eq('id', payload.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await client.from('centros_custo').insert(row).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// POLÍTICAS
// ============================================================

export async function loadPoliticas() {
  const client = ensureClient();
  const { data, error } = await client
    .from('politicas')
    .select('*')
    .eq('empresa_id', empresaId())
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data || [];
}

export async function savePolitica(payload) {
  const client = ensureClient();
  const row = { empresa_id: empresaId(), nome: payload.nome, descricao: payload.descricao || null, limites: payload.limites || {}, ativo: payload.ativo !== false, updated_at: new Date().toISOString() };
  if (payload.id) {
    const { data, error } = await client.from('politicas').update(row).eq('id', payload.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await client.from('politicas').insert(row).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// FLUXOS (verbas)
// ============================================================

export async function loadFluxos() {
  const client = ensureClient();
  const { data, error } = await client
    .from('fluxos')
    .select('*, colaborador:colaboradores(id, nome, avatar_color)')
    .eq('empresa_id', empresaId())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveFluxo(payload, userId) {
  const client = ensureClient();
  const row = {
    empresa_id: empresaId(), colaborador_id: payload.colaborador_id, motivo: payload.motivo,
    total: payload.total || 0, usado: payload.usado || 0, status: payload.status || 'ativa',
    data_inicio: payload.data_inicio || new Date().toISOString().slice(0, 10),
    data_fim: payload.data_fim || null, criado_por: userId || null, updated_at: new Date().toISOString(),
  };
  if (payload.id) {
    const { data, error } = await client.from('fluxos').update(row).eq('id', payload.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await client.from('fluxos').insert(row).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// DESPESAS
// ============================================================

export async function loadDespesas() {
  const client = ensureClient();
  const { data, error } = await client
    .from('despesas')
    .select('*, colaborador:colaboradores(id, nome), fluxo:fluxos(id, motivo)')
    .eq('empresa_id', empresaId())
    .order('data_despesa', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveDespesa(payload, colaboradorId) {
  const client = ensureClient();
  const row = {
    empresa_id: empresaId(), fluxo_id: payload.fluxo_id || null, colaborador_id: colaboradorId,
    estabelecimento: payload.estabelecimento, categoria: payload.categoria, valor: payload.valor,
    data_despesa: payload.data_despesa, horario: payload.horario || null,
    observacao: payload.observacao || null, foto_url: payload.foto_url || null,
    justificativa: payload.justificativa || null, status: 'Pendente', updated_at: new Date().toISOString(),
  };
  if (payload.id) {
    const { data, error } = await client.from('despesas').update(row).eq('id', payload.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await client.from('despesas').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function aprovarDespesa(id, userId) {
  const client = ensureClient();
  const { data, error } = await client.from('despesas')
    .update({ status: 'Aprovado', aprovado_por: userId, aprovado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function rejeitarDespesa(id, userId, motivo) {
  const client = ensureClient();
  const { data, error } = await client.from('despesas')
    .update({ status: 'Rejeitado', aprovado_por: userId, aprovado_em: new Date().toISOString(), motivo_rejeicao: motivo || null, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ============================================================
// LOG DE AÇÕES
// ============================================================

export async function loadLogAcoes(limit = 200) {
  const client = ensureClient();
  const { data, error } = await client
    .from('log_acoes')
    .select('*')
    .eq('empresa_id', empresaId())
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function addLogAcao(tipo, texto, userId) {
  const client = ensureClient();
  const { error } = await client.from('log_acoes').insert({
    empresa_id: empresaId(), usuario_id: userId || null, tipo: tipo || 'blue', texto,
  });
  if (error) console.error('log_acoes insert error', error);
}

// ============================================================
// RASCUNHOS
// ============================================================

export async function loadRascunho(userId) {
  const client = ensureClient();
  const { data, error } = await client
    .from('rascunhos').select('itens')
    .eq('empresa_id', empresaId()).eq('usuario_id', userId).maybeSingle();
  if (error) throw error;
  return data?.itens || [];
}

export async function saveRascunho(userId, itens) {
  const client = ensureClient();
  const { error } = await client.from('rascunhos').upsert(
    { empresa_id: empresaId(), usuario_id: userId, itens: Array.isArray(itens) ? itens : [], updated_at: new Date().toISOString() },
    { onConflict: 'empresa_id,usuario_id' }
  );
  if (error) throw error;
}

export async function clearRascunho(userId) {
  const client = ensureClient();
  const { error } = await client.from('rascunhos')
    .delete().eq('empresa_id', empresaId()).eq('usuario_id', userId);
  if (error) throw error;
}

// ============================================================
// CARREGAMENTO COMPLETO (substitui hydrateRemote)
// ============================================================

export async function loadFullState() {
  const [colaboradores, departamentos, centrosCusto, politicas, fluxos, despesas, logAcoes] = await Promise.all([
    loadColaboradores(), loadDepartamentos(), loadCentrosCusto(),
    loadPoliticas(), loadFluxos(), loadDespesas(), loadLogAcoes(),
  ]);
  const politicaPadrao = politicas.find(p => p.nome === 'Padrao') || politicas[0];
  return {
    data: {
      colaboradores:   colaboradores.map(mapColaborador),
      verbas:          fluxos.map(mapFluxo),
      despesas:        despesas.map(mapDespesa),
      prestacoes:      [],
      logAcoes:        logAcoes.map(mapLog),
      politica:        politicaPadrao?.limites || {},
      _departamentos:  departamentos,
      _centrosCusto:   centrosCusto,
      _politicas:      politicas,
    },
  };
}

// ============================================================
// MAPPERS: banco → formato do app
// ============================================================

function mapColaborador(c) {
  const nome = c.nome || '';
  const partes = nome.trim().split(' ');
  const initials = partes.length >= 2
    ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
    : nome.slice(0, 2).toUpperCase();
  return {
    id: c.id, nome, dept: c.departamento?.nome || '', initials,
    color: c.avatar_color || '#4F7CFF', email: c.email,
    telefone: c.telefone || '', cpf: c.cpf || '', cargo: c.cargo || '',
    cc: c.centro_custo?.codigo || '', pix: c.chave_pix || '',
    politicaId: c.politica_id ? String(c.politica_id) : '',
    status: c.status || 'ativo',
    _departamento_id: c.departamento_id,
    _centro_custo_id: c.centro_custo_id,
    _politica_id: c.politica_id,
  };
}

function mapFluxo(f) {
  return {
    id: f.id, colabId: f.colaborador_id, motivo: f.motivo,
    total: Number(f.total), usado: Number(f.usado),
    status: f.status, dataInicio: f.data_inicio, dataFim: f.data_fim || null,
  };
}

function mapDespesa(d) {
  return {
    id: d.id, verbaid: d.fluxo_id, colabId: d.colaborador_id,
    estab: d.estabelecimento, cat: d.categoria, valor: Number(d.valor),
    data: d.data_despesa, horario: d.horario || '', status: d.status,
    obs: d.observacao || '', justificativa: d.justificativa || '',
    fotoUrl: d.foto_url || null, aprovadoPor: d.aprovado_por || '',
    aprovadoEm: d.aprovado_em || '', motivoRejeicao: d.motivo_rejeicao || '',
  };
}

function mapLog(l) {
  return { type: l.tipo, texto: l.texto, time: new Date(l.created_at).toLocaleString('pt-BR') };
}
