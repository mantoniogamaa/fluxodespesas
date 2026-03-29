import FluxoState from './state.js';
import FluxoBusiness from './business.js';
import { SEED_STATE } from './seed.js';
import { CATEGORIES, COLORS, DEFAULT_POLICY } from './constants.js';
import { byId, qsa, currency, dateBr, categoryLabel, pageMeta, sum, getInitials, escapeHtml } from './helpers.js';
import { drawBarChart } from './charts.js';
import { createAppContext } from './context.js';
import { createUi } from './ui.js';
import { createRenderers } from './renderers.js';
import { createActions } from './actions.js';
import { bindEvents } from './events.js';
import FluxoRepository from './repository.js';
import { isSupabaseEnabled } from './supabase-client.js';
import { createSupabaseCloudAdapter } from './supabase-cloud-adapter.js';
import { getSessionUser, getProfile, mapCloudIdentity } from './supabase-service.js';

export async function initApp() {
  const context = createAppContext({ FluxoState, FluxoBusiness, sum });
  context.App.selectedAvatarColor = COLORS[0];
  const cloudContext = { userId: null, workspaceId: null };

  const renderRuntime = { renderAll: null };

  const uiApi = createUi({
    FluxoState,
    FluxoBusiness,
    SEED_STATE,
    DEFAULT_POLICY,
    byId,
    qsa,
    currency,
    auth: context.auth,
    data: context.data,
    currentUser: context.currentUser,
    scopeFilter: context.scopeFilter,
    getColab: context.getColab,
    categoryLabel,
    renderRuntime,
  });

  const renderers = createRenderers({
    FluxoState,
    CATEGORIES,
    COLORS,
    byId,
    qsa,
    currency,
    dateBr,
    categoryLabel,
    pageMeta,
    sum,
    getInitials,
    escapeHtml,
    drawBarChart,
    App: context.App,
    auth: context.auth,
    data: context.data,
    ui: context.ui,
    currentUser: context.currentUser,
    isGestor: context.isGestor,
    getColab: context.getColab,
    getFluxo: context.getFluxo,
    scopeFilter: context.scopeFilter,
    availableSaldo: context.availableSaldo,
    openModal: uiApi.openModal,
  });

  renderRuntime.renderAll = renderers.renderAll;

  if (isSupabaseEnabled()) {
    FluxoRepository.attachCloud(createSupabaseCloudAdapter(() => cloudContext));
  } else {
    FluxoRepository.detachCloud();
  }

  const actions = createActions({
    FluxoState,
    FluxoBusiness,
    CATEGORIES,
    COLORS,
    DEFAULT_POLICY,
    byId,
    currency,
    categoryLabel,
    App: context.App,
    auth: context.auth,
    data: context.data,
    ui: context.ui,
    currentUser: context.currentUser,
    getColab: context.getColab,
    getFluxo: context.getFluxo,
    showToast: uiApi.showToast,
    closeModal: uiApi.closeModal,
    openModal: uiApi.openModal,
    persist: uiApi.persist,
    renderAll: renderers.renderAll,
    renderPrestacao: renderers.renderPrestacao,
    renderCategoriaChips: renderers.renderCategoriaChips,
    renderEnviarPrestResumo: renderers.renderEnviarPrestResumo,
    hydrateFluxoModal: renderers.hydrateFluxoModal,
    updateFluxoPreview: renderers.updateFluxoPreview,
    renderAvatarPicker: renderers.renderAvatarPicker,
    resetColabForm: renderers.resetColabForm,
    fillColabForm: renderers.fillColabForm,
  });

  bindEvents({
    App: context.App,
    FluxoBusiness,
    FluxoState,
    byId,
    currentUser: context.currentUser,
    ui: context.ui,
    showToast: uiApi.showToast,
    openSidebar: uiApi.openSidebar,
    closeSidebar: uiApi.closeSidebar,
    closeModal: uiApi.closeModal,
    openModal: uiApi.openModal,
    persist: uiApi.persist,
    exportHistoricoCsv: uiApi.exportHistoricoCsv,
    renderAll: renderers.renderAll,
    renderPrestacao: renderers.renderPrestacao,
    renderCurrentPage: renderers.renderCurrentPage,
    renderCategoriaChips: renderers.renderCategoriaChips,
    renderAvatarPicker: renderers.renderAvatarPicker,
    renderEnviarPrestResumo: renderers.renderEnviarPrestResumo,
    updateFluxoPreview: renderers.updateFluxoPreview,
    hydrateFluxoModal: renderers.hydrateFluxoModal,
    resetColabForm: renderers.resetColabForm,
    fillColabForm: renderers.fillColabForm,
    showColabDetail: renderers.showColabDetail,
    setRole: uiApi.setRole,
    handleLogin: actions.handleLogin,
    handleLogout: actions.handleLogout,
    handleAddPrestItem: actions.handleAddPrestItem,
    handleConfirmPrestacao: actions.handleConfirmPrestacao,
    handleCreateFluxo: actions.handleCreateFluxo,
    handleSaveColab: actions.handleSaveColab,
    handleSavePolitica: actions.handleSavePolitica,
    handleSaveEdit: actions.handleSaveEdit,
    handleApproveExpense: actions.handleApproveExpense,
    handleRejectExpense: actions.handleRejectExpense,
    openEditExpense: actions.openEditExpense,
    openPrestModal: actions.openPrestModal,
    verifyPolicy: actions.verifyPolicy,
    updateFilePreview: uiApi.updateFilePreview,
    getColab: context.getColab,
  });

  // Modo Supabase: começa sem dados demo. Modo local: carrega seed.
  if (isSupabaseEnabled()) {
    FluxoState.bootstrap(null);
  } else {
    uiApi.ensureSeed();
  }

  uiApi.setRole(context.auth().currentRole || 'gestor');

  if (isSupabaseEnabled()) {
    try {
      const sessionUser = await getSessionUser();
      if (sessionUser) {
        const profile = await getProfile(sessionUser.id);
        const mapped = mapCloudIdentity(profile, sessionUser);
        cloudContext.userId = mapped.userId;
        cloudContext.workspaceId = mapped.workspaceId;
        FluxoState.setAuth({ currentRole: mapped.role, currentUser: mapped });
        const remoteState = await FluxoRepository.hydrateRemote();
        if (remoteState) FluxoState.hydrateRemote(remoteState);
        const remoteDraft = await FluxoRepository.hydrateRemoteDraft();
        if (Array.isArray(remoteDraft) && remoteDraft.length) FluxoState.setRemoteDraft(remoteDraft);
      }
    } catch (error) {
      console.error('Supabase session bootstrap error', error);
    }
  }

  context.App.unsub = FluxoState.subscribe((snapshot) => {
    const user = snapshot?.auth?.currentUser;
    cloudContext.userId = user?.userId || null;
    cloudContext.workspaceId = user?.workspaceId || cloudContext.workspaceId || null;
  });

  renderers.renderAll();
  window.FluxoApp = Object.freeze({
    renderAll: renderers.renderAll,
    state: context.state,
    data: context.data,
    ui: context.ui,
  });
}
