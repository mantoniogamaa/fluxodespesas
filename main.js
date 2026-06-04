import FluxoStorage from './storage.js';
import FluxoRepository from './repository.js';
import FluxoState from './state.js';
import FluxoBusiness from './business.js';
import { initApp } from './app.js';

window.FluxoCore = Object.freeze({
  storage: FluxoStorage,
  repository: FluxoRepository,
  state: FluxoState,
  business: FluxoBusiness,
});

window.addEventListener('DOMContentLoaded', async () => {
  await initApp();
});
