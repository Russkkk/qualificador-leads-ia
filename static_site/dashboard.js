(function () {
  const BACKEND = (window.BACKEND_URL || "https://qualificador-leads-ia.onrender.com").replace(/\/$/, "");

  function $(sel, root = document) {
    return root.querySelector(sel);
  }
  function $all(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function getApiKey() {
    return (localStorage.getItem("api_key") || "").trim();
  }
  function getClientId() {
    return (localStorage.getItem("client_id") || "").trim();
  }
  function authHeaders() {
    const apiKey = getApiKey();
    const clientId = getClientId();
    const headers = {};
    if (apiKey) headers["X-API-KEY"] = apiKey;
    if (clientId) headers["X-CLIENT-ID"] = clientId;
    return headers;
    
  }
  function authHeaders() {
    const apiKey = getApiKey();
    const clientId = getClientId();
    return {
      "X-API-KEY": apiKey,
      "X-CLIENT-ID": clientId
    };
  }

  function setState(state) {
    const wrap = $("#actionList") || $(".action-list");
    if (wrap) wrap.dataset.state = state; // loading | empty | error | ready
  }

  function normalizeTemp(item) {
    const t = (item.temperature || item.temperatura || item.temp || "").toLowerCase();
    if (t) return t;
    const prob = Number(item.probabilidade ?? item.prob ?? 0);
    const score = Number(item.score ?? 0);
    if (prob >= 0.7 || score >= 70) return "hot";
    if (prob >= 0.35 || score >= 35) return "warm";
    return "cold";
  }

  function pillForTemp(t) {
    if (t === "hot") return `<span class="pill pill--muted">🔥 Quente</span>`;
    if (t === "warm") return `<span class="pill pill--muted">🟡 Morno</span>`;
    return `<span class="pill pill--muted">❄️ Frio</span>`;
  }

  function renderList(items) {
    const container = $("#actionReady");
    if (!container) return;
    container.innerHTML = "";

    items.forEach((lead) => {
      const t = normalizeTemp(lead);

      const row = document.createElement("div");
      row.className = "lead-row";
      row.tabIndex = 0;
      row.setAttribute("role", "button");

      row.dataset.openDetails = "";
      row.dataset.leadId = lead.id ?? "";
      row.dataset.nome = lead.nome ?? "";
      row.dataset.telefone = lead.telefone ?? "";
      row.dataset.email = lead.email_lead ?? lead.email ?? "";
      row.dataset.origem = lead.origem ?? "";
      row.dataset.score = lead.score ?? "";
      row.dataset.prob = (lead.probabilidade != null ? String(lead.probabilidade) : (lead.prob ?? "")) ?? "";

      row.innerHTML = `
        <div>
          <p class="lead-row__name">${row.dataset.nome || "Lead"}</p>
          <p class="text-muted">${row.dataset.origem || "—"} • ${row.dataset.telefone || "—"}</p>
        </div>
        <div class="lead-row__meta">
          ${pillForTemp(t)}
          <button class="btn btn--small" type="button" data-open-details
            data-lead-id="${row.dataset.leadId}"
            data-nome="${escapeHtml(row.dataset.nome)}"
            data-telefone="${escapeHtml(row.dataset.telefone)}"
            data-email="${escapeHtml(row.dataset.email)}"
            data-origem="${escapeHtml(row.dataset.origem)}"
            data-score="${escapeHtml(row.dataset.score)}"
            data-prob="${escapeHtml(row.dataset.prob)}"
          >Ver detalhes</button>
        </div>
      `;

      container.appendChild(row);
    });
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function fetchActionList() {
    if (!BACKEND) {
      console.error("BACKEND_URL não definido");
      setState("error");
      return;
    }

    const apiKey = getApiKey();
    const clientId = getClientId();

    if (!clientId) {
      console.warn("client_id ausente no localStorage");
      setState("empty");
      return;
    }
    if (!apiKey) {
      console.warn("api_key ausente no localStorage");
      setState("error");
      return;
    }

    setState("loading");
    try {
      const resp = await fetch(`${BACKEND}/acao_do_dia`, {
        headers: authHeaders()
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();
      const list = data.action_list || data.items || [];
      if (!Array.isArray(list) || list.length === 0) {
        setState("empty");
        return;
      }

      renderList(list);
      setState("ready");
    } catch (err) {
      console.error("Erro ao carregar /acao_do_dia", err);
      setState("error");
    }
  }

  function wireUI() {
    const retry = document.querySelector("[data-retry]");
    if (retry) retry.addEventListener("click", fetchActionList);

    const seed10 = document.querySelector("[data-seed10]");
    if (seed10) {
      seed10.addEventListener("click", async () => {
        const apiKey = getApiKey();
        const clientId = getClientId();
        if (!apiKey || !clientId) return;

        try {
          await fetch(`${BACKEND}/seed_test_leads`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": apiKey,
              "X-CLIENT-ID": clientId
            },
            body: JSON.stringify({ client_id: clientId, n: 10 })
          });
        } catch (e) {
          console.warn("seed_test_leads falhou", e);
        }
        fetchActionList();
      });
    }

    const exportBtn = document.querySelector("[data-export]");
    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        const clientId = getClientId();
        const apiKey = getApiKey();
        if (!clientId || !apiKey) return;
        try {
          const resp = await fetch(`${BACKEND}/leads_export.csv`, {
            headers: authHeaders()
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          const disposition = resp.headers.get("Content-Disposition") || "";
          const match = /filename="([^"]+)"/i.exec(disposition);
          const filename = match?.[1] || `leadrank_${clientId}.csv`;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.warn("Export falhou", err);
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireUI();
    fetchActionList();
  });
})();
