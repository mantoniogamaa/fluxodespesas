import { createSupabaseAdapter } from './supabase-adapter.js';
import FluxoRepository from './repository.js';
import FluxoState from './state.js';
import FluxoBusiness from './business.js';
import { initApp } from './app.js';

// Registra o adapter Supabase ANTES de qualquer outro módulo usar o repository
const FluxoStorage = createSupabaseAdapter();
FluxoRepository.use(FluxoStorage);

window.FluxoCore = Object.freeze({
  storage: FluxoStorage,
  repository: FluxoRepository,
  state: FluxoState,
  business: FluxoBusiness,
});

window.addEventListener('DOMContentLoaded', () => {
  initApp();
});
