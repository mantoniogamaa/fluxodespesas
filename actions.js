import FluxoRepository from './repository.js';
export function createActions({
  FluxoState,
  FluxoBusiness,
  CATEGORIES,
  COLORS,
  DEFAULT_POLICY,
  isSupabaseEnabled,
  byId,
  qsa,
  currency,
  setLoading,
  clearLoading,
  categoryLabel,
  escapeHtml,
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
  closeSidebar,
}) {

async function syncFromSupabase() {
  try {
    const { loadFullState } = await import('./supabase-service.js');
    const remoteState = await loadFullState();
    if (remoteState) FluxoState.hydrateRemote(remoteState);
  } catch (err) {
    console.error('Supabase sync error', err);
  }
}

async function handleLogin() {
      setLoading?.('Autenticando...');
      try {
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
            setLoading?.('Carregando dados...');
            const remoteState = await FluxoRepository.hydrateRemote();
            if (remoteState) FluxoState.hydrateRemote(remoteState);
            const remoteDraft = await FluxoRepository.hydrateRemoteDraft();
            if (remoteDraft?.length) FluxoState.setRemoteDraft(remoteDraft);
          } catch (error) {
            console.error('Cloud hydrate error', error);
            showToast('Login ok, mas a carga do servidor falhou', 'warning');
          }
        }
        showToast(`Bem-vindo, ${result.user.name}!`, 'success');
        App.currentPage = 'dashboard';
        renderAll();
      } finally {
        clearLoading?.();
      }
    }

async function handleLogout() {
      await FluxoBusiness.AuthService.logout();
      closeSidebar();
      renderAll();
    }

async function handleAddPrestItem() {
      const valor = Number(byId('pi-valor')?.value || 0);
      const dataDespesa = byId('pi-data')?.value || new Date().toISOString().slice(0, 10);
      const estab = (byId('pi-desc')?.value || '').trim();
      const horario = byId('pi-hora')?.value || '';
      const justificativa = (byId('pi-justificativa')?.value || '').trim();
      const cat = ui().catSelecionada;
      const tipoRef = ui().refeicaoTipo || null;
      const centroCusto = (byId('pi-cc')?.value || '').trim();

      if (!cat) return showToast('Selecione uma categoria', 'warning');
      if (!valor) return showToast('Informe o valor da despesa', 'warning');
      if (!estab) return showToast('Informe o estabelecimento', 'warning');

      const policyCheck = FluxoBusiness.PolicyService.checkLimit(data().politica, cat, valor, horario, tipoRef);
      if (policyCheck && !justificativa) return showToast('Despesa acima do limite — informe a justificativa', 'warning');

      const verbaId = Number(byId('prest-fluxo-select')?.value || ui().verbaSelecionadaId || 0);
      const fluxo = data().verbas.find((v) => Number(v.id) === verbaId);
      const colabId = fluxo?.colabId || currentUser()?.colabId;

      const result = FluxoBusiness.DespesaService.submitSingle({
        verbaId,
        colabId,
        estab,
        cat,
        valor,
        data: dataDespesa,
        horario,
        tipoRefeicao: tipoRef,
        centroCusto,
        justificativa,
        fotoUrl: ui().fotoPrestUrl,
        politicaExcesso: policyCheck,
      }, currentUser()?.name || 'Colaborador');

      if (!result.ok) return showToast(result.message, 'error');

      FluxoState.setUi({ fotoPrestUrl: null, catSelecionada: null, refeicaoTipo: null });
      byId('pi-valor').value = '';
      byId('pi-desc').value = '';
      if (byId('pi-cc')) byId('pi-cc').value = '';
      byId('pi-justificativa').value = '';
      byId('prest-img-preview').src = '';
      byId('prest-foto-preview').style.display = 'none';
      const ocrArea = byId('prest-ocr-area');
      if (ocrArea) ocrArea.style.display = 'none';
      closeModal('modal-item-prest');

      if (isSupabaseEnabled()) {
        setLoading?.('Enviando despesa...');
        try {
          const { saveDespesa, saveFluxo } = await import('./supabase-service.js');
          await saveDespesa({
            fluxo_id: verbaId,
            estabelecimento: estab,
            categoria: cat,
            valor,
            data_despesa: dataDespesa,
            horario: horario || null,
            centro_custo: centroCusto || null,
            foto_url: ui().fotoPrestUrl || null,
            justificativa: justificativa || null,
          }, colabId);
          if (fluxo) {
            await saveFluxo({
              id: verbaId,
              colaborador_id: colabId,
              motivo: fluxo.motivo,
              total: fluxo.total,
              usado: fluxo.usado,
              status: fluxo.status,
              data_inicio: fluxo.dataInicio,
            }, currentUser()?.userId);
          }
          await syncFromSupabase();
        } catch (err) {
          console.error('Supabase saveDespesa error', err);
          showToast('Salvo localmente — erro ao sincronizar', 'warning');
        } finally {
          clearLoading?.();
        }
      }

      persist();
      showToast(result.message, 'success');
      renderAll();
    }

async function handleConfirmPrestacao() {
      if (!ui().itensPrest.length) return showToast('Adicione itens antes de enviar', 'warning');
      const verbaId = Number(ui().verbaSelecionadaId || byId('prest-fluxo-select')?.value || 0);
      const itensParaSalvar = [...ui().itensPrest];
      const fluxo = data().verbas.find(v => Number(v.id) === verbaId);
      const colabId = fluxo?.colabId;
      const result = FluxoBusiness.PrestacaoService.submit({ verbaId, obs: byId('pv-obs')?.value || '', currentUser: currentUser() });
      if (!result.ok) return showToast(result.message, 'error');
      closeModal('modal-enviar-prest');
      byId('pv-obs').value = '';
      if (isSupabaseEnabled()) {
        setLoading?.('Enviando prestação...');
        try {
          const { saveDespesa, saveFluxo } = await import('./supabase-service.js');
          for (const item of itensParaSalvar) {
            await saveDespesa({
              fluxo_id: verbaId,
              estabelecimento: item.estab || item.desc || 'Comprovante',
              categoria: item.cat || 'outros',
              valor: item.valor,
              data_despesa: item.data,
              horario: item.horario || null,
              observacao: item.obs || null,
              foto_url: item.fotoUrl || null,
              justificativa: item.justificativa || null,
            }, colabId);
          }
          if (fluxo) {
            await saveFluxo({
              id: verbaId,
              colaborador_id: colabId,
              motivo: fluxo.motivo,
              total: fluxo.total,
              usado: result.item.usado,
              status: 'encerrada',
              data_inicio: fluxo.dataInicio,
            }, currentUser()?.userId);
          }
          await syncFromSupabase();
        } catch (err) {
          console.error('Supabase prestacao error', err);
          showToast('Enviado — erro ao sincronizar com servidor', 'warning');
        } finally {
          clearLoading?.();
        }
      }
      persist();
      showToast(result.message, 'success');
      App.currentPage = 'historico';
      renderAll();
    }

async function handleCreateFluxo() {
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
      if (isSupabaseEnabled()) {
        setLoading?.('Salvando crédito...');
        try {
          const { saveFluxo } = await import('./supabase-service.js');
          await saveFluxo({
            colaborador_id: payload.colabId,
            motivo: payload.motivo,
            total: payload.total,
            data_inicio: payload.dataInicio,
          }, currentUser()?.userId);
          await syncFromSupabase();
        } catch (err) {
          console.error('Supabase saveFluxo error', err);
          showToast('Salvo — erro ao sincronizar com servidor', 'warning');
        } finally {
          clearLoading?.();
        }
      }
      persist();
      showToast(result.message, 'success');
      App.currentPage = 'verbas';
      renderAll();
    }

async function handleSaveColab() {
      const payload = {
        id: byId('colab-edit-id')?.value || '',
        nome: byId('colab-nome')?.value || '',
        dept: byId('colab-dept')?.value || '',
        email: byId('colab-email')?.value || '',
        telefone: byId('colab-telefone')?.value || '',
        cpf: byId('colab-cpf')?.value || '',
        cargo: byId('colab-cargo')?.value || '',
        cc: byId('colab-cc')?.value || '',
        pix: byId('colab-pix')?.value || '',
        politicaId: byId('colab-politica')?.value || '',
        senha: byId('colab-senha')?.value || '',
        status: byId('colab-status')?.value || 'ativo',
        color: App.selectedAvatarColor,
      };
      const result = FluxoBusiness.ColaboradorService.save(payload, currentUser()?.name || 'Sistema');
      if (!result.ok) return showToast(result.message, 'error');
      closeModal('modal-colab');
      resetColabForm();
      if (isSupabaseEnabled()) {
        setLoading?.('Salvando colaborador...');
        try {
          const { saveColaborador } = await import('./supabase-service.js');
          const supaPayload = {
            nome: payload.nome,
            email: payload.email,
            telefone: payload.telefone || null,
            cpf: payload.cpf || null,
            cargo: payload.cargo || null,
            chave_pix: payload.pix || null,
            avatar_color: payload.color || '#4F7CFF',
            status: payload.status || 'ativo',
            departamento_id: result.item._departamento_id || null,
            centro_custo_id: result.item._centro_custo_id || null,
            politica_id: result.item._politica_id || null,
          };
          if (payload.id) supaPayload.id = Number(payload.id);
          await saveColaborador(supaPayload);
          await syncFromSupabase();
        } catch (err) {
          console.error('Supabase saveColaborador error', err);
          showToast('Salvo — erro ao sincronizar com servidor', 'warning');
        } finally {
          clearLoading?.();
        }
      }
      persist();
      showToast(result.message, 'success');
    }

async function persistPolitica(nextPolicy) {
      const result = FluxoBusiness.PolicyService.saveLimits(nextPolicy, currentUser()?.name || 'Sistema');
      data().politica = result;
      if (isSupabaseEnabled()) {
        try {
          const { savePolitica } = await import('./supabase-service.js');
          const politicas = data()._politicas || [];
          const politicaPadrao = politicas.find(p => /^padr[aã]o$/i.test(p.nome || '')) || politicas[0];
          if (politicaPadrao?.id) {
            await savePolitica({ ...politicaPadrao, limites: nextPolicy });
          } else {
            await savePolitica({ nome: 'Padrão', limites: nextPolicy, ativo: true });
          }
          await syncFromSupabase();
        } catch (err) {
          console.error('Supabase savePolitica error', err);
          persist();
          showToast('Falha ao sincronizar a política com o servidor — a alteração pode não persistir', 'error');
          return false;
        }
      }
      persist();
      return true;
    }

async function handleSavePolitica() {
      const nextPolicy = JSON.parse(JSON.stringify(data().politica || DEFAULT_POLICY));
      qsa('[data-policy-field]').forEach((input) => {
        const path = input.dataset.policyField.split('.');
        let pointer = nextPolicy;
        while (path.length > 1) {
          pointer = pointer[path.shift()];
        }
        pointer[path[0]] = Number(input.value || 0);
      });
      const ok = await persistPolitica(nextPolicy);
      if (ok) showToast('Política atualizada', 'success');
    }

async function handleTogglePolitica(cat) {
      const current = data().politica || DEFAULT_POLICY;
      if (!current[cat]) return;
      const nextPolicy = JSON.parse(JSON.stringify(current));
      nextPolicy[cat].ativo = !nextPolicy[cat].ativo;
      await persistPolitica(nextPolicy);
      renderAll();
    }

async function handleSaveEdit() {
      const id = Number(byId('edit-id')?.value || 0);
      const catLabel = byId('edit-cat')?.value || 'Outros';
      const cat = CATEGORIES.find((item) => item.label === catLabel)?.id || 'outros';
      const payload = {
        estab: byId('edit-estab')?.value || '',
        valor: Number(byId('edit-valor')?.value || 0),
        data: byId('edit-data')?.value || '',
        cat,
        obs: byId('edit-obs')?.value || '',
      };
      const result = FluxoBusiness.DespesaService.edit(id, payload, currentUser()?.name || 'Sistema');
      if (!result.ok) return showToast(result.message, 'error');
      closeModal('modal-editar');
      if (isSupabaseEnabled()) {
        try {
          const { saveDespesa } = await import('./supabase-service.js');
          await saveDespesa({
            id,
            estabelecimento: payload.estab,
            categoria: payload.cat,
            valor: payload.valor,
            data_despesa: payload.data,
            observacao: payload.obs || null,
          }, result.item.colabId);
          await syncFromSupabase();
        } catch (err) {
          console.error('Supabase saveDespesa error', err);
        }
      }
      persist();
      showToast(result.message, 'success');
    }

async function handleApproveExpense(id) {
      const result = FluxoBusiness.DespesaService.approve(Number(id), currentUser()?.name || 'Sistema');
      if (!result.ok) return showToast(result.message, 'error');
      if (isSupabaseEnabled()) {
        setLoading?.('Aprovando...');
        try {
          const { aprovarDespesa } = await import('./supabase-service.js');
          await aprovarDespesa(Number(id), currentUser()?.userId);
          await syncFromSupabase();
        } catch (err) {
          console.error('Supabase aprovarDespesa error', err);
        } finally {
          clearLoading?.();
        }
      }
      persist();
      showToast(result.message, 'success');
      renderAll();
    }

async function syncFluxoAfterEstorno(despesa) {
      const fluxo = data().verbas.find(v => Number(v.id) === Number(despesa.verbaid));
      if (!fluxo) return;
      const { saveFluxo } = await import('./supabase-service.js');
      await saveFluxo({
        id: fluxo.id,
        colaborador_id: fluxo.colabId,
        motivo: fluxo.motivo,
        total: fluxo.total,
        usado: fluxo.usado,
        status: fluxo.status,
        data_inicio: fluxo.dataInicio,
      }, currentUser()?.userId);
    }

async function handleRejectExpense(id, motivo) {
      const result = FluxoBusiness.DespesaService.reject(Number(id), currentUser()?.name || 'Sistema', motivo);
      if (!result.ok) return showToast(result.message, 'error');
      if (isSupabaseEnabled()) {
        setLoading?.('Rejeitando...');
        try {
          const { rejeitarDespesa } = await import('./supabase-service.js');
          await rejeitarDespesa(Number(id), currentUser()?.userId, motivo || null);
          await syncFluxoAfterEstorno(result.item);
          await syncFromSupabase();
        } catch (err) {
          console.error('Supabase rejeitarDespesa error', err);
        } finally {
          clearLoading?.();
        }
      }
      persist();
      showToast(result.message, 'warning');
      renderAll();
    }

async function handleReturnExpense(id, motivo) {
      const result = FluxoBusiness.DespesaService.returnForCorrection(Number(id), currentUser()?.name || 'Sistema', motivo);
      if (!result.ok) return showToast(result.message, 'error');
      if (isSupabaseEnabled()) {
        setLoading?.('Devolvendo...');
        try {
          const { devolverDespesa } = await import('./supabase-service.js');
          await devolverDespesa(Number(id), currentUser()?.userId, motivo || null);
          await syncFluxoAfterEstorno(result.item);
          await syncFromSupabase();
        } catch (err) {
          console.error('Supabase devolverDespesa error', err);
        } finally {
          clearLoading?.();
        }
      }
      persist();
      showToast(result.message, 'warning');
      renderAll();
    }

function abrirDecisaoDespesa(id, tipo) {
      byId('decisao-id').value = id;
      byId('decisao-tipo').value = tipo;
      byId('decisao-motivo').value = '';
      const isDevolver = tipo === 'devolver';
      byId('decisao-titulo').textContent = isDevolver ? 'Devolver Despesa' : 'Rejeitar Despesa';
      byId('decisao-subtitulo').textContent = isDevolver
        ? 'Explique o que precisa ser corrigido — o colaborador poderá editar e reenviar.'
        : 'Recusa definitiva. Informe o motivo — o colaborador será notificado.';
      byId('decisao-confirmar-btn').textContent = isDevolver ? 'Devolver' : 'Rejeitar';
      openModal('modal-decisao-despesa');
    }

async function confirmarDecisaoDespesa() {
      const id = Number(byId('decisao-id')?.value || 0);
      const tipo = byId('decisao-tipo')?.value || 'rejeitar';
      const motivo = (byId('decisao-motivo')?.value || '').trim();
      if (!motivo) return showToast('Informe o motivo para continuar.', 'error');
      closeModal('modal-decisao-despesa');
      if (tipo === 'devolver') await handleReturnExpense(id, motivo);
      else await handleRejectExpense(id, motivo);
    }

function abrirReenvioDespesa(id) {
      const item = data().despesas.find((despesa) => Number(despesa.id) === Number(id));
      if (!item) return;
      byId('reenviar-id').value = item.id;
      byId('reenviar-estab').value = item.estab;
      byId('reenviar-valor').value = item.valor;
      byId('reenviar-data').value = item.data;
      byId('reenviar-cat').value = categoryLabel(item.cat);
      byId('reenviar-obs').value = item.obs || '';
      byId('reenviar-motivo-display').textContent = item.motivoRejeicao
        ? `Motivo da devolução: ${item.motivoRejeicao}`
        : 'Ajuste os dados antes de reenviar para aprovação.';
      openModal('modal-reenviar');
    }

async function confirmarReenvioDespesa() {
      const id = Number(byId('reenviar-id')?.value || 0);
      const catLabel = byId('reenviar-cat')?.value || 'Outros';
      const cat = CATEGORIES.find((item) => item.label === catLabel)?.id || 'outros';
      const payload = {
        estab: byId('reenviar-estab')?.value || '',
        valor: Number(byId('reenviar-valor')?.value || 0),
        data: byId('reenviar-data')?.value || '',
        cat,
        obs: byId('reenviar-obs')?.value || '',
      };
      const result = FluxoBusiness.DespesaService.resubmit(id, payload, currentUser()?.name || 'Sistema');
      if (!result.ok) return showToast(result.message, 'error');
      closeModal('modal-reenviar');
      if (isSupabaseEnabled()) {
        setLoading?.('Reenviando...');
        try {
          const { reenviarDespesa, saveFluxo } = await import('./supabase-service.js');
          await reenviarDespesa(id, payload);
          const fluxo = data().verbas.find(v => Number(v.id) === Number(result.item.verbaid));
          if (fluxo) {
            await saveFluxo({
              id: fluxo.id,
              colaborador_id: fluxo.colabId,
              motivo: fluxo.motivo,
              total: fluxo.total,
              usado: fluxo.usado,
              status: fluxo.status,
              data_inicio: fluxo.dataInicio,
            }, currentUser()?.userId);
          }
          await syncFromSupabase();
        } catch (err) {
          console.error('Supabase reenviarDespesa error', err);
        } finally {
          clearLoading?.();
        }
      }
      persist();
      showToast(result.message, 'success');
      renderAll();
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
      const nowT = new Date();
      byId('pi-hora').value = `${String(nowT.getHours()).padStart(2,'0')}:${String(nowT.getMinutes()).padStart(2,'0')}`;
      byId('pi-desc').value = '';
      byId('pi-justificativa').value = '';
      FluxoState.setUi({ catSelecionada: null, fotoPrestUrl: null, refeicaoTipo: null });
      const refRow = document.getElementById('pi-tipo-refeicao');
      if (refRow) refRow.style.display = 'none';
      const policyInfo = document.getElementById('pi-policy-info');
      if (policyInfo) policyInfo.classList.remove('show');
      byId('prest-foto-preview').style.display = 'none';
      byId('prest-img-preview').src = '';
      const ocrArea = byId('prest-ocr-area');
      if (ocrArea) ocrArea.style.display = 'none';

      // Info do fluxo selecionado no topo do modal
      const verbaId = Number(byId('prest-fluxo-select')?.value || ui().verbaSelecionadaId || 0);
      const fluxo = data().verbas.find((v) => Number(v.id) === verbaId);
      const nomeEl = byId('pi-fluxo-nome');
      const saldoEl = byId('pi-fluxo-saldo');
      if (nomeEl) nomeEl.textContent = fluxo?.motivo || '—';
      if (saldoEl) {
        const s = fluxo ? Math.max(fluxo.total - fluxo.usado, 0) : 0;
        saldoEl.textContent = fluxo ? `R$ ${s.toFixed(2).replace('.',',')}` : '—';
      }
      const fluxoInfoEl = byId('pi-fluxo-info');
      if (fluxoInfoEl) fluxoInfoEl.style.display = fluxo ? 'flex' : 'none';

      // Preencher Centro de Custo com padrão do colaborador
      const ccSel = byId('pi-cc');
      if (ccSel) {
        const ccs = data()._centrosCusto || [];
        const colab = data().colaboradores.find((c) => Number(c.id) === Number(currentUser()?.colabId));
        const defaultCc = colab?.cc || '';
        if (ccs.length) {
          ccSel.innerHTML = '<option value="">Selecione...</option>' +
            ccs.filter(c => c.ativo !== false).map(c => `<option value="${c.codigo}" ${c.codigo === defaultCc ? 'selected' : ''}>${escapeHtml(c.codigo)} — ${escapeHtml(c.nome)}</option>`).join('');
        } else if (defaultCc) {
          ccSel.innerHTML = `<option value="${defaultCc}" selected>${defaultCc}</option>`;
        }
      }

      verifyPolicy();
      openModal('modal-item-prest');
    }

function verifyPolicy() {
      const wrapper = byId('politica-aviso');
      const title   = byId('politica-aviso-title-txt');
      const body    = byId('politica-aviso-body');
      const val     = Number(byId('pi-valor')?.value || 0);
      const cat     = ui().catSelecionada;
      const hora    = byId('pi-hora')?.value || '';
      const tipoRef = ui().refeicaoTipo || null;
      const check   = FluxoBusiness.PolicyService.checkLimit(data().politica, cat, val, hora, tipoRef);

      // Mostrar info de limite proativamente
      _updatePolicyInfo(cat, tipoRef);

      if (!wrapper) return;
      if (!check) { wrapper.classList.remove('show'); return; }
      wrapper.classList.add('show');
      title.textContent = 'Despesa acima do limite';
      body.textContent = `Limite permitido: ${currency(check.limite)}${check.subLabel ? ` (${check.subLabel})` : ''}. Excesso: ${currency(check.excesso)}.`;
    }

    function _updatePolicyInfo(cat, tipoRef) {
      const strip  = byId('pi-policy-info');
      const txt    = byId('pi-policy-info-txt');
      if (!strip || !txt) return;
      if (!cat) { strip.classList.remove('show'); return; }
      const pol    = data().politica || DEFAULT_POLICY;
      const config = pol[cat];
      if (!config || !config.ativo) { strip.classList.remove('show'); return; }
      let info = '';
      if (cat === 'alimentacao') {
        if (tipoRef && config[tipoRef]) {
          info = `Limite ${tipoRef === 'almoco' ? 'almoço' : tipoRef === 'jantar' ? 'jantar' : 'outro horário'}: ${currency(config[tipoRef].limite)}`;
        } else {
          const a = config.almoco?.limite, j = config.jantar?.limite;
          info = `Almoço: ${currency(a)} · Jantar: ${currency(j)}`;
        }
      } else {
        info = `Limite desta categoria: ${currency(config.limite)}`;
      }
      txt.textContent = info;
      strip.classList.add('show');
    }


async function handleSaveUsuario() {
      const id = byId('usuario-edit-id')?.value || '';
      const nome = (byId('usuario-nome')?.value || '').trim();
      const email = (byId('usuario-email')?.value || '').trim();
      const role = byId('usuario-role')?.value || 'gerente';
      const senha = byId('usuario-senha')?.value || '';
      const ativo = byId('usuario-status')?.value !== 'false';

      if (!nome) return showToast('Informe o nome', 'error');
      if (!email || !email.includes('@')) return showToast('Informe um e-mail válido', 'error');
      if (!id && !senha) return showToast('Defina uma senha', 'error');
      if (senha && senha.length < 6) return showToast('Senha deve ter mínimo 6 caracteres', 'error');

      try {
        const { createSupabaseUsuario, updateSupabaseUsuario } = await import('./supabase-service.js');
        if (id) {
          await updateSupabaseUsuario(id, { nome, role, ativo });
          closeModal('modal-usuario');
          resetUsuarioForm();
          await syncFromSupabase();
          showToast('Usuário atualizado!', 'success');
          renderAll();
        } else {
          setLoading?.('Criando usuário...');
          await createSupabaseUsuario({ email, senha, nome, role });
          closeModal('modal-usuario');
          resetUsuarioForm();
          await syncFromSupabase();
          showToast(`Usuário ${nome} criado com sucesso!`, 'success');
          renderAll();
        }
      } catch (err) {
        showToast(err.message || 'Erro ao salvar usuário', 'error');
      } finally {
        clearLoading?.();
      }
    }

function resetUsuarioForm() {
      byId('modal-usuario-title').textContent = 'Novo Usuário';
      byId('usuario-edit-id').value = '';
      ['usuario-nome','usuario-email','usuario-senha'].forEach(id => { if(byId(id)) byId(id).value = ''; });
      if(byId('usuario-role')) byId('usuario-role').value = 'gerente';
      if(byId('usuario-status')) byId('usuario-status').value = 'true';
    }

function preencherUsuarioForm(id) {
      const usuarios = FluxoState.get()?.data?._usuarios || [];
      const u = usuarios.find(x => x.id === id);
      if (!u) return;
      byId('modal-usuario-title').textContent = 'Editar Usuário';
      byId('usuario-edit-id').value = u.id;
      byId('usuario-nome').value = u.nome || '';
      byId('usuario-email').value = u.email || '';
      byId('usuario-senha').value = '';
      if(byId('usuario-role')) byId('usuario-role').value = u.role || 'gerente';
      if(byId('usuario-status')) byId('usuario-status').value = String(u.ativo !== false);
    }

  async function handleSaveNovaPolitica() {
    const nome = byId('np-nome')?.value?.trim();
    if (!nome) return showToast('Informe o nome da política', 'error');
    const limites = {
      alimentacao: { ativo: true, almoco: { label: 'Almoço (11h–15h)', limite: Number(byId('np-alimentacao')?.value || 55) }, jantar: { label: 'Jantar (18h–22h)', limite: Number(byId('np-alimentacao')?.value || 55) }, outros: { label: 'Outros horários', limite: Number(byId('np-alimentacao')?.value || 40) } },
      hospedagem:  { ativo: true, limite: Number(byId('np-hospedagem')?.value || 250) },
      combustivel: { ativo: true, limite: Number(byId('np-combustivel')?.value || 200) },
      uber:        { ativo: true, limite: Number(byId('np-uber')?.value || 80) },
      transporte:  { ativo: true, limite: Number(byId('np-transporte')?.value || 120) },
      passagem:    { ativo: true, limite: Number(byId('np-passagem')?.value || 800) },
      pedagio:     { ativo: true, limite: Number(byId('np-pedagio')?.value || 50) },
      material:    { ativo: false, limite: Number(byId('np-material')?.value || 300) },
      estacion:    { ativo: true, limite: 80 },
      outros:      { ativo: false, limite: 100 },
    };
    const politicas = data()._politicas || [];
    if (politicas.find(p => p.nome.toLowerCase() === nome.toLowerCase())) {
      return showToast('Já existe uma política com este nome', 'error');
    }
    closeModal('modal-nova-politica');
    ['np-nome','np-alimentacao','np-hospedagem','np-combustivel','np-uber','np-transporte','np-passagem','np-pedagio','np-material','np-obs'].forEach(id => { const el = byId(id); if(el) el.value = ''; });
    if (isSupabaseEnabled()) {
      try {
        const { savePolitica } = await import('./supabase-service.js');
        await savePolitica({ nome, limites, ativo: true });
        await syncFromSupabase();
      } catch (err) {
        console.error('Supabase savePolitica error', err);
        showToast('Erro ao salvar política', 'error');
        return;
      }
    } else {
      const nova = { id: Date.now(), nome, limites, ativo: true };
      FluxoState.hydrateRemote({ data: { _politicas: [...politicas, nova] } });
      FluxoState.save();
    }
    showToast('Política "' + nome + '" criada com sucesso!', 'success');
    renderAll();
  }

  async function handleSaveCentroCusto() {
    const id     = byId('cc-edit-id')?.value || '';
    const codigo = (byId('cc-codigo')?.value || '').trim().toUpperCase();
    const nome   = (byId('cc-nome')?.value || '').trim();
    const ativo  = byId('cc-status')?.value !== 'false';
    if (!codigo) return showToast('Informe o código', 'error');
    if (!nome)   return showToast('Informe o nome', 'error');
    setLoading?.('Salvando...');
    try {
      const { saveCentroCusto } = await import('./supabase-service.js');
      const payload = { codigo, nome, ativo };
      if (id) payload.id = Number(id);
      await saveCentroCusto(payload);
      await syncFromSupabase();
      closeModal('modal-centrocusto');
      resetCCForm();
      showToast(id ? 'Centro de custo atualizado!' : 'Centro de custo criado!', 'success');
      renderAll();
    } catch (err) {
      console.error('CC save error', err);
      showToast(err.message || 'Erro ao salvar centro de custo', 'error');
    } finally {
      clearLoading?.();
    }
  }

  function resetCCForm() {
    const title = byId('modal-cc-title');
    if (title) title.textContent = 'Novo Centro de Custo';
    ['cc-edit-id','cc-codigo','cc-nome'].forEach(id => { const el = byId(id); if (el) el.value = ''; });
    if (byId('cc-status')) byId('cc-status').value = 'true';
  }

  function fillCCForm(cc) {
    const title = byId('modal-cc-title');
    if (title) title.textContent = 'Editar Centro de Custo';
    byId('cc-edit-id').value = cc.id;
    byId('cc-codigo').value  = cc.codigo;
    byId('cc-nome').value    = cc.nome;
    if (byId('cc-status')) byId('cc-status').value = String(cc.ativo !== false);
  }

  return {
    handleLogin,
    handleSaveUsuario,
    resetUsuarioForm,
    preencherUsuarioForm,
    handleLogout,
    handleAddPrestItem,
    handleConfirmPrestacao,
    handleCreateFluxo,
    handleSaveColab,
    handleSavePolitica,
    handleTogglePolitica,
    handleSaveEdit,
    handleApproveExpense,
    handleRejectExpense,
    handleReturnExpense,
    abrirDecisaoDespesa,
    confirmarDecisaoDespesa,
    abrirReenvioDespesa,
    confirmarReenvioDespesa,
    openEditExpense,
    openPrestModal,
    verifyPolicy,
    handleSaveNovaPolitica,
    handleSaveCentroCusto,
    resetCCForm,
    fillCCForm,
  };
}
