import { COLORS, DEFAULT_POLICY } from './constants.js';

export const SEED_STATE = {
  auth: { currentRole: 'gestor', currentUser: null },
  data: {
    politica: DEFAULT_POLICY,
    colaboradores: [
      { id: 1, nome: 'Ana Lima', dept: 'Comercial', initials: 'AL', color: COLORS[0], email: 'ana.lima@empresa.com', senha: '123456', telefone: '(11) 98765-4321', cpf: '111.222.333-44', cargo: 'Gerente Comercial', cc: 'CC-001', status: 'ativo' },
      { id: 2, nome: 'Bruno Ramos', dept: 'TI', initials: 'BR', color: COLORS[1], email: 'bruno.ramos@empresa.com', senha: '123456', telefone: '(11) 91234-5678', cpf: '222.333.444-55', cargo: 'Desenvolvedor Sênior', cc: 'CC-002', status: 'ativo' },
      { id: 3, nome: 'Carla Mendes', dept: 'Financeiro', initials: 'CM', color: COLORS[2], email: 'carla.mendes@empresa.com', senha: '123456', telefone: '(11) 99876-5432', cpf: '333.444.555-66', cargo: 'Analista Financeiro', cc: 'CC-003', status: 'ativo' },
    ],
    verbas: [
      { id: 1, colabId: 1, motivo: 'Viagem SP — Mai/25', total: 2000, usado: 1150, status: 'ativa', dataInicio: '2025-05-01' },
      { id: 2, colabId: 2, motivo: 'Feira Tech — Jun/25', total: 1500, usado: 620, status: 'ativa', dataInicio: '2025-05-10' },
      { id: 3, colabId: 3, motivo: 'Visita Cliente RJ', total: 1800, usado: 980, status: 'ativa', dataInicio: '2025-05-15' },
      { id: 4, colabId: 1, motivo: 'Treinamento Curitiba', total: 1200, usado: 500, status: 'ativa', dataInicio: '2025-05-20' },
      { id: 5, colabId: 2, motivo: 'Congresso BH — Jun/25', total: 1900, usado: 0, status: 'ativa', dataInicio: '2025-06-01' },
    ],
    despesas: [
      { id: 1, verbaid: 1, colabId: 1, estab: 'Restaurante Central', cat: 'alimentacao', valor: 85.50, data: '2025-05-10', status: 'Aprovado', obs: '', aprovadoPor: 'Marcos Gestor', aprovadoEm: '2025-05-11' },
      { id: 2, verbaid: 1, colabId: 1, estab: 'Uber', cat: 'uber', valor: 42.00, data: '2025-05-11', status: 'Aprovado', obs: '', aprovadoPor: 'Marcos Gestor', aprovadoEm: '2025-05-12' },
      { id: 3, verbaid: 2, colabId: 2, estab: 'Hotel Ibis', cat: 'hospedagem', valor: 350.00, data: '2025-05-15', status: 'Aprovado', obs: '', aprovadoPor: 'Marcos Gestor', aprovadoEm: '2025-05-16' },
      { id: 4, verbaid: 3, colabId: 3, estab: 'Posto Shell', cat: 'combustivel', valor: 120.00, data: '2025-05-18', status: 'Pendente', obs: '' },
      { id: 5, verbaid: 2, colabId: 2, estab: 'iFood', cat: 'alimentacao', valor: 67.90, data: '2025-05-20', status: 'Aprovado', obs: '', aprovadoPor: 'Marcos Gestor', aprovadoEm: '2025-05-21' },
      { id: 6, verbaid: 3, colabId: 3, estab: 'Copastur Viagens', cat: 'passagem', valor: 480.00, data: '2025-05-22', status: 'Pendente', obs: '' },
      { id: 7, verbaid: 1, colabId: 1, estab: 'Mercado Livre', cat: 'material', valor: 215.00, data: '2025-05-23', status: 'Pendente', obs: '' },
      { id: 8, verbaid: 4, colabId: 1, estab: 'Aeroporto GRU', cat: 'alimentacao', valor: 38.50, data: '2025-05-24', status: 'Aprovado', obs: '', aprovadoPor: 'Marcos Gestor', aprovadoEm: '2025-05-24' },
    ],
    prestacoes: [],
    logAcoes: [
      { type: 'blue', texto: 'Base demo carregada', time: '29/03/2026 09:00' },
    ],
  },
  ui: {
    itensPrest: [],
    catSelecionada: null,
    fotoPrestUrl: null,
    verbaSelecionadaId: 1,
    rascunhoOffline: [],
  },
  meta: { schemaVersion: 3, hydratedAt: null },
};
