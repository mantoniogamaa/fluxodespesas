// storage.js — troca o adapter ativo para Supabase
import { createSupabaseAdapter } from './supabase-adapter.js';

const FluxoStorage = createSupabaseAdapter();

export { createSupabaseAdapter };
export default FluxoStorage;
