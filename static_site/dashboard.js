/* Dashboard + Action List
   - Carrega KPIs / charts
   - Carrega action_list e permite:
       * filtros (chips)
       * busca
       * abrir modal no click do item (row ou botão)
       * marcar convertido/negado/depois (backend)
*/

(() => {
  const el = (id) => document.getElementById(id);
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Elements
  const wsPill = el("wsPill");
  const msg = el("msg");
  const clientId = el("clientId");
  const apiKey = el("apiKey");
  const btnSave = el("btnSave");
  const btnLoad = el("btnLoad");
  const btnExport = el("btnExport");
  const btnExport2 = el("btnExport2");
  const btnTest = el("btnTest");
  const btnSeed10 = el("btnSeed10");
  const realLeadForm = el("realLeadForm");
  const realLeadMsg = el("realLeadMsg");
  const testMsg = el("testMsg");

  const actionList = el("actionList");
  const actionBody = el("actionBody");
  const leadsList = el("leadsList");
  const leadSearch = el("leadSearch");

  const dailyHotCount = el("dailyHotCount");
  const dailyWarmCount = el("dailyWarmCount");
  const dailyColdCount = el("dailyColdCount");
  const dailyConvertedCount = el("dailyConvertedCount");

  const kpiConv = el("kpiConv");
  const kpiNeg = el("kpiNeg");
  const kpiPend = el("kpiPend");
  const summaryWrap = el("summaryWrap");

  // Simple state
  let ALL_LEADS = [];
  let ACTIVE_FILTER = "hot";
  let ACTIVE_SEARCH = "";

  // Modal action state
  let CURRENT_LEAD = null;

  function setMsg(type, text) {
    if (!msg) return;
    msg.className = "alert" + (type ? " " + type : "");
    msg.style.display = "block";
    msg.textContent = text;
  }
  function setInlineMsg(node, type, text) {
    if (!node) return;
    node.className = "alert" + (type ? " " + type : "");
    node.style.display = "block";
    node.textContent = text;
  }
  function hideInlineMsg(node) {
    if (!node) return;
    node.style.display = "none";
    node.textContent = "";
    node.className = "alert";
  }

  function normalizeStatus(lead) {
    // Aceita várias formas (db antiga / nova)
    const s = (lead.status || lead.resultado || lead.estado || "").toString().toLowerCase().trim();

    // Flags legadas
    if (lead.virou_cliente === true || lead.convertido === true) return "convertido";
    if (lead.negado === true) return "negado";

    // Mapeia strings comuns
    if (["convertido", "concluido", "concluído", "venda", "fechado", "closedwon", "won", "sucesso"].includes(s)) return "convertido";
    if (["negado", "perdido", "closedlost", "lost", "nao", "não"].includes(s)) return "negado";
    if (["pendente", "pending", "novo", "new", "aberto", "open"].includes(s)) return "pendente";

    // Temperatura
    if (["quente", "hot", "🔥"].includes(s)) return "hot";
    if (["morno", "warm", "🟡"].includes(s)) return "warm";
    if (["frio", "cold", "❄️"].includes(s)) return "cold";

    // fallback: usa score / prob se existir
    const score = Number(lead.score ?? lead.pontuacao ?? lead.nota ?? 0);
    if (!Number.isFinite(score)) return "pendente";
    if (score >= 80) return "hot";
    if (score >= 55) return "warm";
    return "cold";
  }

  function formatTempPill(status) {
    const map = {
      hot: { label: "🔥 Quente", cls: "pill pill--muted" },
      warm: { label: "🟡 Morno", cls: "pill pill--muted" },
      cold: { label: "❄️ Frio", cls: "pill pill--muted" },
      pendente: { label: "⏳ Pendente", cls: "pill pill--muted" },
      convertido: { label: "✅ Convertido", cls: "pill pill--muted" },
      negado: { label: "❌ Negado", cls: "pill pill--muted" }
    };
    return map[status] || { label: "⏳ Pendente", cls: "pill pill--muted" };
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function leadToDataset(lead) {
    const nome = lead.nome ?? lead.name ?? lead.full_name ?? "—";
    const telefone = lead.telefone ?? lead.phone ?? lead.whatsapp ?? lead.celular ?? "—";
    const origem = lead.origem ?? lead.source ?? lead.canal ?? "—";
    const tempo = lead.tempo_no_site ?? lead.tempo_no_site_segundos ?? lead.tempo ?? lead.time_on_site ?? "—";
    const paginas = lead.paginas_visitadas ?? lead.paginas ?? lead.pages_visited ?? "—";
    const clicouPreco = (lead.clicou_preco ?? lead.clicou_em_preco ?? lead.price_click ?? lead.clicou_preco_bool);
    const precoTxt = (clicouPreco === 1 || clicouPreco === true || clicouPreco === "1") ? "Sim" : (clicouPreco === 0 || clicouPreco === false || clicouPreco === "0") ? "Não" : (lead.preco ?? lead.price ?? "—");
    const score = lead.score ?? lead.pontuacao ?? lead.nota ?? "—";
    const prob = lead.probabilidade ?? lead.prob ?? lead.probabilidade_conversao ?? "—";

    return {
      id: lead.id ?? lead.lead_id ?? lead._id ?? lead.uuid ?? "",
      name: nome,
      phone: telefone,
      origin: origem,
      time: tempo,
      pages: paginas,
      price: precoTxt,
      score: score,
      prob: prob
    };
  }

  function setActionState(state) {
    // state: loading | empty | error | ready
    actionList.dataset.state = state;
    // CSS controla a visibilidade via data-state? (se não, pelo menos mantemos compatibilidade)
    // Vamos ocultar/mostrar manualmente para garantir.
    const blocks = {
      loading: $(".action-state--loading", actionBody),
      empty: $(".action-state--empty", actionBody),
      error: $(".action-state--error", actionBody),
      ready: $(".action-state--ready", actionBody)
    };
    Object.entries(blocks).forEach(([k, node]) => {
      if (!node) return;
      node.style.display = (k === state) ? "block" : "none";
    });
  }

  function matchesSearch(lead, q) {
    if (!q) return true;
    const hay = [
      lead.nome, lead.name, lead.telefone, lead.phone, lead.origem, lead.source,
      lead.email
    ].map((x) => String(x ?? "").toLowerCase()).join(" ");
    return hay.includes(q);
  }

  function applyFilters() {
    const q = ACTIVE_SEARCH.trim().toLowerCase();
    const filtered = ALL_LEADS
      .map((lead) => ({ lead, status: normalizeStatus(lead) }))
      .filter(({ lead, status }) => {
        const statusOk = (ACTIVE_FILTER === "all") ? true : status === ACTIVE_FILTER;
        const searchOk = matchesSearch(lead, q);
        return statusOk && searchOk;
      })
      .map(({ lead, status }) => ({ lead, status }));

    renderLeads(filtered);

    // Se não tem nada, mas existem leads no banco, é só "vazio do filtro"
    if (ALL_LEADS.length && filtered.length === 0) {
      setActionState("ready");
      leadsList.innerHTML = `<p class="text-muted" style="margin-top:12px">Nenhum lead encontrado para esse filtro/busca.</p>`;
    }
  }

  function renderLeads(items) {
    setActionState(items.length ? "ready" : (ALL_LEADS.length ? "ready" : "empty"));

    if (!items.length) {
      leadsList.innerHTML = "";
      return;
    }

    const html = items.map(({ lead, status }) => {
      const d = leadToDataset(lead);
      const pill = formatTempPill(status);
      return `
        <div class="lead-row" role="button" tabindex="0"
          data-open-details
          data-id="${escapeHtml(d.id)}"
          data-name="${escapeHtml(d.name)}"
          data-phone="${escapeHtml(d.phone)}"
          data-origin="${escapeHtml(d.origin)}"
          data-time="${escapeHtml(d.time)}"
          data-pages="${escapeHtml(d.pages)}"
          data-price="${escapeHtml(d.price)}"
          data-score="${escapeHtml(d.score)}"
          data-prob="${escapeHtml(d.prob)}"
        >
          <div>
            <p class="lead-row__name">${escapeHtml(d.name)}</p>
            <p class="text-muted">${escapeHtml(d.origin)} • ${escapeHtml(d.phone)}</p>
          </div>
          <div class="lead-row__meta">
            <span class="${pill.cls}">${pill.label}</span>
            <button class="btn btn--small" type="button" data-open-details
              data-id="${escapeHtml(d.id)}"
              data-name="${escapeHtml(d.name)}"
              data-phone="${escapeHtml(d.phone)}"
              data-origin="${escapeHtml(d.origin)}"
              data-time="${escapeHtml(d.time)}"
              data-pages="${escapeHtml(d.pages)}"
              data-price="${escapeHtml(d.price)}"
              data-score="${escapeHtml(d.score)}"
              data-prob="${escapeHtml(d.prob)}"
            >
              Ver detalhes
            </button>
          </div>
        </div>
      `;
    }).join("");

    leadsList.innerHTML = html;
  }

  function updateDailyHeroCounts() {
    const counts = { hot: 0, warm: 0, cold: 0, convertido: 0 };
    ALL_LEADS.forEach((l) => {
      const s = normalizeStatus(l);
      if (s in counts) counts[s] += 1;
    });
    if (dailyHotCount) dailyHotCount.textContent = counts.hot || 0;
    if (dailyWarmCount) dailyWarmCount.textContent = counts.warm || 0;
    if (dailyColdCount) dailyColdCount.textContent = counts.cold || 0;
    if (dailyConvertedCount) dailyConvertedCount.textContent = counts.convertido || 0;
  }

  // ==== Backend calls ====
  async function loadActionList() {
    try {
      setActionState("loading");
      const data = await window.__lr.lrApi("/acao_do_dia");
      // aceita {action_list:[...]} ou {items:[...]} ou array direto
      const list = Array.isArray(data) ? data : (data.action_list || data.items || data.leads || []);
      ALL_LEADS = Array.isArray(list) ? list : [];
      updateDailyHeroCounts();

      if (!ALL_LEADS.length) {
        setActionState("empty");
        return;
      }

      setActionState("ready");
      applyFilters();
    } catch (err) {
      console.error(err);
      setActionState("error");
    }
  }

  function csvFromLeads(rows) {
    const head = ["id", "nome", "telefone", "origem", "tempo_no_site", "paginas_visitadas", "clicou_preco", "score", "probabilidade", "status"];
    const lines = [head.join(",")];

    rows.forEach((lead) => {
      const d = leadToDataset(lead);
      const status = normalizeStatus(lead);
      const values = [
        d.id, d.name, d.phone, d.origin, d.time, d.pages, d.price, d.score, d.prob, status
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
      lines.push(values.join(","));
    });

    return lines.join("\n");
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // === Modal actions ===
  function setModalButtonsDisabled(disabled) {
    $$(".modal__actions [data-lead-action]").forEach((b) => {
      b.disabled = !!disabled;
      b.setAttribute("aria-disabled", disabled ? "true" : "false");
    });
  }

  async function sendLeadAction(action, lead) {
    // action: convert | deny | later
    const id = lead?.id ?? lead?.lead_id ?? lead?._id ?? lead?.uuid ?? "";
    const payload = { id };
    if (!id) {
      // fallback: tenta identificar pelo telefone + nome (não ideal, mas evita travar)
      payload.telefone = lead.telefone ?? lead.phone ?? "";
      payload.nome = lead.nome ?? lead.name ?? "";
    }

    if (action === "convert") return window.__lr.lrApi("/confirmar_venda", { method: "POST", body: payload });
    if (action === "deny") return window.__lr.lrApi("/negar_venda", { method: "POST", body: payload });
    // "later": não precisa bater no backend. Só tira do filtro quente.
    return { ok: true };
  }

  function removeLeadFromUI(lead) {
    const id = lead?.id ?? lead?.lead_id ?? lead?._id ?? lead?.uuid ?? "";
    if (id) {
      ALL_LEADS = ALL_LEADS.filter((l) => (l.id ?? l.lead_id ?? l._id ?? l.uuid ?? "") !== id);
    } else {
      // fallback: remove por telefone+nome
      const tel = (lead.telefone ?? lead.phone ?? "").toString();
      const nome = (lead.nome ?? lead.name ?? "").toString();
      ALL_LEADS = ALL_LEADS.filter((l) => {
        const tel2 = (l.telefone ?? l.phone ?? "").toString();
        const nome2 = (l.nome ?? l.name ?? "").toString();
        return !(tel2 === tel && nome2 === nome);
      });
    }
    updateDailyHeroCounts();
    applyFilters();
  }

  // ==== Events ====
  function bindFilterChips() {
    const chips = $$(".chip-group .chip", actionList);
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.remove("chip--active"));
        chip.classList.add("chip--active");
        ACTIVE_FILTER = chip.dataset.filter || "hot";
        applyFilters();
      });
    });

    // daily cards jump
    $$("[data-jump-filter]").forEach((b) => {
      b.addEventListener("click", () => {
        const f = b.dataset.jumpFilter || "hot";
        const target = $(`.chip-group .chip[data-filter="${CSS.escape(f)}"]`, actionList);
        if (target) target.click();
        actionList.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function bindSearch() {
    if (!leadSearch) return;
    leadSearch.addEventListener("input", () => {
      ACTIVE_SEARCH = leadSearch.value || "";
      applyFilters();
    });
  }

  function bindActionListClicks() {
    // Delegação: abrir modal clicando no item inteiro ou no botão
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-open-details]");
      if (!btn) return;

      // se clicou no botão dentro da row, não duplica
      ev.preventDefault();

      const dataset = btn.dataset || {};
      // guarda current lead (para ação no modal)
      CURRENT_LEAD = {
        id: dataset.id || "",
        nome: dataset.name || "",
        telefone: dataset.phone || "",
        origem: dataset.origin || "",
        tempo_no_site: dataset.time || "",
        paginas_visitadas: dataset.pages || "",
        clicou_preco: dataset.price || "",
        score: dataset.score || "",
        probabilidade: dataset.prob || ""
      };

      // modal.js já lê dataset-* e abre
      if (window.__lrModal && typeof window.__lrModal.open === "function") {
        window.__lrModal.open(dataset);
      }
    });

    // Acessibilidade: Enter/Space na row
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      const row = ev.target.closest(".lead-row[data-open-details]");
      if (!row) return;
      ev.preventDefault();
      row.click();
    });
  }

  function bindModalActions() {
    document.addEventListener("click", async (ev) => {
      const btn = ev.target.closest("[data-lead-action]");
      if (!btn) return;

      if (!CURRENT_LEAD) return;

      const action = btn.dataset.leadAction;
      try {
        setModalButtonsDisabled(true);
        await sendLeadAction(action, CURRENT_LEAD);
        // remove da UI e fecha modal
        removeLeadFromUI(CURRENT_LEAD);
        if (window.__lrModal && typeof window.__lrModal.close === "function") window.__lrModal.close();
        CURRENT_LEAD = null;
      } catch (e) {
        console.error(e);
        alert("Não foi possível registrar a ação. Verifique sua API key e tente novamente.");
      } finally {
        setModalButtonsDisabled(false);
      }
    });
  }

  function bindRetryAndSeedInsideActionList() {
    actionBody.addEventListener("click", (ev) => {
      const retry = ev.target.closest("[data-retry]");
      if (retry) loadActionList();

      const seed = ev.target.closest("[data-seed10]");
      if (seed) btnSeed10?.click();
    });
  }

  // ==== Existing features (save/load/test/seed/real lead) ====
  function initConnectionForm() {
    const auth = window.getAuth ? window.getAuth() : null; // not exposed; fallback localStorage
    // We don't have access to getAuth directly (it lives in index.html inline), so read storage:
    const cid = localStorage.getItem("leadrank_client_id") || localStorage.getItem("client_id") || localStorage.getItem("LR_CLIENT_ID") || "";
    const key = localStorage.getItem("leadrank_api_key") || localStorage.getItem("api_key") || localStorage.getItem("LR_API_KEY") || "";
    if (clientId) clientId.value = cid;
    if (apiKey) apiKey.value = key;

    btnSave?.addEventListener("click", () => {
      const cid2 = (clientId?.value || "").trim();
      const key2 = (apiKey?.value || "").trim();
      if (!cid2 || !key2) {
        setMsg("warn", "Preencha client_id e api_key.");
        return;
      }
      // setAuth is in global scope (index.html)
      if (typeof window.setAuth === "function") window.setAuth(cid2, key2);
      else {
        localStorage.setItem("leadrank_client_id", cid2);
        localStorage.setItem("leadrank_api_key", key2);
      }
      setMsg("ok", "Credenciais salvas. Agora você pode carregar o dashboard.");
    });

    btnLoad?.addEventListener("click", () => {
      loadActionList();
      loadDashboardSummary().catch(console.error);
    });
  }

  async function loadDashboardSummary() {
    try {
      hideInlineMsg(msg);
      const data = await window.__lr.lrApi("/dashboard_data");
      // Exemplos de estrutura: {kpis:{...}, funil:{...}} ou flat
      const kpis = data.kpis || data;
      if (kpiConv) kpiConv.textContent = kpis.convertidos ?? kpis.convertido ?? kpis.conversoes ?? "—";
      if (kpiNeg) kpiNeg.textContent = kpis.negados ?? kpis.negado ?? "—";
      if (kpiPend) kpiPend.textContent = kpis.pendentes ?? kpis.pendente ?? "—";

      if (wsPill) wsPill.textContent = "workspace: " + (data.workspace || data.client_id || (localStorage.getItem("leadrank_client_id") || "—"));

      // Resumo textual simples
      if (summaryWrap) {
        const lines = [];
        if (data.resumo) lines.push(String(data.resumo));
        if (data.total_leads != null) lines.push(`Total de leads: ${data.total_leads}`);
        if (lines.length === 0) lines.push("Dashboard carregado com sucesso.");
        summaryWrap.textContent = lines.join(" • ");
      }

      // Charts (se tiver dados)
      renderCharts(data);
      setMsg("ok", "Dashboard carregado.");
    } catch (e) {
      console.error(e);
      setMsg("error", "Não foi possível carregar /dashboard_data. Confira client_id e api_key.");
    }
  }

  let funnelChart = null;
  let statusChart = null;

  function renderCharts(data) {
    const funnelCtx = el("funnelChart")?.getContext?.("2d");
    const statusCtx = el("statusChart")?.getContext?.("2d");
    if (!funnelCtx || !statusCtx || !window.Chart) return;

    // Tenta inferir estruturas de dados
    const funil = data.funil || data.funnel || {};
    const temp = funil.temperatura || data.temperatura || {};
    const hot = Number(temp.quentes ?? temp.hot ?? 0);
    const warm = Number(temp.mornos ?? temp.warm ?? 0);
    const cold = Number(temp.frios ?? temp.cold ?? 0);
    const pend = Number(temp.pendentes ?? temp.pending ?? 0);

    const pipeline = data.pipeline || data.status || {};
    const conv = Number(pipeline.convertidos ?? pipeline.convertido ?? data.convertidos ?? 0);
    const neg = Number(pipeline.negados ?? pipeline.negado ?? data.negados ?? 0);
    const pend2 = Number(pipeline.pendentes ?? pipeline.pendente ?? data.pendentes ?? 0);

    const destroyIf = (c) => { try { c?.destroy?.(); } catch (_) {} };

    destroyIf(funnelChart);
    destroyIf(statusChart);

    funnelChart = new Chart(funnelCtx, {
      type: "doughnut",
      data: {
        labels: ["Quentes", "Mornos", "Frios", "Pendentes"],
        datasets: [{ data: [hot, warm, cold, pend] }]
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } }
    });

    statusChart = new Chart(statusCtx, {
      type: "doughnut",
      data: {
        labels: ["Convertidos", "Negados", "Pendentes"],
        datasets: [{ data: [conv, neg, pend2] }]
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } }
    });
  }

  function bindExportButtons() {
    const handler = () => {
      if (!ALL_LEADS.length) {
        alert("Sem leads para exportar.");
        return;
      }
      const csv = csvFromLeads(ALL_LEADS);
      download("leads.csv", csv);
    };
    btnExport?.addEventListener("click", handler);
    btnExport2?.addEventListener("click", handler);
  }

  function bindTestAndSeed() {
    btnTest?.addEventListener("click", async () => {
      try {
        hideInlineMsg(testMsg);
        // Endpoint do seu backend (ajuste se o nome for diferente)
        const payload = {
          nome: "Lead Teste",
          email: "teste@exemplo.com",
          telefone: "(11) 90000-0000",
          origem: "teste-rapido",
          tempo_no_site: 180,
          paginas_visitadas: 4,
          clicou_preco: 1
        };
        const data = await window.__lr.lrApi("/qualificar_lead", { method: "POST", body: payload });
        setInlineMsg(testMsg, "ok", "Lead de teste enviado. Score: " + (data.score ?? data.pontuacao ?? "—"));
      } catch (e) {
        console.error(e);
        setInlineMsg(testMsg, "error", "Falha ao enviar lead de teste. Verifique a API.");
      }
    });

    btnSeed10?.addEventListener("click", async () => {
      try {
        hideInlineMsg(testMsg);
        const data = await window.__lr.lrApi("/seed_10", { method: "POST", body: {} });
        setInlineMsg(testMsg, "ok", data.message || "10 leads gerados com sucesso.");
        // Recarrega action list após seed
        await loadActionList();
      } catch (e) {
        console.error(e);
        setInlineMsg(testMsg, "error", "Falha ao gerar leads de teste.");
      }
    });

    // seed dentro da action list (botão vazio)
    actionList?.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-seed10]");
      if (b) btnSeed10?.click();
    });
  }

  function bindRealLeadForm() {
    if (!realLeadForm) return;

    realLeadForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      try {
        hideInlineMsg(realLeadMsg);
        const payload = {
          nome: el("realNome")?.value || "",
          email: el("realEmail")?.value || "",
          telefone: el("realTelefone")?.value || "",
          origem: el("realOrigem")?.value || "",
          tempo_no_site: Number(el("realTempo")?.value || 0),
          paginas_visitadas: Number(el("realPaginas")?.value || 0),
          clicou_preco: Number(el("realPreco")?.value || 0)
        };
        const data = await window.__lr.lrApi("/qualificar_lead", { method: "POST", body: payload });
        setInlineMsg(realLeadMsg, "ok", "Lead registrado. Score: " + (data.score ?? data.pontuacao ?? "—"));
        // Recarrega action list
        await loadActionList();
      } catch (e) {
        console.error(e);
        setInlineMsg(realLeadMsg, "error", "Não foi possível registrar o lead. Verifique a API key.");
      }
    });
  }

  function init() {
    // Expor funções do index.html ao dashboard.js (caso o usuário já tenha as variáveis globais)
    // Se setAuth não estiver global, criamos.
    if (typeof window.setAuth !== "function") {
      window.setAuth = (cid, key) => {
        localStorage.setItem("leadrank_client_id", cid);
        localStorage.setItem("leadrank_api_key", key);
      };
    }

    bindFilterChips();
    bindSearch();
    bindActionListClicks();
    bindModalActions();
    bindRetryAndSeedInsideActionList();

    initConnectionForm();
    bindExportButtons();
    bindTestAndSeed();
    bindRealLeadForm();

    // Auto-load if already has credentials
    const cid = localStorage.getItem("leadrank_client_id") || localStorage.getItem("client_id") || localStorage.getItem("LR_CLIENT_ID") || "";
    const key = localStorage.getItem("leadrank_api_key") || localStorage.getItem("api_key") || localStorage.getItem("LR_API_KEY") || "";
    if (cid && key) {
      loadActionList();
      loadDashboardSummary().catch(() => {});
    } else {
      setActionState("empty");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
