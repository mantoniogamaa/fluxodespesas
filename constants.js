export const COLORS = ['#4F7CFF','#7C5CFC','#2DD4A0','#FFB830','#FF5C5C','#00C6FF'];

export const CATEGORIES = [
  { id: 'alimentacao', label: 'Alimentação' },
  { id: 'hospedagem', label: 'Hospedagem' },
  { id: 'combustivel', label: 'Combustível' },
  { id: 'estacion', label: 'Estacionamento' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'uber', label: 'Uber / Taxi' },
  { id: 'passagem', label: 'Passagem' },
  { id: 'pedagio', label: 'Pedágio' },
  { id: 'material', label: 'Material' },
  { id: 'outros', label: 'Outros' },
];

export const PAGE_META = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão geral' },
  extrato: { title: 'Extrato', subtitle: 'Saldos e fluxos por colaborador' },
  historico: { title: 'Histórico', subtitle: 'Todas as despesas e aprovações' },
  prestacao: { title: 'Prestação', subtitle: 'Monte e envie a prestação de contas' },
  relatorios: { title: 'Relatórios', subtitle: 'Resumo gerencial e impressão' },
  comparativo: { title: 'Comparativo', subtitle: 'Uso de crédito por colaborador' },
  verbas: { title: 'Fluxos', subtitle: 'Créditos lançados e saldo disponível' },
  log: { title: 'Log de ações', subtitle: 'Auditoria operacional' },
  politica: { title: 'Políticas', subtitle: 'Limites por categoria' },
  colaboradores: { title: 'Colaboradores', subtitle: 'Cadastro e gestão de acessos' },
  usuarios: { title: 'Usuários', subtitle: 'Perfis e acessos ao sistema' },
};

export const DEFAULT_POLICY = {
  alimentacao: {
    ativo: true,
    almoco: { label: 'Almoço (11h–15h)', limite: 55.0 },
    jantar: { label: 'Jantar (18h–22h)', limite: 70.0 },
    outros: { label: 'Outros horários', limite: 40.0 },
  },
  hospedagem: { ativo: true, limite: 250.0 },
  combustivel: { ativo: true, limite: 200.0 },
  estacion: { ativo: true, limite: 80.0 },
  transporte: { ativo: true, limite: 120.0 },
  uber: { ativo: true, limite: 80.0 },
  passagem: { ativo: false, limite: 800.0 },
  pedagio: { ativo: true, limite: 50.0 },
  material: { ativo: false, limite: 300.0 },
  outros: { ativo: false, limite: 100.0 },
};
