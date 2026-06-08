import FluxoState from './state.js';
import FluxoRepository from './repository.js';
import { isSupabaseEnabled } from './supabase-client.js';
import { signInWithPassword, signOutCloud, getProfile, mapCloudIdentity, getSessionUser } from './supabase-service.js';

export const FluxoBusiness = (() => {
  const clone = (value) => {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  const now = () => new Date().toLocaleString('pt-BR');
  const today = () => new Date().toISOString().split('T')[0];
  const nextId = (items) => items.length ? Math.max(...items.map((item) => Number(item.id) || 0)) + 1 : 1;
  const initials = (name) => (name || '').split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  function state() {
    return FluxoState.get();
  }

  function addLog(type, texto) {
    state().data.logAcoes.unshift({ type, texto, time: now() });
    FluxoState.save();
  }

  
const AuthService = {
    setRole(role) {
      FluxoState.setAuth({ currentRole: role });
      FluxoState.save();
      return role;
    },

    async login({ email, senha, currentRole }) {
      const appState = state();
      const normalizedEmail = (email || '').trim().toLowerCase();
      const password = senha || '';

      if (!normalizedEmail || !password) {
        return { ok: false, message: 'Preencha e-mail e senha' };
      }

      if (isSupabaseEnabled()) {
        try {
          await signInWithPassword(normalizedEmail, password);
          const user = await getSessionUser();
          if (!user) return { ok: false, message: 'Sessão Supabase não encontrada' };
          const profile = await getProfile(user.id);
          const mapped = mapCloudIdentity(profile, user);
          FluxoState.setAuth({ currentRole: mapped.role, currentUser: mapped });
          FluxoState.save();
          return { ok: true, user: mapped, cloud: true };
        } catch (error) {
          return { ok: false, message: error?.message || 'Falha ao autenticar no Supabase' };
        }
      }

      if (currentRole === 'gestor') {
        return { ok: false, message: 'Credenciais inválidas' };
      }

      const colaborador = appState.data.colaboradores.find((item) =>
        item.email.toLowerCase() === normalizedEmail && item.senha === password && item.status === 'ativo'
      );

      if (!colaborador) {
        const existente = appState.data.colaboradores.find((item) => item.email.toLowerCase() === normalizedEmail);
        if (existente && existente.status === 'inativo') {
          return { ok: false, message: 'Acesso bloqueado. Contate o gestor.' };
        }
        return { ok: false, message: 'E-mail ou senha incorretos' };
      }

      const user = {
        email: colaborador.email,
        role: 'colaborador',
        name: colaborador.nome,
        colabId: colaborador.id,
      };
      FluxoState.setAuth({ currentRole: 'colaborador', currentUser: user });
      FluxoState.save();
      return { ok: true, user };
    },

    async logout() {
      if (isSupabaseEnabled()) {
        try {
          await signOutCloud();
        } catch (error) {
          console.error('Supabase signOut error', error);
        }
      }
      FluxoState.setAuth({ currentUser: null, currentRole: 'gestor' });
      FluxoState.save();
    },
  };

  const PolicyService = {

    checkLimit(policy, cat, valor, horario, tipoRefeicao) {
      const policyConfig = policy?.[cat];
      if (!policyConfig || !policyConfig.ativo) return null;

      let limite;
      let subLabel = null;

      if (cat === 'alimentacao') {
        // Prioridade: seleção explícita do usuário > hora informada > hora atual
        let tipo = tipoRefeicao;
        if (!tipo) {
          const hora = horario ? parseInt(horario.split(':')[0], 10) : new Date().getHours();
          if (hora >= 11 && hora < 15) tipo = 'almoco';
          else if (hora >= 18 && hora < 23) tipo = 'jantar';
          else tipo = 'outros';
        }
        const cfg = policyConfig[tipo] || policyConfig.outros;
        limite   = cfg?.limite;
        subLabel = cfg?.label || (tipo === 'almoco' ? 'Almoço' : tipo === 'jantar' ? 'Jantar' : 'Outro horário');
      } else {
        limite = policyConfig.limite;
      }

      if (valor <= limite) return null;

      return {
        limite,
        excesso: valor - limite,
        subLabel,
        pct: Math.round((valor / limite - 1) * 100),
      };
    },

    saveLimits(nextPolicy, actorName) {
      state().data.politica = clone(nextPolicy);
      addLog('blue', `${actorName} atualizou a política de despesas`);
      return state().data.politica;
    },
  };

  const ColaboradorService = {
    save(payload, actorName) {
      const appState = state();
      const items = appState.data.colaboradores;
      const nome = (payload.nome || '').trim();
      const dept = (payload.dept || '').trim();
      const email = (payload.email || '').trim().toLowerCase();
      const senha = payload.senha || '';
      const editId = payload.id ? String(payload.id) : '';

      if (!nome) return { ok: false, message: 'Informe o nome' };
      if (!dept) return { ok: false, message: 'Informe o departamento' };
      if (!email || !email.includes('@')) return { ok: false, message: 'Informe um e-mail válido' };

      const duplicated = items.find((item) => item.email.toLowerCase() === email && String(item.id) !== editId);
      if (duplicated) return { ok: false, message: 'E-mail já cadastrado para outro colaborador' };
      if (!editId && !senha) return { ok: false, message: 'Defina uma senha de acesso' };
      if (senha && senha.length < 6) return { ok: false, message: 'Senha deve ter no mínimo 6 caracteres' };

      const cc = (payload.cc || '').trim();
      const pix = (payload.pix || '').trim();
      const politicaId = (payload.politicaId || '').trim();

      if (!cc) return { ok: false, message: 'Informe o centro de custo' };

      const baseData = {
        nome,
        dept,
        email,
        telefone: payload.telefone || '',
        cpf: payload.cpf || '',
        cargo: payload.cargo || '',
        cc,
        pix,
        politicaId,
        status: payload.status || 'ativo',
        color: payload.color,
        initials: initials(nome),
      };

      if (editId) {
        const collaborator = items.find((item) => String(item.id) === editId);
        if (!collaborator) return { ok: false, message: 'Colaborador não encontrado' };

        Object.assign(collaborator, baseData);
        if (senha) collaborator.senha = senha;
        addLog('blue', `${actorName} editou colaborador: ${nome}`);
        return { ok: true, message: 'Colaborador atualizado!', item: collaborator };
      }

      const newItem = {
        id: nextId(items),
        ...baseData,
        senha,
      };
      items.push(newItem);
      addLog('blue', `${actorName} cadastrou colaborador: ${nome} (${email})`);
      return { ok: true, message: 'Colaborador cadastrado!', item: newItem };
    },

    toggleStatus(id, actorName) {
      const collaborator = state().data.colaboradores.find((item) => Number(item.id) === Number(id));
      if (!collaborator) return { ok: false, message: 'Colaborador não encontrado' };

      collaborator.status = collaborator.status === 'ativo' ? 'inativo' : 'ativo';
      addLog(
        collaborator.status === 'ativo' ? 'green' : 'red',
        `${actorName} ${collaborator.status === 'ativo' ? 'ativou' : 'bloqueou'} colaborador: ${collaborator.nome}`
      );
      return {
        ok: true,
        item: collaborator,
        message: `${collaborator.nome} ${collaborator.status === 'ativo' ? 'ativado' : 'bloqueado'}!`,
        toastType: collaborator.status === 'ativo' ? 'success' : 'warning',
      };
    },
  };

  const FluxoService = {
    gerarNumero(items) {
      const ano = new Date().getFullYear();
      const seq = (items.length + 1).toString().padStart(3, '0');
      return `FLX-${ano}-${seq}`;
    },

    create(payload, actorName) {
      const items = state().data.verbas;
      const colabId = Number(payload.colabId);
      const motivo = (payload.motivo || '').trim();
      const total = Number(payload.total);
      const dataInicio = payload.dataInicio || today();

      if (!motivo) return { ok: false, message: 'Informe o motivo' };
      if (!total || total <= 0) return { ok: false, message: 'Informe o valor' };

      const item = {
        id: nextId(items),
        numero: FluxoService.gerarNumero(items),
        colabId,
        motivo,
        total,
        usado: 0,
        status: 'ativa',
        dataInicio,
      };
      items.push(item);

      const colaborador = state().data.colaboradores.find((colab) => colab.id === colabId);
      addLog('blue', `${actorName} criou verba para ${colaborador?.nome || 'colaborador'}: ${motivo} (R$ ${total.toFixed(2)})`);
      return { ok: true, item, message: `Crédito de R$ ${total.toFixed(2)} lançado!` };
    },
  };

  const DespesaService = {
    submitSingle(payload, actorName) {
      const appState = state();
      const verbaId = Number(payload.verbaId);
      const fluxo = appState.data.verbas.find((item) => Number(item.id) === verbaId);
      if (!fluxo) return { ok: false, message: 'Fluxo não encontrado. Selecione um fluxo ativo.' };
      if (fluxo.status !== 'ativa') return { ok: false, message: 'Este fluxo está encerrado.' };

      const valor = Number(payload.valor || 0);
      if (!valor || valor <= 0) return { ok: false, message: 'Informe o valor da despesa.' };
      if (!payload.estab) return { ok: false, message: 'Informe o estabelecimento.' };
      if (!payload.cat) return { ok: false, message: 'Selecione a categoria.' };

      const saldoDisponivel = fluxo.total - fluxo.usado;
      if (valor > saldoDisponivel) return { ok: false, message: `Saldo insuficiente. Disponível: R$ ${saldoDisponivel.toFixed(2)}` };

      fluxo.usado = +(fluxo.usado + valor).toFixed(2);

      const expense = {
        id: nextId(appState.data.despesas),
        verbaid: verbaId,
        colabId: Number(payload.colabId),
        estab: payload.estab,
        cat: payload.cat,
        valor,
        data: payload.data || today(),
        horario: payload.horario || '',
        tipoRefeicao: payload.tipoRefeicao || null,
        centroCusto: payload.centroCusto || '',
        obs: payload.obs || '',
        justificativa: payload.justificativa || '',
        fotoUrl: payload.fotoUrl || null,
        politicaExcesso: payload.politicaExcesso || null,
        status: 'Pendente',
        lancadoEm: now(),
      };
      appState.data.despesas.push(expense);

      const colaborador = appState.data.colaboradores.find((c) => Number(c.id) === expense.colabId);
      addLog('blue', `${actorName} lançou despesa: ${expense.estab} (R$ ${valor.toFixed(2)}) — aguarda aprovação`);
      FluxoState.save();
      return { ok: true, item: expense, message: 'Despesa enviada para aprovação!' };
    },

    approve(id, actorName) {
      const expense = state().data.despesas.find((item) => item.id === id);
      if (!expense) return { ok: false, message: 'Despesa não encontrada' };

      expense.status = 'Aprovado';
      expense.aprovadoPor = actorName;
      expense.aprovadoEm = today();

      const colaborador = state().data.colaboradores.find((item) => item.id === expense.colabId);
      addLog('green', `${actorName} aprovou despesa de ${colaborador?.nome || 'colaborador'}: ${expense.estab} (R$ ${expense.valor.toFixed(2)})`);
      return { ok: true, item: expense, message: 'Despesa aprovada!' };
    },

    reject(id, actorName, motivo) {
      const appState = state();
      const expense = appState.data.despesas.find((item) => item.id === id);
      if (!expense) return { ok: false, message: 'Despesa não encontrada' };

      expense.status = 'Rejeitado';
      expense.motivoRejeicao = motivo || '';
      const fluxo = appState.data.verbas.find((item) => item.id === expense.verbaid);
      if (fluxo) fluxo.usado = Math.max(0, fluxo.usado - expense.valor);

      const colaborador = appState.data.colaboradores.find((item) => item.id === expense.colabId);
      addLog('red', `${actorName} rejeitou despesa de ${colaborador?.nome || 'colaborador'}: ${expense.estab} (R$ ${expense.valor.toFixed(2)}) — valor estornado`);
      return { ok: true, item: expense, message: 'Despesa rejeitada!' };
    },

    returnForCorrection(id, actorName, motivo) {
      const appState = state();
      const expense = appState.data.despesas.find((item) => item.id === id);
      if (!expense) return { ok: false, message: 'Despesa não encontrada' };

      expense.status = 'Devolvido';
      expense.motivoRejeicao = motivo || '';
      const fluxo = appState.data.verbas.find((item) => item.id === expense.verbaid);
      if (fluxo) fluxo.usado = Math.max(0, fluxo.usado - expense.valor);

      const colaborador = appState.data.colaboradores.find((item) => item.id === expense.colabId);
      addLog('gold', `${actorName} devolveu despesa de ${colaborador?.nome || 'colaborador'}: ${expense.estab} (R$ ${expense.valor.toFixed(2)}) para correção — valor estornado`);
      return { ok: true, item: expense, message: 'Despesa devolvida para correção!' };
    },

    resubmit(id, payload, actorName) {
      const appState = state();
      const expense = appState.data.despesas.find((item) => item.id === id);
      if (!expense) return { ok: false, message: 'Despesa não encontrada' };
      if (expense.status !== 'Devolvido') return { ok: false, message: 'Apenas despesas devolvidas podem ser reenviadas.' };

      const newValue = Number(payload.valor || expense.valor);
      if (!newValue || newValue <= 0) return { ok: false, message: 'Informe o valor da despesa.' };

      const fluxo = appState.data.verbas.find((item) => item.id === expense.verbaid);
      const saldoDisponivel = fluxo ? fluxo.total - fluxo.usado : Infinity;
      if (newValue > saldoDisponivel) return { ok: false, message: `Saldo insuficiente. Disponível: R$ ${saldoDisponivel.toFixed(2)}` };

      if (fluxo) fluxo.usado = +(fluxo.usado + newValue).toFixed(2);
      expense.valor = newValue;
      expense.estab = payload.estab || expense.estab;
      expense.data = payload.data || expense.data;
      expense.obs = payload.obs || '';
      expense.cat = payload.cat || expense.cat;
      expense.status = 'Pendente';
      expense.motivoRejeicao = '';
      expense.lancadoEm = now();

      addLog('blue', `${actorName} corrigiu e reenviou despesa: ${expense.estab} (R$ ${newValue.toFixed(2)}) — aguarda aprovação`);
      return { ok: true, item: expense, message: 'Despesa corrigida e reenviada para aprovação!' };
    },

    edit(id, payload, actorName) {
      const appState = state();
      const expense = appState.data.despesas.find((item) => item.id === id);
      if (!expense) return { ok: false, message: 'Despesa não encontrada' };

      const newValue = Number(payload.valor || expense.valor);
      const diff = newValue - expense.valor;
      const fluxo = appState.data.verbas.find((item) => item.id === expense.verbaid);
      if (fluxo && fluxo.usado + diff > fluxo.total) {
        return { ok: false, message: 'Valor excede o saldo da verba' };
      }

      if (fluxo) fluxo.usado += diff;
      expense.valor = newValue;
      expense.estab = payload.estab || expense.estab;
      expense.data = payload.data || expense.data;
      expense.obs = payload.obs || '';
      expense.cat = payload.cat || expense.cat;

      addLog('blue', `${actorName} editou despesa ${expense.estab} (novo valor: R$ ${newValue.toFixed(2)})`);
      return { ok: true, item: expense, message: 'Despesa atualizada!' };
    },
  };

  const PrestacaoService = {
    saveDraft(items) {
      const draft = clone(items || []);
      FluxoState.setUi({ rascunhoOffline: draft });
      FluxoState.save();
      return draft;
    },

    importDraft() {
      const draft = clone(state().ui.rascunhoOffline || []);
      FluxoState.setUi({ itensPrest: draft, rascunhoOffline: [] });
      FluxoRepository.clearDraft();
      FluxoState.save();
      return draft;
    },

    submit({ verbaId, obs, currentUser }) {
      const appState = state();
      const fluxo = appState.data.verbas.find((item) => item.id === verbaId);
      if (!fluxo) return { ok: false, message: 'Fluxo não encontrado' };

      const items = clone(appState.ui.itensPrest || []);
      const totalItens = items.reduce((acc, item) => acc + Number(item.valor || 0), 0);

      fluxo.usado = +(fluxo.usado + totalItens).toFixed(2);

      const prestacao = {
        id: nextId(appState.data.prestacoes),
        verbaid: verbaId,
        colabId: currentUser.colabId || fluxo.colabId,
        total: fluxo.total,
        usado: fluxo.usado,
        saldo: fluxo.total - fluxo.usado,
        data: today(),
        obs: obs || '',
        itens: items,
        aprovada: false,
      };

      appState.data.prestacoes.push(prestacao);

      const startExpenseId = nextId(appState.data.despesas);
      items.forEach((item, index) => {
        appState.data.despesas.push({
          id: startExpenseId + index,
          verbaid: verbaId,
          colabId: prestacao.colabId,
          estab: item.estab || item.desc || 'Comprovante',
          cat: item.cat || 'outros',
          valor: Number(item.valor || 0),
          data: item.data || today(),
          status: 'Pendente',
          obs: item.obs || '',
          origemPrestacaoId: prestacao.id,
          politicaExcesso: item.politicaExcesso || null,
          justificativa: item.justificativa || '',
        });
      });

      addLog('blue', `${currentUser.name} enviou prestação de ${fluxo.motivo} (${items.length} comprovantes, R$ ${totalItens.toFixed(2)})`);

      FluxoState.resetUiPrestacao();
      FluxoState.setUi({ rascunhoOffline: [] });
      FluxoRepository.clearDraft();
      FluxoState.save();

      return { ok: true, item: prestacao, message: 'Prestação enviada ao gestor!' };
    },

    approve(id, actorName) {
      const prestacao = state().data.prestacoes.find((item) => item.id === id);
      if (!prestacao) return { ok: false, message: 'Prestação não encontrada' };

      prestacao.aprovada = true;
      addLog('green', `${actorName} aprovou prestação #${id}`);
      return { ok: true, item: prestacao, message: 'Prestação aprovada!' };
    },
  };

  return {
    addLog,
    AuthService,
    PolicyService,
    ColaboradorService,
    FluxoService,
    DespesaService,
    PrestacaoService,
  };
})();

export default FluxoBusiness;
