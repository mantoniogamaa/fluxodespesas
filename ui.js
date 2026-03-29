export function createUi({
  FluxoState,
  FluxoBusiness,
  SEED_STATE,
  DEFAULT_POLICY,
  byId,
  qsa,
  currency,
  auth,
  data,
  currentUser,
  scopeFilter,
  getColab,
  categoryLabel,
  renderRuntime,
}) {

function setRole(role) {
      FluxoBusiness.AuthService.setRole(role);
      qsa('.role-btn').forEach((button) => button.classList.toggle('active', button.dataset.role === role));
      const hint = byId('auth-hint-text');
      if (hint) {
        hint.textContent = role === 'gestor'
          ? 'Gestor: demo.gestor@empresa / 12345'
          : 'Colaborador: demo.colaborador@empresa / 12345';
      }
      const emailEl = byId('auth-email');
      if (emailEl) {
        emailEl.placeholder = role === 'gestor' ? 'demo.gestor@empresa' : 'demo.colaborador@empresa';
        emailEl.value = '';
      }
    }

function showToast(message, type = 'success') {
      const toast = byId('toast');
      if (!toast) return;
      toast.textContent = message;
      toast.className = `toast ${type} show`;
      window.clearTimeout(showToast._timer);
      showToast._timer = window.setTimeout(() => {
        toast.className = 'toast';
      }, 2600);
    }

function setLoading(message = 'Processando...') {
      const loading = byId('loading');
      const text = byId('loading-text');
      if (loading) loading.classList.add('show');
      if (text) text.textContent = message;
    }

function clearLoading() {
      byId('loading')?.classList.remove('show');
    }

function openModal(id) { byId(id)?.classList.add('show'); }

function closeModal(id) { byId(id)?.classList.remove('show'); }

function closeAllModals() { qsa('.modal-overlay.show').forEach((el) => el.classList.remove('show')); }

function openSidebar() {
      byId('sidebar')?.classList.add('open');
      byId('sidebar-overlay')?.classList.add('open');
    }

function closeSidebar() {
      byId('sidebar')?.classList.remove('open');
      byId('sidebar-overlay')?.classList.remove('open');
    }

function persist() { FluxoState.save(); renderAll(); }

function ensureSeed() {
      FluxoState.bootstrap(SEED_STATE);
      if (!data().politica || !Object.keys(data().politica).length) {
        data().politica = JSON.parse(JSON.stringify(DEFAULT_POLICY));
        FluxoState.save();
      }
    }

function updateFilePreview(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        FluxoState.setUi({ fotoPrestUrl: reader.result });
        byId('prest-img-preview').src = reader.result;
        byId('prest-foto-preview').style.display = 'block';
      };
      reader.readAsDataURL(file);
    }

function exportHistoricoCsv() {
      const rows = [['Data','Colaborador','Estabelecimento','Categoria','Valor','Status']];
      const despesas = qsa('#hist-table tr').length ? data().despesas.filter((item) => scopeFilter(item.colabId)) : [];
      despesas.forEach((item) => {
        rows.push([item.data, getColab(item.colabId)?.nome || '', item.estab, categoryLabel(item.cat), String(item.valor), item.status]);
      });
      const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('\"', '\"\"')}"`).join(';')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'historico_despesas.csv';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Histórico exportado em CSV', 'success');
    }

  return {
    setRole,
    showToast,
    setLoading,
    clearLoading,
    openModal,
    closeModal,
    closeAllModals,
    openSidebar,
    closeSidebar,
    persist,
    ensureSeed,
    updateFilePreview,
    exportHistoricoCsv,
  };
}
