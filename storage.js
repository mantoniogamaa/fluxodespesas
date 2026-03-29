// storage.js — ativa o adapter Supabase no FluxoRepository
import { createSupabaseAdapter } from './supabase-adapter.js';
import FluxoRepository from './repository.js';

const FluxoStorage = createSupabaseAdapter();

// Registra o adapter Supabase como ativo no repository
FluxoRepository.use(FluxoStorage);

export { createSupabaseAdapter };
export default FluxoStorage;
