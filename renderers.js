export function createRenderers({
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
  App,
  auth,
  data,
  ui,
  currentUser,
  isGestor,
  getColab,
  getFluxo,
  scopeFilter,
  availableSaldo,
  openModal,
}) {

function _isGestor() {
      const auth = FluxoState.get()?.auth || {};
      return auth.currentRole === 'gestor' || auth.currentUser?.role === 'gestor';
    }

    function _currentUser() {
      return FluxoState.get()?.auth?.currentUser || null;
    }

    function renderChrome() {
      // Lê direto do FluxoState para garantir estado atual (evita problema de closure)
      const _auth = FluxoState.get()?.auth || {};
      const user = _auth.currentUser || null;
      const gestor = _auth.currentRole === 'gestor' || user?.role === 'gestor';
      byId('auth-screen').style.display = user ? 'none' : 'flex';
      byId('app').style.display = user ? 'block' : 'none';
      if (!user) return;

      const meta = pageMeta(App.currentPage);
      byId('top-title').textContent = meta.title;
      byId('top-sub').textContent = meta.subtitle;
      byId('sidebar-role-label').textContent = gestor ? 'Painel do Gestor' : 'Painel do Colaborador';
      byId('user-display-name').textContent = user.name;
      byId('user-display-role').textContent = gestor ? 'Gestor' : 'Colaborador';
      const initials = getInitials(user.name);
      byId('user-initials').textContent = initials;
      byId('topbar-avatar').textContent = initials;

      ['relatorios','comparativo','verbas','log','politica','colaboradores','usuarios'].forEach((page) => {
        const nav = byId(`nav-${page}`);
        if (nav) nav.style.display = gestor ? '' : 'none';
      });

      qsa('.nav-item, .bn-item, .bn-fab').forEach((item) => {
        const active = item.dataset.page === App.currentPage;
        item.classList.toggle('active', active);
      });
      const _currentPage = App.currentPage;
      qsa('.page').forEach((pageEl) => {
        pageEl.classList.toggle('active', pageEl.id === ('page-' + _currentPage));
      });

      const saldo = user.colabId ? availableSaldo(user.colabId) : 0;
      const showSaldo = !gestor && user.colabId;
      byId('sidebar-saldo').style.display = showSaldo ? '' : 'none';
      byId('topbar-saldo-pill').classList.toggle('show', showSaldo);
      if (showSaldo) {
        byId('sidebar-saldo-val').textContent = currency(saldo);
        byId('sidebar-saldo-sub').textContent = 'Saldo somado nos fluxos ativos';
        byId('topbar-saldo-val').textContent = currency(saldo);
      }
    }

function renderDashboard() {
      const despesas = data().despesas.filter((item) => scopeFilter(item.colabId));
      const verbas = data().verbas.filter((item) => scopeFilter(item.colabId));
      const total = sum(verbas, (item) => item.total);
      const usado = sum(verbas, (item) => item.usado);
      const pendentes = despesas.filter((item) => item.status === 'Pendente');

      byId('s-total').textContent = currency(total);
      byId('s-total-s').textContent = `${verbas.length} fluxos ativos`;
      byId('s-usado').textContent = currency(usado);
      byId('s-usado-s').textContent = `${currency(Math.max(total - usado, 0))} disponível`;
      byId('s-notas').textContent = String(despesas.length);
      byId('s-notas-s').textContent = `${despesas.filter((item) => item.status === 'Aprovado').length} aprovadas`;
      byId('s-pend').textContent = String(pendentes.length);
      byId('s-pend-s').textContent = pendentes.length ? 'Aguardando decisão' : 'Sem pendências';

      const latest = [...despesas].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 5);
      byId('dash-table').innerHTML = latest.map((item) => {
        const colab = getColab(item.colabId);
        return `
          <tr>
            <td>${escapeHtml(colab?.nome || '—')}</td>
            <td>${escapeHtml(item.estab)}</td>
            <td><span class="badge ${item.cat}">${escapeHtml(categoryLabel(item.cat))}</span></td>
            <td>${currency(item.valor)}</td>
            <td>${statusBadge(item.status)}</td>
          </tr>`;
      }).join('') || `<tr><td colspan="5"><div class="empty-state"><div class="empty-text">Sem despesas recentes.</div></div></td></tr>`;

      byId('dash-cards').innerHTML = latest.map((item) => {
        const colab = getColab(item.colabId);
        return `
          <div class="exp-card">
            <div class="exp-card-top"><div><div class="exp-card-estab">${escapeHtml(item.estab)}</div><div class="exp-card-meta">${escapeHtml(colab?.nome || '—')} · ${dateBr(item.data)}</div></div><div class="exp-card-valor">${currency(item.valor)}</div></div>
            <div class="exp-card-meta"><span class="badge ${item.cat}">${escapeHtml(categoryLabel(item.cat))}</span>${statusBadge(item.status)}</div>
          </div>`;
      }).join('');

      const grouped = groupByCategory(despesas);
      drawBarChart(byId('chart-cat'), grouped);

      const alert = byId('alert-saldo');
      if (!_isGestor() && _currentUser()?.colabId) {
        const saldo = availableSaldo(_currentUser().colabId);
        const show = saldo < 300;
        alert.classList.toggle('show', show);
        byId('alert-saldo-txt').textContent = show ? `Seu saldo disponível está em ${currency(saldo)}. Revise a necessidade de novo crédito.` : '';
      } else {
        alert.classList.remove('show');
      }
    }

function renderExtrato() {
      const user = _currentUser();
      const fluxos = data().verbas.filter((item) => scopeFilter(item.colabId));
      const cards = fluxos.map((item) => {
        const colab = getColab(item.colabId);
        const saldo = Math.max(Number(item.total) - Number(item.usado), 0);
        const pct = item.total ? Math.round((Number(item.usado) / Number(item.total)) * 100) : 0;
        return `
          <div class="card" style="margin-bottom:12px">
            <div class="table-header"><div><div class="section-title">${escapeHtml(item.motivo)}</div><div class="page-subtitle">${escapeHtml(colab?.nome || '—')} · ${dateBr(item.dataInicio)}</div></div><div class="badge ${saldo > 0 ? 'aprovado' : 'rejeitado'}">${saldo > 0 ? 'Ativo' : 'Encerrado'}</div></div>
            <div class="grid-3">
              <div><div class="field-label">Crédito</div><div class="stat-value" style="font-size:18px">${currency(item.total)}</div></div>
              <div><div class="field-label">Utilizado</div><div class="stat-value" style="font-size:18px">${currency(item.usado)}</div></div>
              <div><div class="field-label">Saldo</div><div class="stat-value" style="font-size:18px">${currency(saldo)}</div></div>
            </div>
            <div style="margin-top:12px"><div class="progress-bar"><div class="progress-fill ${pct > 80 ? 'red' : pct > 50 ? 'yellow' : 'green'}" style="width:${pct}%"></div></div><div class="progress-labels"><span>uso do crédito</span><span>${pct}%</span></div></div>
          </div>`;
      }).join('');

      byId('extrato-content').innerHTML = `
        <div class="card" style="margin-bottom:14px">
          <div class="section-title" style="margin-bottom:6px">Resumo do extrato</div>
          <div class="page-subtitle">${_isGestor() ? 'Visão consolidada de todos os colaboradores' : `Visão individual de ${escapeHtml(user?.name || '')}`}</div>
        </div>
        ${cards || '<div class="card"><div class="empty-state"><div class="empty-text">Nenhum fluxo disponível.</div></div></div>'}`;
    }

function ensureHistoricoFilters() {
      const select = byId('f-colab');
      if (!select) return;
      const current = select.value;
      select.innerHTML = '<option value="">Colaborador: Todos</option>' + data().colaboradores.map((colab) => `<option value="${colab.id}">${escapeHtml(colab.nome)}</option>`).join('');
      select.value = current;
    }

function renderHistorico() {
      ensureHistoricoFilters();
      const fStatus = byId('f-status')?.value || '';
      const fColab = byId('f-colab')?.value || '';
      const fDe = byId('f-de')?.value || '';
      const fAte = byId('f-ate')?.value || '';
      const fBusca = (byId('f-busca')?.value || '').trim().toLowerCase();

      const despesas = data().despesas
        .filter((item) => scopeFilter(item.colabId))
        .filter((item) => !fStatus || item.status === fStatus)
        .filter((item) => !fColab || String(item.colabId) === String(fColab))
        .filter((item) => !fDe || item.data >= fDe)
        .filter((item) => !fAte || item.data <= fAte)
        .filter((item) => !fBusca || [item.estab, item.obs, categoryLabel(item.cat), getColab(item.colabId)?.nome || ''].join(' ').toLowerCase().includes(fBusca))
        .sort((a, b) => String(b.data).localeCompare(String(a.data)));

      byId('hist-action-col').textContent = _isGestor() ? 'Ações' : '';
      byId('hist-table').innerHTML = despesas.map((item) => historicoRow(item)).join('') || `<tr><td colspan="8"><div class="empty-state"><div class="empty-text">Nenhuma despesa encontrada.</div></div></td></tr>`;
      byId('hist-cards').innerHTML = despesas.map((item) => historicoCard(item)).join('');
      byId('hist-total-row').textContent = `Total filtrado: ${currency(sum(despesas, (item) => item.valor))}`;
    }

function historicoRow(item) {
      const colab = getColab(item.colabId);
      const fluxo = getFluxo(item.verbaid);
      return `
        <tr>
          <td>${dateBr(item.data)}</td>
          <td>${escapeHtml(colab?.nome || '—')}</td>
          <td>${escapeHtml(item.estab)}</td>
          <td><span class="badge ${item.cat}">${escapeHtml(categoryLabel(item.cat))}</span></td>
          <td>${currency(item.valor)}</td>
          <td>${escapeHtml(fluxo?.motivo || '—')}</td>
          <td>${statusBadge(item.status)}</td>
          <td>${_isGestor() ? historicoActions(item) : ''}</td>
        </tr>`;
    }

function historicoCard(item) {
      const colab = getColab(item.colabId);
      return `
        <div class="exp-card">
          <div class="exp-card-top"><div><div class="exp-card-estab">${escapeHtml(item.estab)}</div><div class="exp-card-meta">${escapeHtml(colab?.nome || '—')} · ${dateBr(item.data)}</div></div><div class="exp-card-valor">${currency(item.valor)}</div></div>
          <div class="exp-card-meta"><span class="badge ${item.cat}">${escapeHtml(categoryLabel(item.cat))}</span>${statusBadge(item.status)}</div>
          ${_isGestor() ? `<div class="exp-card-actions">${historicoActions(item)}</div>` : ''}
        </div>`;
    }

function historicoActions(item) {
      if (!_isGestor()) return '';
      const actions = [];
      if (item.status === 'Pendente') {
        actions.push(`<button class="btn-sm green" data-action="aprovar-despesa" data-id="${item.id}">Aprovar</button>`);
        actions.push(`<button class="btn-sm" data-action="editar-despesa" data-id="${item.id}">Editar</button>`);
        actions.push(`<button class="btn-sm" data-action="rejeitar-despesa" data-id="${item.id}">Rejeitar</button>`);
      }
      return actions.join(' ');
    }

function renderPrestacao() {
      const flows = data().verbas.filter((item) => scopeFilter(item.colabId) && item.status === 'ativa');
      const selectedId = Number(byId('prest-fluxo-select')?.value || ui().verbaSelecionadaId || flows[0]?.id || 0);
      FluxoState.setUi({ verbaSelecionadaId: selectedId || null });
      const selectedFluxo = flows.find((item) => Number(item.id) === Number(selectedId));
      const saldo = selectedFluxo ? Math.max(selectedFluxo.total - selectedFluxo.usado, 0) : 0;
      const totalDraft = sum(ui().itensPrest, (item) => item.valor);

      byId('prest-content').innerHTML = `
        <div class="grid-2">
          <div class="card">
            <div class="table-header"><div class="section-title">Montar prestação</div><button class="btn-sm green" data-action="add-item-prest">Adicionar despesa</button></div>
            <div class="field-group"><div class="field-label">Fluxo / Viagem</div><div class="select-wrapper"><select class="field-input" id="prest-fluxo-select">${flows.map((item) => `<option value="${item.id}" ${Number(item.id) === Number(selectedId) ? 'selected' : ''}>${escapeHtml(item.motivo)}</option>`).join('')}</select></div></div>
            ${selectedFluxo ? `
              <div class="prest-summary">
                <div class="prest-title">Resumo do fluxo</div>
                <div class="prest-row"><span>Crédito total</span><span class="prest-val">${currency(selectedFluxo.total)}</span></div>
                <div class="prest-row"><span>Já utilizado</span><span class="prest-val">${currency(selectedFluxo.usado)}</span></div>
                <div class="prest-row saldo-pos"><span>Saldo atual</span><span class="prest-val">${currency(saldo)}</span></div>
                <div class="prest-row"><span>Rascunho atual</span><span class="prest-val">${currency(totalDraft)}</span></div>
              </div>` : '<div class="empty-state"><div class="empty-text">Crie um fluxo antes de prestar contas.</div></div>'}
            <div id="prest-itens-list">${renderPrestacaoItems()}</div>
            <div class="modal-actions">
              <button class="btn-ghost" data-action="limpar-rascunho">Limpar rascunho</button>
              <button class="btn-confirm" data-action="abrir-enviar-prest" ${ui().itensPrest.length ? '' : 'disabled'}>Enviar prestação</button>
            </div>
          </div>
          <div class="card">
            <div class="section-title" style="margin-bottom:14px">Orientações rápidas</div>
            <div class="timeline">
              <div class="tl-item"><div class="tl-dot" style="background:rgba(59,130,246,.12);color:var(--accent)">1</div><div class="tl-body"><div class="tl-title">Escolha o fluxo correto</div><div class="tl-sub">Sempre vincule a despesa ao crédito certo.</div></div></div>
              <div class="tl-item"><div class="tl-dot" style="background:rgba(16,185,129,.12);color:var(--green)">2</div><div class="tl-body"><div class="tl-title">Anexe e descreva</div><div class="tl-sub">Mesmo antes do backend, trate comprovante e descrição como obrigatórios.</div></div></div>
              <div class="tl-item"><div class="tl-dot" style="background:rgba(245,158,11,.12);color:var(--gold)">3</div><div class="tl-body"><div class="tl-title">Respeite a política</div><div class="tl-sub">Excesso de limite exige justificativa.</div></div></div>
            </div>
          </div>
        </div>`;
      renderCategoriaChips();
    }

function renderPrestacaoItems() {
      if (!ui().itensPrest.length) {
        return '<div class="empty-state"><div class="empty-text">Nenhuma despesa adicionada ao rascunho.</div></div>';
      }
      return ui().itensPrest.map((item, index) => `
        <div class="exp-card">
          <div class="exp-card-top"><div><div class="exp-card-estab">${escapeHtml(item.estab || item.desc || 'Despesa')}</div><div class="exp-card-meta">${dateBr(item.data)} · ${escapeHtml(categoryLabel(item.cat))}</div></div><div class="exp-card-valor">${currency(item.valor)}</div></div>
          <div class="exp-card-meta">${item.justificativa ? `<span class="badge pendente">Com justificativa</span>` : '<span></span>'}<button class="btn-sm" data-action="remover-item-prest" data-index="${index}">Remover</button></div>
        </div>`).join('');
    }

function renderRelatorios() {
      // Preencher data no cabeçalho de impressão
      const printDate = byId('rel-print-date');
      if (printDate) {
        const now = new Date();
        printDate.innerHTML = `Gerado em ${now.toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'})}<br>Fluxo — Gestão de Despesas`;
      }

      hydrateRelatorioSelects();
      const despesas = data().despesas.filter((item) => scopeFilter(item.colabId));
      const fColab = byId('rel-colab')?.value || '';
      const fVerba = byId('rel-verba')?.value || '';
      const fDe = byId('rel-de')?.value || '';
      const fAte = byId('rel-ate')?.value || '';
      const filtradas = despesas
        .filter((item) => !fColab || String(item.colabId) === String(fColab))
        .filter((item) => !fVerba || String(item.verbaid) === String(fVerba))
        .filter((item) => !fDe || item.data >= fDe)
        .filter((item) => !fAte || item.data <= fAte);

      const grouped = groupByCategory(filtradas);
      drawBarChart(byId('chart-relat'), grouped);
      byId('rel-preview').innerHTML = `
        <div class="grid-3" style="margin-bottom:14px">
          <div class="card"><div class="field-label">Despesas</div><div class="stat-value" style="font-size:18px">${filtradas.length}</div></div>
          <div class="card"><div class="field-label">Total</div><div class="stat-value" style="font-size:18px">${currency(sum(filtradas, (item) => item.valor))}</div></div>
          <div class="card"><div class="field-label">Pendentes</div><div class="stat-value" style="font-size:18px">${filtradas.filter((item) => item.status === 'Pendente').length}</div></div>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Data</th><th>Colaborador</th><th>Despesa</th><th>Categoria</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>${filtradas.map((item) => `<tr><td>${dateBr(item.data)}</td><td>${escapeHtml(getColab(item.colabId)?.nome || '—')}</td><td>${escapeHtml(item.estab)}</td><td>${escapeHtml(categoryLabel(item.cat))}</td><td>${currency(item.valor)}</td><td>${escapeHtml(item.status)}</td></tr>`).join('') || '<tr><td colspan="6">Sem dados</td></tr>'}</tbody>
          </table>
        </div>`;
    }

function renderComparativo() {
      const cards = data().colaboradores.filter((colab) => scopeFilter(colab.id)).map((colab) => {
        const verbas = data().verbas.filter((item) => Number(item.colabId) === Number(colab.id));
        const total = sum(verbas, (item) => item.total);
        const usado = sum(verbas, (item) => item.usado);
        const pct = total ? Math.round((usado / total) * 100) : 0;
        return { colab, total, usado, pct };
      });
      byId('comp-bars').innerHTML = cards.map(({ colab, total, usado, pct }) => `
        <div class="comp-bar-wrap">
          <div class="comp-name"><span>${escapeHtml(colab.nome)}</span><span>${currency(usado)} / ${currency(total)}</span></div>
          <div class="comp-bar"><div class="comp-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--accent2))"></div></div>
        </div>`).join('');
      byId('comp-colab-cards').innerHTML = cards.map(({ colab, total, usado, pct }) => `
        <div class="colab-card">
          <div class="colab-top"><div class="colab-avatar" style="background:${colab.color}">${escapeHtml(colab.initials)}</div><div><div class="section-title">${escapeHtml(colab.nome)}</div><div class="page-subtitle">${escapeHtml(colab.dept)}</div></div></div>
          <div class="grid-3"><div><div class="field-label">Crédito</div><div class="stat-value" style="font-size:16px">${currency(total)}</div></div><div><div class="field-label">Uso</div><div class="stat-value" style="font-size:16px">${currency(usado)}</div></div><div><div class="field-label">% uso</div><div class="stat-value" style="font-size:16px">${pct}%</div></div></div>
        </div>`).join('');
      drawBarChart(byId('chart-comp'), cards.map(({ colab, usado }) => ({ label: colab.nome, value: usado })));
    }

function renderFluxos() {
      const verbas = data().verbas.filter((item) => scopeFilter(item.colabId));
      byId('verbas-table').innerHTML = verbas.map((item) => {
        const colab = getColab(item.colabId);
        const saldo = item.total - item.usado;
        const pct = item.total ? Math.round((item.usado / item.total) * 100) : 0;
        return `<tr><td>${escapeHtml(colab?.nome || '—')}</td><td>${escapeHtml(item.motivo)}</td><td>${currency(item.total)}</td><td>${currency(item.usado)}</td><td>${currency(saldo)}</td><td>${pct}%</td><td>${statusBadge(saldo > 0 ? 'Aprovado' : 'Rejeitado', saldo > 0 ? 'Ativa' : 'Encerrada')}</td></tr>`;
      }).join('') || '<tr><td colspan="7">Sem fluxos.</td></tr>';
      byId('verbas-cards').innerHTML = verbas.map((item) => {
        const colab = getColab(item.colabId);
        return `
          <div class="exp-card"><div class="exp-card-top"><div><div class="exp-card-estab">${escapeHtml(item.motivo)}</div><div class="exp-card-meta">${escapeHtml(colab?.nome || '—')} · ${dateBr(item.dataInicio)}</div></div><div class="exp-card-valor">${currency(item.total - item.usado)}</div></div><div class="exp-card-meta"><span>Saldo</span><span>${currency(item.total)} crédito</span></div></div>`;
      }).join('');
    }

function renderLog() {
      const logs = _isGestor() ? data().logAcoes : data().logAcoes.filter((item) => item.texto.toLowerCase().includes((_currentUser()?.name || '').toLowerCase()));
      byId('log-count').textContent = `${logs.length} registros`;
      byId('log-list').innerHTML = logs.map((item) => `
        <div class="log-item">
          <div class="log-dot ${item.type || 'blue'}"></div>
          <div class="log-text">${escapeHtml(item.texto)}</div>
          <div class="log-time">${escapeHtml(item.time)}</div>
        </div>`).join('') || '<div class="empty-state"><div class="empty-text">Nenhuma ação registrada.</div></div>';
    }

function renderColaboradores() {
      const search = (byId('colab-busca')?.value || '').trim().toLowerCase();
      const status = byId('colab-filtro-status')?.value || '';
      const items = data().colaboradores
        .filter((item) => !status || item.status === status)
        .filter((item) => !search || [item.nome, item.email, item.dept, item.cargo, item.cc].join(' ').toLowerCase().includes(search));
      const html = items.map((item) => `
        <div class="colab-card">
          <div class="colab-top"><div class="colab-avatar" style="background:${item.color}">${escapeHtml(item.initials)}</div><div><div class="section-title">${escapeHtml(item.nome)}</div><div class="page-subtitle">${escapeHtml(item.dept)} · ${escapeHtml(item.cargo || 'Sem cargo')}</div></div></div>
          <div class="colab-detail-row"><div class="colab-detail-label">E-mail</div><div class="colab-detail-val">${escapeHtml(item.email)}</div></div>
          <div class="colab-detail-row"><div class="colab-detail-label">Centro</div><div class="colab-detail-val">${escapeHtml(item.cc || '—')}</div></div>
          <div class="colab-detail-row"><div class="colab-detail-label">Status</div><div class="colab-detail-val"><span class="colab-status-badge ${item.status}">${item.status}</span></div></div>
          <div class="modal-actions"><button class="btn-ghost" data-action="ver-colab" data-id="${item.id}">Ver</button><button class="btn-confirm" data-action="toggle-colab-status" data-id="${item.id}">${item.status === 'ativo' ? 'Bloquear' : 'Ativar'}</button></div>
        </div>`).join('');
      byId('colab-list-content').innerHTML = html || '<div class="card"><div class="empty-state"><div class="empty-text">Nenhum colaborador encontrado.</div></div></div>';
    }

function renderPolitica() {
      const pol = data().politica || DEFAULT_POLICY;
      byId('politica-content').innerHTML = CATEGORIES.map((cat) => {
        const config = pol[cat.id];
        if (!config) return '';
        const icons = {alimentacao:'🍽️',hospedagem:'🏨',combustivel:'⛽',estacion:'🅿️',transporte:'🚌',uber:'🚗',passagem:'✈️',pedagio:'🛣️',material:'📦',outros:'•'};
        const icon = icons[cat.id] || '•';
        if (cat.id === 'alimentacao') {
          return `
            <div class="politica-cat-row">
              <div class="politica-cat-header"><div class="politica-cat-icon">${icon}</div><div class="politica-cat-name">${cat.label}</div><button class="politica-toggle ${config.ativo ? 'on' : ''}" data-action="toggle-politica" data-cat="${cat.id}"></button></div>
              <div class="politica-limite-row triple">
                <div class="politica-limite-field"><div class="politica-limite-label">Almoço</div><input class="politica-limite-input" data-policy-field="${cat.id}.almoco.limite" type="number" value="${config.almoco?.limite ?? config.almoco}"></div>
                <div class="politica-limite-field"><div class="politica-limite-label">Jantar</div><input class="politica-limite-input" data-policy-field="${cat.id}.jantar.limite" type="number" value="${config.jantar?.limite ?? config.jantar}"></div>
                <div class="politica-limite-field"><div class="politica-limite-label">Outros</div><input class="politica-limite-input" data-policy-field="${cat.id}.outros.limite" type="number" value="${config.outros?.limite ?? config.outros}"></div>
              </div>
            </div>`;
        }
        return `
          <div class="politica-cat-row">
            <div class="politica-cat-header"><div class="politica-cat-icon">${icon}</div><div class="politica-cat-name">${cat.label}</div><button class="politica-toggle ${config.ativo ? 'on' : ''}" data-action="toggle-politica" data-cat="${cat.id}"></button></div>
            <div class="politica-limite-row single"><div class="politica-limite-field"><div class="politica-limite-label">Limite (R$)</div><input class="politica-limite-input" data-policy-field="${cat.id}.limite" type="number" value="${config.limite}"></div></div>
          </div>`;
      }).join('');
    }

function hydrateRelatorioSelects() {
      const colab = byId('rel-colab');
      const verba = byId('rel-verba');
      if (colab && !colab.dataset.hydrated) {
        colab.innerHTML = '<option value="">Todos</option>' + data().colaboradores.map((item) => `<option value="${item.id}">${escapeHtml(item.nome)}</option>`).join('');
        colab.dataset.hydrated = '1';
      }
      if (verba && !verba.dataset.hydrated) {
        verba.innerHTML = '<option value="">Todas</option>' + data().verbas.filter((item) => scopeFilter(item.colabId)).map((item) => `<option value="${item.id}">${escapeHtml(item.motivo)}</option>`).join('');
        verba.dataset.hydrated = '1';
      }
    }

function hydrateFluxoModal() {
      const select = byId('mv-colab');
      if (!select) return;
      const current = select.value;
      select.innerHTML = data().colaboradores.map((colab) => `<option value="${colab.id}">${escapeHtml(colab.nome)} · ${escapeHtml(colab.dept)}</option>`).join('');
      if (current) select.value = current;
      updateFluxoPreview();
    }

function renderCategoriaChips() {
      const wrapper = byId('cat-chips');
      if (!wrapper) return;
      wrapper.innerHTML = CATEGORIES.map((cat) => `
        <button type="button" class="cat-chip ${ui().catSelecionada === cat.id ? 'selected' : ''}" data-action="selecionar-categoria" data-cat="${cat.id}">${escapeHtml(cat.label)}</button>
      `).join('');
    }

function updateFluxoPreview() {
      const preview = byId('mv-preview');
      const select = byId('mv-colab');
      const valor = Number(byId('mv-valor')?.value || 0);
      const colab = getColab(select?.value);
      byId('mv-prev-colab').textContent = colab?.nome || '—';
      byId('mv-prev-valor').textContent = currency(valor);
      if (preview) preview.style.display = valor > 0 ? 'block' : 'none';
      const saldoWrap = byId('mv-colab-saldo');
      if (saldoWrap && colab) {
        saldoWrap.textContent = `Saldo já lançado: ${currency(availableSaldo(colab.id))}`;
      }
    }

function renderEnviarPrestResumo() {
      const resumo = byId('enviar-prest-resumo');
      const fluxo = getFluxo(ui().verbaSelecionadaId);
      const total = sum(ui().itensPrest, (item) => item.valor);
      if (!resumo) return;
      resumo.innerHTML = `
        <div class="prest-summary">
          <div class="prest-title">Resumo do envio</div>
          <div class="prest-row"><span>Fluxo</span><span class="prest-val">${escapeHtml(fluxo?.motivo || '—')}</span></div>
          <div class="prest-row"><span>Comprovantes</span><span class="prest-val">${ui().itensPrest.length}</span></div>
          <div class="prest-row"><span>Total do rascunho</span><span class="prest-val">${currency(total)}</span></div>
          <div class="prest-row saldo-pos"><span>Saldo restante</span><span class="prest-val">${currency(Math.max((fluxo?.total || 0) - (fluxo?.usado || 0) - total, 0))}</span></div>
        </div>`;
    }

function renderAvatarPicker() {
      const picker = byId('avatar-picker');
      if (!picker) return;
      picker.innerHTML = COLORS.map((color) => `<button type="button" class="avatar-color ${App.selectedAvatarColor === color ? 'selected' : ''}" style="background:${color}" data-action="select-avatar-color" data-color="${color}"></button>`).join('');
    }

function populatePoliticaSelect(selectedId) {
      const select = byId('colab-politica');
      if (!select) return;
      const politicas = data()._politicas || [];
      select.innerHTML = '<option value="">Padrão da empresa</option>' +
        politicas.map(p => `<option value="${p.id}" ${String(p.id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`).join('');
    }

function resetColabForm() {
      byId('modal-colab-title').textContent = 'Cadastrar Colaborador';
      byId('colab-edit-id').value = '';
      ['colab-nome','colab-dept','colab-email','colab-telefone','colab-cpf','colab-cargo','colab-cc','colab-pix','colab-senha'].forEach((id) => { if(byId(id)) byId(id).value = ''; });
      populatePoliticaSelect('');
      byId('colab-status').value = 'ativo';
      App.selectedAvatarColor = COLORS[0];
      renderAvatarPicker();
    }

function fillColabForm(colab) {
      byId('modal-colab-title').textContent = 'Editar Colaborador';
      byId('colab-edit-id').value = colab.id;
      byId('colab-nome').value = colab.nome || '';
      byId('colab-dept').value = colab.dept || '';
      byId('colab-email').value = colab.email || '';
      byId('colab-telefone').value = colab.telefone || '';
      byId('colab-cpf').value = colab.cpf || '';
      byId('colab-cargo').value = colab.cargo || '';
      byId('colab-cc').value = colab.cc || '';
      if(byId('colab-pix')) byId('colab-pix').value = colab.pix || '';
      populatePoliticaSelect(colab._politica_id || colab.politicaId || '');
      byId('colab-senha').value = '';
      byId('colab-status').value = colab.status || 'ativo';
      App.selectedAvatarColor = colab.color || COLORS[0];
      renderAvatarPicker();
    }

function showColabDetail(id) {
      const colab = getColab(id);
      if (!colab) return;
      byId('modal-colab-detalhe-body').innerHTML = `
        <div class="colab-top" style="margin-bottom:18px"><div class="colab-avatar" style="background:${colab.color}">${escapeHtml(colab.initials)}</div><div><div class="modal-title" style="margin:0">${escapeHtml(colab.nome)}</div><div class="modal-sub" style="margin:0">${escapeHtml(colab.dept)} · ${escapeHtml(colab.cargo || 'Sem cargo')}</div></div></div>
        <div class="colab-detail-row"><div class="colab-detail-label">E-mail</div><div class="colab-detail-val">${escapeHtml(colab.email)}</div></div>
        <div class="colab-detail-row"><div class="colab-detail-label">Telefone</div><div class="colab-detail-val">${escapeHtml(colab.telefone || '—')}</div></div>
        <div class="colab-detail-row"><div class="colab-detail-label">CPF</div><div class="colab-detail-val">${escapeHtml(colab.cpf || '—')}</div></div>
        <div class="colab-detail-row"><div class="colab-detail-label">Centro</div><div class="colab-detail-val">${escapeHtml(colab.cc || '—')}</div></div>
        <div class="colab-detail-row"><div class="colab-detail-label">Status</div><div class="colab-detail-val"><span class="colab-status-badge ${colab.status}">${escapeHtml(colab.status)}</span></div></div>`;
      byId('btn-editar-colab').dataset.id = String(colab.id);
      openModal('modal-colab-detalhe');
    }

function statusBadge(status, labelOverride) {
      const label = labelOverride || status;
      const normal = String(status || '').toLowerCase();
      const klass = normal.includes('apro') ? 'aprovado' : normal.includes('rej') ? 'rejeitado' : 'pendente';
      return `<span class="badge ${klass}">${escapeHtml(label)}</span>`;
    }

function groupByCategory(despesas) {
      const totals = new Map();
      (despesas || []).forEach((item) => {
        totals.set(item.cat, (totals.get(item.cat) || 0) + Number(item.valor || 0));
      });
      return [...totals.entries()].map(([cat, value]) => ({ label: categoryLabel(cat), value })).sort((a, b) => b.value - a.value);
    }

function renderUsuarios() {
      const tbody = byId('usuarios-table');
      if (!tbody) return;
      const usuarios = data()._usuarios || [];
      if (!usuarios.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">Nenhum usuário cadastrado. Clique em "Novo Usuário" para adicionar.</td></tr>';
        return;
      }
      const roleLabel = { gestor: 'Gestor', gerente: 'Gerente', colaborador: 'Colaborador' };
      tbody.innerHTML = usuarios.map((u) => `
        <tr>
          <td><strong>${escapeHtml(u.nome)}</strong></td>
          <td style="color:var(--text2)">${escapeHtml(u.email)}</td>
          <td><span class="badge ${u.role === 'gestor' ? 'aprovado' : u.role === 'gerente' ? 'pendente' : ''}">${roleLabel[u.role] || u.role}</span></td>
          <td><span class="colab-status-badge ${u.ativo ? 'ativo' : 'inativo'}">${u.ativo ? 'ativo' : 'inativo'}</span></td>
          <td><button class="btn-ghost" style="padding:6px 14px;font-size:12px" data-action="editar-usuario" data-id="${u.id}">Editar</button></td>
        </tr>`).join('');
    }

function renderCurrentPage() {
      switch (App.currentPage) {
        case 'dashboard': renderDashboard(); break;
        case 'extrato': renderExtrato(); break;
        case 'historico': renderHistorico(); break;
        case 'prestacao': renderPrestacao(); break;
        case 'relatorios': renderRelatorios(); break;
        case 'comparativo': renderComparativo(); break;
        case 'verbas': renderFluxos(); break;
        case 'log': renderLog(); break;
        case 'politica': renderPolitica(); break;
        case 'colaboradores': renderColaboradores(); break;
        case 'usuarios': renderUsuarios(); break;
        default: renderDashboard(); break;
      }
    }

function renderAll() {
      renderChrome();
      const _user = FluxoState.get()?.auth?.currentUser;
      if (!_user) return;
      renderCurrentPage();
      renderAvatarPicker();
      hydrateFluxoModal();
    }

  return {
    renderChrome,
    renderDashboard,
    renderExtrato,
    renderHistorico,
    renderPrestacao,
    renderRelatorios,
    renderComparativo,
    renderFluxos,
    renderLog,
    renderColaboradores,
    renderUsuarios,
    renderPolitica,
    hydrateRelatorioSelects,
    hydrateFluxoModal,
    renderCategoriaChips,
    updateFluxoPreview,
    renderEnviarPrestResumo,
    renderAvatarPicker,
    resetColabForm,
    populatePoliticaSelect,
    fillColabForm,
    showColabDetail,
    statusBadge,
    groupByCategory,
    renderCurrentPage,
    renderAll,
  };
}
