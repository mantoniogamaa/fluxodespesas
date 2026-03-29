// supabase-adapter.js
// Adapter Supabase para o FluxoRepository (v10+)
//
// SETUP RÁPIDO:
//   1. Cole sua SUPABASE_ANON_KEY abaixo (Supabase → Settings → API → anon key)
//   2. Execute o SQL de criação de tabelas no SQL Editor do Supabase (veja README.md)
//   3. Em storage.js, troque o import para usar createSupabaseAdapter
//
// INTERFACE IMPLEMENTADA: loadState · saveState · loadDraft · saveDraft · clearDraft · clearAll

const SUPABASE_URL = 'https://fbfjczmajurunybofhqb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_p2PvcbXSy8gI0qzMbXOnEA_nzP0BOYA'; // ← única coisa que você precisa preencher

const STATE_TABLE  = 'fluxo_state';
const DRAFT_TABLE  = 'fluxo_draft';
const RECORD_ID    = 1; // linha única por tabela (single-row pattern)

// ---------- helpers internos ----------

function headers() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Prefer': 'return=representation',
  };
}

async function upsert(table, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ id: RECORD_ID, ...payload }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Supabase] upsert ${table} falhou: ${err}`);
  }
  const rows = await res.json();
  return rows[0] ?? null;
}

async function fetchOne(table) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${RECORD_ID}&select=*`,
    { headers: headers() }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Supabase] fetch ${table} falhou: ${err}`);
  }
  const rows = await res.json();
  return rows[0] ?? null;
}

async function deleteOne(table) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${RECORD_ID}`,
    { method: 'DELETE', headers: headers() }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Supabase] delete ${table} falhou: ${err}`);
  }
}

// ---------- factory ----------

export function createSupabaseAdapter() {
  return {
    kind: 'supabase',

    async loadState() {
      try {
        const row = await fetchOne(STATE_TABLE);
        return row?.payload ?? null;
      } catch (e) {
        console.error('[FluxoStorage] loadState:', e);
        return null;
      }
    },

    async saveState(payload) {
      try {
        await upsert(STATE_TABLE, { payload });
        return payload;
      } catch (e) {
        console.error('[FluxoStorage] saveState:', e);
        return payload;
      }
    },

    async loadDraft() {
      try {
        const row = await fetchOne(DRAFT_TABLE);
        return Array.isArray(row?.items) ? row.items : [];
      } catch (e) {
        console.error('[FluxoStorage] loadDraft:', e);
        return [];
      }
    },

    async saveDraft(items) {
      try {
        const draft = Array.isArray(items) ? items : [];
        await upsert(DRAFT_TABLE, { items: draft });
        return draft;
      } catch (e) {
        console.error('[FluxoStorage] saveDraft:', e);
        return items;
      }
    },

    async clearDraft() {
      try {
        await deleteOne(DRAFT_TABLE);
      } catch (e) {
        console.error('[FluxoStorage] clearDraft:', e);
      }
    },

    async clearAll() {
      try {
        await Promise.all([deleteOne(STATE_TABLE), deleteOne(DRAFT_TABLE)]);
      } catch (e) {
        console.error('[FluxoStorage] clearAll:', e);
      }
    },

    inspect() {
      return { kind: 'supabase', url: SUPABASE_URL, table: STATE_TABLE };
    },
  };
}

export default createSupabaseAdapter;
