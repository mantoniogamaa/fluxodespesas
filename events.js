export function bindEvents({
  App,
  FluxoBusiness,
  FluxoState,
  byId,
  currentUser,
  ui,
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
      case 'go-page': App.currentPage = actionEl.dataset.page; closeSidebar(); renderAll(); break;
      case 'open-nova-fluxo': hydrateFluxoModal(); openModal('modal-verba'); break;
      case 'close-modal': closeModal(actionEl.dataset.modalId); break;
      case 'add-item-prest': handleAddPrestItem(); break;
      case 'abrir-enviar-prest': renderEnviarPrestResumo(); openModal('modal-enviar-prest'); break;
      case 'confirmar-prestacao': handleConfirmPrestacao(); break;
      case 'criar-fluxo': handleCreateFluxo(); break;
      case 'salvar-colab': handleSaveColab(); break;
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
      case 'salvar-politica': handleSavePolitica(); break;
      case 'toggle-politica': {
        const cat = actionEl.dataset.cat;
        const pol = FluxoState.get().data.politica;
        if (pol && pol[cat]) { pol[cat].ativo = !pol[cat].ativo; persist(); }
        break;
      }
      case 'salvar-edicao': handleSaveEdit(); break;
      case 'aprovar-despesa': handleApproveExpense(actionEl.dataset.id); break;
      case 'rejeitar-despesa': handleRejectExpense(actionEl.dataset.id); break;
      case 'editar-despesa': openEditExpense(actionEl.dataset.id); break;
      case 'select-avatar-color': App.selectedAvatarColor = actionEl.dataset.color; renderAvatarPicker(); break;
      case 'selecionar-categoria': FluxoState.setUi({ catSelecionada: actionEl.dataset.cat }); renderCategoriaChips(); verifyPolicy(); break;
      case 'abrir-camera-prest': byId('prest-file-camera').click(); break;
      case 'abrir-galeria-prest': byId('prest-file-galeria').click(); break;
      case 'remover-foto-prest': FluxoState.setUi({ fotoPrestUrl: null }); byId('prest-img-preview').src = ''; byId('prest-foto-preview').style.display = 'none'; break;
      case 'remover-item-prest': {
        const items = [...ui().itensPrest];
        items.splice(Number(actionEl.dataset.index), 1);
        FluxoBusiness.PrestacaoService.saveDraft(items);
        FluxoState.setUi({ itensPrest: items });
        persist();
        break;
      }
      case 'limpar-rascunho': FluxoBusiness.PrestacaoService.saveDraft([]); FluxoState.setUi({ itensPrest: [], rascunhoOffline: [] }); persist(); showToast('Rascunho limpo'); break;
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
