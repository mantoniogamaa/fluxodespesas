export function bindEvents({
  App,
  FluxoBusiness,
  FluxoState,
  byId,
  currentUser,
  ui,
  data,
  showToast,
  openSidebar,
  closeSidebar,
  closeModal,
  openModal,
  persist,
  exportHistoricoCsv,
  renderAll,
  renderPrestacao,
  renderCurrentPage,
  renderCategoriaChips,
  renderAvatarPicker,
  renderEnviarPrestResumo,
  updateFluxoPreview,
  hydrateFluxoModal,
  resetColabForm,
  fillColabForm,
  showColabDetail,
  setRole,
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
  updateFilePreview,
  getColab,
  resetUsuarioForm,
  preencherUsuarioForm,
  handleSaveUsuario,
  handleSaveNovaPolitica,
  handleSaveCentroCusto,
  resetCCForm,
  fillCCForm,
  setLoading,
  clearLoading,
}) {
  document.addEventListener('click', async (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    switch (action) {
      case 'set-role': setRole(actionEl.dataset.role); break;
      case 'login': await handleLogin(); break;
      case 'logout': await handleLogout(); break;
      case 'open-sidebar': openSidebar(); break;
      case 'close-sidebar': closeSidebar(); break;
      case 'toggle-sidebar': {
        const sb = byId('sidebar');
        const collapsed = sb?.classList.toggle('collapsed');
        localStorage.setItem('fluxo_sidebar_collapsed', collapsed ? '1' : '0');
        break;
      }
      case 'go-page': App.currentPage = actionEl.dataset.page; closeSidebar(); renderAll(); break;
      case 'hist-filter': {
        const val = actionEl.dataset.value;
        // Atualizar pills visuais
        document.querySelectorAll('.hist-pill').forEach(p => {
          const isActive = p.dataset.value === val;
          p.style.background = isActive ? 'var(--accent)' : 'transparent';
          p.style.color = isActive ? '#fff' : 'var(--text2)';
          p.style.borderColor = isActive ? 'var(--accent)' : 'var(--border2)';
          p.style.fontWeight = isActive ? '600' : '500';
        });
        // Sincronizar com o select hidden
        const sel = byId('f-status');
        if (sel) { sel.value = val; }
        renderAll();
        break;
      }
      case 'open-nova-fluxo': hydrateFluxoModal(); openModal('modal-verba'); break;
      case 'close-modal': closeModal(actionEl.dataset.modalId); break;
      case 'open-prest-modal': openPrestModal(); break;
      case 'add-item-prest': handleAddPrestItem(); break;
      case 'abrir-enviar-prest': renderEnviarPrestResumo(); openModal('modal-enviar-prest'); break;
      case 'confirmar-prestacao': await handleConfirmPrestacao(); break;
      case 'criar-fluxo': await handleCreateFluxo(); break;
      case 'salvar-colab': await handleSaveColab(); break;
      case 'abrir-novo-colab': resetColabForm(); openModal('modal-colab'); break;
      case 'abrir-novo-usuario': resetUsuarioForm(); openModal('modal-usuario'); break;
      case 'salvar-usuario': handleSaveUsuario(); break;
      case 'editar-usuario': preencherUsuarioForm(Number(actionEl.dataset.id)); openModal('modal-usuario'); break;
      case 'ver-colab': showColabDetail(Number(actionEl.dataset.id)); break;
      case 'editar-colab-detalhe': fillColabForm(getColab(Number(actionEl.dataset.id))); closeModal('modal-colab-detalhe'); openModal('modal-colab'); break;
      case 'toggle-colab-status': {
        const result = FluxoBusiness.ColaboradorService.toggleStatus(Number(actionEl.dataset.id), currentUser()?.name || 'Sistema');
        if (!result.ok) return showToast(result.message, 'error');
        persist();
        showToast(result.message, result.toastType || 'success');
        break;
      }
      case 'salvar-politica': await handleSavePolitica(); break;
      case 'abrir-nova-politica': openModal('modal-nova-politica'); break;
      case 'salvar-nova-politica': await handleSaveNovaPolitica(); break;
      case 'abrir-novo-cc': resetCCForm(); openModal('modal-centrocusto'); break;
      case 'salvar-cc': await handleSaveCentroCusto(); break;
      case 'editar-cc': {
        const cc = (FluxoState.get()?.data?._centrosCusto || []).find(c => Number(c.id) === Number(actionEl.dataset.id));
        if (cc) { fillCCForm(cc); openModal('modal-centrocusto'); }
        break;
      }
      case 'toggle-cc-status': {
        const ccId = Number(actionEl.dataset.id);
        const cc = (FluxoState.get()?.data?._centrosCusto || []).find(c => Number(c.id) === ccId);
        if (!cc) break;
        setLoading?.('Atualizando...');
        try {
          const { saveCentroCusto } = await import('./supabase-service.js');
          await saveCentroCusto({ id: cc.id, codigo: cc.codigo, nome: cc.nome, ativo: !cc.ativo });
          const { loadFullState } = await import('./supabase-service.js');
          const remoteState = await loadFullState();
          if (remoteState) FluxoState.hydrateRemote(remoteState);
          showToast(`Centro "${cc.nome}" ${!cc.ativo ? 'ativado' : 'inativado'}!`, 'success');
          renderAll();
        } catch (err) {
          showToast('Erro ao atualizar centro de custo', 'error');
        } finally {
          clearLoading?.();
        }
        break;
      }
      case 'toggle-politica': {
        const cat = actionEl.dataset.cat;
        const pol = FluxoState.get().data.politica;
        if (pol && pol[cat]) { pol[cat].ativo = !pol[cat].ativo; persist(); }
        break;
      }
      case 'salvar-edicao': await handleSaveEdit(); break;
      case 'aprovar-despesa': await handleApproveExpense(actionEl.dataset.id); break;
      case 'rejeitar-despesa': await handleRejectExpense(actionEl.dataset.id); break;
      case 'editar-despesa': openEditExpense(actionEl.dataset.id); break;
      case 'select-avatar-color': App.selectedAvatarColor = actionEl.dataset.color; renderAvatarPicker(); break;
      case 'selecionar-categoria': FluxoState.setUi({ catSelecionada: actionEl.dataset.cat, refeicaoTipo: null }); renderCategoriaChips(); verifyPolicy(); break;
      case 'selecionar-refeicao': FluxoState.setUi({ refeicaoTipo: actionEl.dataset.tipo }); renderCategoriaChips(); verifyPolicy(); break;
      case 'abrir-camera-prest': byId('prest-file-camera').click(); break;
      case 'abrir-galeria-prest': byId('prest-file-galeria').click(); break;
      case 'remover-foto-prest': {
        FluxoState.setUi({ fotoPrestUrl: null });
        byId('prest-img-preview').src = '';
        byId('prest-foto-preview').style.display = 'none';
        const ocrAreaRm = byId('prest-ocr-area');
        if (ocrAreaRm) ocrAreaRm.style.display = 'none';
        break;
      }
      case 'ler-comprovante': {
        const imgEl = byId('prest-img-preview');
        if (!imgEl?.src?.startsWith('data:')) { showToast('Nenhuma foto carregada', 'warning'); break; }
        const ocrStrip = byId('prest-ocr-strip');
        const ocrBtn   = byId('btn-ler-comprovante');
        const statusEl = byId('prest-ocr-status');
        if (ocrStrip) ocrStrip.style.display = 'flex';
        if (ocrBtn)   ocrBtn.style.display   = 'none';
        try {
          const { lerComprovante } = await import('./ocr.js');
          const result = await lerComprovante(imgEl.src, pct => {
            if (statusEl) statusEl.textContent = `Lendo comprovante... ${pct}%`;
          });
          if (result.valor != null) {
            const valorEl = byId('pi-valor');
            if (valorEl && !valorEl.value) valorEl.value = result.valor;
          }
          if (result.estab) {
            const descEl = byId('pi-desc');
            if (descEl && !descEl.value) descEl.value = result.estab;
          }
          verifyPolicy();
          if (result.valor != null) {
            const fmt = result.valor.toFixed(2).replace('.', ',');
            showToast(`OCR: ${result.estab ? result.estab + ' · ' : ''}R$ ${fmt}`, 'success');
          } else {
            showToast('OCR concluído — confirme os dados', 'warning');
          }
        } catch (err) {
          console.error('OCR error', err);
          showToast('Erro ao ler comprovante', 'error');
        } finally {
          if (ocrStrip) ocrStrip.style.display = 'none';
          if (ocrBtn)   ocrBtn.style.display   = 'flex';
        }
        break;
      }
      case 'remover-item-prest': {
        const items = [...ui().itensPrest];
        items.splice(Number(actionEl.dataset.index), 1);
        FluxoBusiness.PrestacaoService.saveDraft(items);
        FluxoState.setUi({ itensPrest: items });
        persist();
        break;
      }
      case 'limpar-rascunho': FluxoBusiness.PrestacaoService.saveDraft([]); FluxoState.setUi({ itensPrest: [], rascunhoOffline: [] }); persist(); showToast('Rascunho limpo'); break;
      case 'ver-reembolsos': {
        App.currentPage = 'historico';
        closeSidebar();
        const busca = byId('f-busca');
        if (busca) busca.value = 'Reembolso';
        const sel = byId('f-status');
        if (sel) sel.value = 'Pendente';
        document.querySelectorAll('.hist-pill').forEach(p => {
          const isP = p.dataset.value === 'Pendente';
          p.style.background = isP ? 'var(--accent)' : 'transparent';
          p.style.color = isP ? '#fff' : 'var(--text2)';
          p.style.borderColor = isP ? 'var(--accent)' : 'var(--border2)';
          p.style.fontWeight = isP ? '600' : '500';
        });
        renderAll();
        break;
      }
      case 'export-excel': exportHistoricoCsv(); break;
      case 'gerar-pdf': window.print(); break;
      default: break;
    }
  });

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target.id === 'prest-fluxo-select') {
      FluxoState.setUi({ verbaSelecionadaId: Number(target.value) || null });
      renderPrestacao();
      return;
    }
    if (target.id === 'mv-colab') { updateFluxoPreview(); return; }
    if (target.matches('[data-change]')) { renderAll(); }
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.id === 'mv-valor') { updateFluxoPreview(); return; }
    if (target.matches('[data-input="verificar-politica"]') || target.id === 'pi-hora') { verifyPolicy(); return; }
    if (target.matches('[data-input], [data-change]')) { renderCurrentPage(); }
  });

  byId('prest-file-camera')?.addEventListener('change', (event) => updateFilePreview(event.target.files?.[0]));
  byId('prest-file-galeria')?.addEventListener('change', (event) => updateFilePreview(event.target.files?.[0]));
  byId('btn-editar-colab')?.setAttribute('data-action', 'editar-colab-detalhe');
}
