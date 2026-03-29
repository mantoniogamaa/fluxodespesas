import test from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserMocks } from './test-env.mjs';
installBrowserMocks();

import FluxoState from './state.js';
import FluxoBusiness from './business.js';
import FluxoRepository from './repository.js';
import { createMemoryAdapter } from './adapters/memory-adapter.js';
import { SEED_STATE } from './seed.js';
import { DEFAULT_POLICY } from './constants.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resetApp() {
  globalThis.localStorage.clear();
  FluxoRepository.use(createMemoryAdapter());
  FluxoState.bootstrap(clone(SEED_STATE));
  return FluxoState.get();
}

test('PolicyService.checkLimit detects excess for lunch expenses', () => {
  resetApp();
  const result = FluxoBusiness.PolicyService.checkLimit(DEFAULT_POLICY, 'alimentacao', 80, '12:30');

  assert.ok(result);
  assert.equal(result.limite, 55);
  assert.equal(result.excesso, 25);
  assert.equal(result.subLabel, 'Almoço (11h–15h)');
  assert.equal(result.pct, 45);
});

test('PolicyService.checkLimit returns null when category is disabled or within limit', () => {
  resetApp();
  assert.equal(FluxoBusiness.PolicyService.checkLimit(DEFAULT_POLICY, 'passagem', 900, '10:00'), null);
  assert.equal(FluxoBusiness.PolicyService.checkLimit(DEFAULT_POLICY, 'uber', 40, '10:00'), null);
});

test('ColaboradorService.save blocks duplicate emails and allows valid creation', () => {
  resetApp();

  const duplicate = FluxoBusiness.ColaboradorService.save({
    nome: 'Ana Clone',
    dept: 'Comercial',
    email: 'ana.lima@empresa.com',
    senha: '123456'
  }, 'Gestor Teste');

  assert.equal(duplicate.ok, false);
  assert.match(duplicate.message, /E-mail já cadastrado/i);

  const created = FluxoBusiness.ColaboradorService.save({
    nome: 'Diego Freitas',
    dept: 'Operações',
    email: 'diego.freitas@empresa.com',
    senha: '123456',
    color: '#4F7CFF'
  }, 'Gestor Teste');

  assert.equal(created.ok, true);
  assert.equal(created.item.id, 4);
  assert.equal(created.item.initials, 'DF');
  assert.equal(FluxoState.get().data.colaboradores.length, 4);
});

test('AuthService.login blocks inactive collaborator', () => {
  resetApp();
  FluxoBusiness.ColaboradorService.toggleStatus(2, 'Gestor Teste');

  const result = FluxoBusiness.AuthService.login({
    email: 'bruno.ramos@empresa.com',
    senha: '123456',
    currentRole: 'colaborador'
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /Acesso bloqueado/i);
});

test('FluxoService.create validates input and creates a new active fluxo', () => {
  resetApp();

  const invalid = FluxoBusiness.FluxoService.create({ colabId: 1, motivo: '', total: 0 }, 'Gestor Teste');
  assert.equal(invalid.ok, false);

  const created = FluxoBusiness.FluxoService.create({
    colabId: 1,
    motivo: 'Visita técnica Campinas',
    total: 950,
    dataInicio: '2026-03-29'
  }, 'Gestor Teste');

  assert.equal(created.ok, true);
  assert.equal(created.item.status, 'ativa');
  assert.equal(created.item.id, 6);
  assert.equal(FluxoState.get().data.verbas.at(-1).motivo, 'Visita técnica Campinas');
});

test('DespesaService.reject reverts used amount on related fluxo', () => {
  resetApp();
  const before = FluxoState.get().data.verbas.find((item) => item.id === 3).usado;

  const result = FluxoBusiness.DespesaService.reject(4, 'Gestor Teste');

  assert.equal(result.ok, true);
  assert.equal(result.item.status, 'Rejeitado');
  const after = FluxoState.get().data.verbas.find((item) => item.id === 3).usado;
  assert.equal(after, before - 120);
});

test('PrestacaoService.saveDraft and importDraft move draft safely into UI state', () => {
  resetApp();
  const draft = [{ estab: 'Hotel', valor: 200, cat: 'hospedagem' }];

  FluxoBusiness.PrestacaoService.saveDraft(draft);
  assert.deepEqual(FluxoState.get().ui.rascunhoOffline, draft);

  const imported = FluxoBusiness.PrestacaoService.importDraft();
  assert.deepEqual(imported, draft);
  assert.deepEqual(FluxoState.get().ui.itensPrest, draft);
  assert.deepEqual(FluxoState.get().ui.rascunhoOffline, []);
});

test('PrestacaoService.submit creates prestacao, pending expenses and closes fluxo', () => {
  resetApp();
  FluxoState.setUi({
    itensPrest: [
      { estab: 'Restaurante XPTO', valor: 60, cat: 'alimentacao', data: '2026-03-29' },
      { estab: 'Uber Centro', valor: 35, cat: 'uber', data: '2026-03-29' }
    ]
  });

  const result = FluxoBusiness.PrestacaoService.submit({
    verbaId: 5,
    obs: 'Prestação de teste',
    currentUser: { name: 'Bruno Ramos', colabId: 2 }
  });

  assert.equal(result.ok, true);
  assert.equal(result.item.id, 1);
  assert.equal(result.item.saldo, 1805);
  assert.equal(FluxoState.get().data.prestacoes.length, 1);
  const newExpenses = FluxoState.get().data.despesas.filter((item) => item.origemPrestacaoId === 1);
  assert.equal(newExpenses.length, 2);
  assert.ok(newExpenses.every((item) => item.status === 'Pendente'));
  const fluxo = FluxoState.get().data.verbas.find((item) => item.id === 5);
  assert.equal(fluxo.usado, 95);
  assert.equal(fluxo.status, 'encerrada');
  assert.deepEqual(FluxoState.get().ui.itensPrest, []);
});


test('Repository adapter can be swapped without changing business rules', () => {
  resetApp();
  const adapterInfo = FluxoRepository.inspect();

  assert.equal(adapterInfo.kind, 'memory');
  FluxoBusiness.PrestacaoService.saveDraft([{ estab: 'Teste', valor: 10, cat: 'outros' }]);
  assert.deepEqual(FluxoRepository.loadDraft(), [{ estab: 'Teste', valor: 10, cat: 'outros' }]);
});
