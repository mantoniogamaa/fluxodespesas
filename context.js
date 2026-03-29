export function createAppContext({ FluxoState, FluxoBusiness, sum }) {
  const App = {
    currentPage: 'dashboard',
    selectedAvatarColor: null,
    unsub: null,
  };

function state() { return FluxoState.get(); }

function auth() { return state().auth; }

function data() { return state().data; }

function ui() { return state().ui; }

function currentUser() { return auth().currentUser; }

function isGestor() { return currentUser()?.role === 'gestor'; }

function getColab(id) { return data().colaboradores.find((item) => Number(item.id) === Number(id)); }

function getFluxo(id) { return data().verbas.find((item) => Number(item.id) === Number(id)); }

function scopeFilter(itemColabId) { return isGestor() || Number(itemColabId) === Number(currentUser()?.colabId); }

function availableSaldo(colabId) { return sum(data().verbas.filter((item) => Number(item.colabId) === Number(colabId)), (item) => Number(item.total) - Number(item.usado)); }

  return {
    App,
    state,
    auth,
    data,
    ui,
    currentUser,
    isGestor,
    getColab,
    getFluxo,
    scopeFilter,
    availableSaldo,
  };
}
