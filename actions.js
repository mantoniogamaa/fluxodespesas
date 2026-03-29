import FluxoRepository from './repository.js';
export function createActions({
  FluxoState,
  FluxoBusiness,
  CATEGORIES,
  COLORS,
  DEFAULT_POLICY,
  byId,
  currency,
  categoryLabel,
  App,
  auth,
  data,
  ui,
  currentUser,
  getColab,
  getFluxo,
  showToast,
  closeModal,
  openModal,
  persist,
  renderAll,
  renderPrestacao,
  renderCategoriaChips,
  renderEnviarPrestResumo,
  hydrateFluxoModal,
  updateFluxoPreview,
  renderAvatarPicker,
  resetColabForm,
  fillColabForm,
}) {

async function handleLogin() {
      const result = await FluxoBusiness.AuthService.login({
        email: byId('auth-email')?.value || '',
        senha: byId('auth-pass')?.value || '',
        currentRole: auth().currentRole,
      });
      if (!result.ok) {
        showToast(result.message, 'error');
        return;
      }
      if (result.cloud) {
        try {
          const remoteState = await FluxoRepository.hydrateRemote();
          if (remoteState) FluxoState.hydrateRemote(remoteState);
          const remoteDraft = await FluxoRepository.hydrateRemoteDraft();
          if (remoteDraft?.length) FluxoState.setRemoteDraft(remoteDraft);
        } catch (error) {
          console.error('Cloud hydrate error', error);
          showToast('Login ok, mas a carga do Supabase falhou', 'warning');
        }
      }
      showToast(`Bem-vindo, ${result.user.name}!`, 'success');
      App.currentPage = 'dashboard';
      renderAll();
    }

async function handleLogout() {
      await FluxoBusiness.AuthService.logout();
      closeSidebar();
      renderAll();
    }

function handleAddPrestItem() {
      const valor = Number(byId('pi-valor')?.value || 0);
      const dataDespesa = byId('pi-data')?.value || new Date().toISOString().slice(0, 10);
      const estab = (byId('pi-desc')?.value || '').trim();
      const horario = byId('pi-hora')?.value || '';
      const justificativa = (byId('pi-justificativa')?.value || '').trim();
      const editIdx = Number(byId('pi-edit-idx')?.value || -1);
      const cat = ui().catSelecionada;
      if (!cat) return showToast('Selecione uma categoria', 'warning');
      if (!valor) return showToast('Informe o valor da despesa', 'warning');
      if (!estab) return showToast('Descreva a despesa', 'warning');
      const policyCheck = FluxoBusiness.PolicyService.checkLimit(data().politica, cat, valor, horario);
      if (policyCheck && !justificativa) return showToast('Despesa acima do limite precisa de justificativa', 'warning');

      const item = {
        cat,
        valor,
        data: dataDespesa,
        estab,
        desc: estab,
        horario,
        justificativa,
        fotoUrl: ui().fotoPrestUrl,
        politicaExcesso: policyCheck,
      };
      const items = [...ui().itensPrest];
      if (editIdx >= 0) items[editIdx] = item; else items.push(item);
      FluxoBusiness.PrestacaoService.saveDraft(items);
      FluxoState.setUi({ itensPrest: items, fotoPrestUrl: null, catSelecionada: null });
      byId('pi-edit-idx').value = '-1';
      byId('pi-valor').value = '';
      byId('pi-desc').value = '';
      byId('pi-justificativa').value = '';
      byId('prest-img-preview').src = '';
      byId('prest-foto-preview').style.display = 'none';
      closeModal('modal-item-prest');
      persist();
      showToast(editIdx >= 0 ? 'Item atualizado no rascunho' : 'Item adicionado ao rascunho');
    }

function handleConfirmPrestacao() {
      if (!ui().itensPrest.length) return showToast('Adicione itens antes de enviar', 'warning');
      const verbaId = Number(ui().verbaSelecionadaId || byId('prest-fluxo-select')?.value || 0);
      const result = FluxoBusiness.PrestacaoService.submit({ verbaId, obs: byId('pv-obs')?.value || '', currentUser: currentUser() });
      if (!result.ok) return showToast(result.message, 'error');
      closeModal('modal-enviar-prest');
      byId('pv-obs').value = '';
      persist();
      showToast(result.message, 'success');
      App.currentPage = 'historico';
      renderAll();
    }

function handleCreateFluxo() {
      const payload = {
        colabId: Number(byId('mv-colab')?.value || 0),
        motivo: byId('mv-motivo')?.value || '',
        total: Number(byId('mv-valor')?.value || 0),
        dataInicio: byId('mv-data')?.value || new Date().toISOString().slice(0, 10),
      };
      const actor = currentUser()?.name || 'Sistema';
      const result = FluxoBusiness.FluxoService.create(payload, actor);
      if (!result.ok) return showToast(result.message, 'error');
      closeModal('modal-verba');
      ['mv-motivo','mv-valor'].forEach((id) => byId(id).value = '');
      persist();
      showToast(result.message, 'success');
      App.currentPage = 'verbas';
      renderAll();
    }

function handleSaveColab() {
      const payload = {
        id: byId('colab-edit-id')?.value || '',
        nome: byId('colab-nome')?.value || '',
        dept: byId('colab-dept')?.value || '',
        email: byId('colab-email')?.value || '',
        telefone: byId('colab-telefone')?.value || '',
        cpf: byId('colab-cpf')?.value || '',
        cargo: byId('colab-cargo')?.value || '',
        cc: byId('colab-cc')?.value || '',
        senha: byId('colab-senha')?.value || '',
        status: byId('colab-status')?.value || 'ativo',
        color: App.selectedAvatarColor,
      };
      const result = FluxoBusiness.ColaboradorService.save(payload, currentUser()?.name || 'Sistema');
      if (!result.ok) return showToast(result.message, 'error');
      closeModal('modal-colab');
      resetColabForm();
      persist();
      showToast(result.message, 'success');
    }

function handleSavePolitica() {
      const nextPolicy = JSON.parse(JSON.stringify(data().politica || DEFAULT_POLICY));
      qsa('[data-policy-field]').forEach((input) => {
        const path = input.dataset.policyField.split('.');
        let pointer = nextPolicy;
        while (path.length > 1) {
          pointer = pointer[path.shift()];
        }
        pointer[path[0]] = Number(input.value || 0);
      });
      const result = FluxoBusiness.PolicyService.saveLimits(nextPolicy, currentUser()?.name || 'Sistema');
      data().politica = result;
      persist();
      showToast('Política atualizada', 'success');
    }

function handleSaveEdit() {
      const id = Number(byId('edit-id')?.value || 0);
      const catLabel = byId('edit-cat')?.value || 'Outros';
      const cat = CATEGORIES.find((item) => item.label === catLabel)?.id || 'outros';
      const result = FluxoBusiness.DespesaService.edit(id, {
        estab: byId('edit-estab')?.value || '',
        valor: Number(byId('edit-valor')?.value || 0),
        data: byId('edit-data')?.value || '',
        cat,
        obs: byId('edit-obs')?.value || '',
      }, currentUser()?.name || 'Sistema');
      if (!result.ok) return showToast(result.message, 'error');
      closeModal('modal-editar');
      persist();
      showToast(result.message, 'success');
    }

function handleApproveExpense(id) {
      const result = FluxoBusiness.DespesaService.approve(Number(id), currentUser()?.name || 'Sistema');
      if (!result.ok) return showToast(result.message, 'error');
      persist();
      showToast(result.message, 'success');
    }

function handleRejectExpense(id) {
      const result = FluxoBusiness.DespesaService.reject(Number(id), currentUser()?.name || 'Sistema');
      if (!result.ok) return showToast(result.message, 'error');
      persist();
      showToast(result.message, 'warning');
    }

function openEditExpense(id) {
      const item = data().despesas.find((despesa) => Number(despesa.id) === Number(id));
      if (!item) return;
      byId('edit-id').value = item.id;
      byId('edit-estab').value = item.estab;
      byId('edit-valor').value = item.valor;
      byId('edit-data').value = item.data;
      byId('edit-cat').value = categoryLabel(item.cat);
      byId('edit-obs').value = item.obs || '';
      openModal('modal-editar');
    }

function openPrestModal() {
      renderCategoriaChips();
      byId('pi-edit-idx').value = '-1';
      byId('pi-valor').value = '';
      byId('pi-data').value = new Date().toISOString().slice(0, 10);
      byId('pi-hora').value = '';
      byId('pi-desc').value = '';
      byId('pi-justificativa').value = '';
      FluxoState.setUi({ catSelecionada: null, fotoPrestUrl: null });
      byId('prest-foto-preview').style.display = 'none';
      verifyPolicy();
      openModal('modal-item-prest');
    }

function verifyPolicy() {
      const wrapper = byId('politica-aviso');
      const title = byId('politica-aviso-title-txt');
      const body = byId('politica-aviso-body');
      const val = Number(byId('pi-valor')?.value || 0);
      const cat = ui().catSelecionada;
      const hora = byId('pi-hora')?.value || '';
      const check = FluxoBusiness.PolicyService.checkLimit(data().politica, cat, val, hora);
      if (!wrapper) return;
      if (!check) {
        wrapper.classList.remove('show');
        return;
      }
      wrapper.classList.add('show');
      title.textContent = 'Despesa acima do limite';
      body.textContent = `Limite permitido: ${currency(check.limite)}${check.subLabel ? ` (${check.subLabel})` : ''}. Excesso atual: ${currency(check.excesso)}.`;
    }

  return {
    handleLogin,
    handleLogout,
    handleAddPrestItem,
    handleConfirmPrestacao,
    handleCreateFluxo,
    handleSaveColab,
    handleSavePolitica,
    handleSaveEdit,
    handleApproveExpense,
    handleRejectExpense,
    openEditExpense,
    openPrestModal,
    verifyPolicy,
  };
}
