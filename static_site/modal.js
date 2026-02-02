(function () {
  const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let lastFocusedElement = null;

  function setInertForSiblings(modalEl, enable) {
    // Deixa o resto da página "inert" quando modal abre (evita foco fora)
    // Funciona em browsers modernos; se não suportar, só ignora.
    const bodyChildren = Array.from(document.body.children);
    bodyChildren.forEach((el) => {
      if (el === modalEl) return;
      // Evita quebrar tags script etc. (mas geralmente ok)
      if (enable) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }

  function openModal(modalEl, triggerEl) {
    if (!modalEl) return;

    lastFocusedElement = triggerEl || document.activeElement;

    modalEl.hidden = false;
    modalEl.classList.add("is-open");

    // Inert no resto da página (melhor prática)
    setInertForSiblings(modalEl, true);

    // Move foco para o primeiro elemento focável dentro do modal
    const firstFocusable = modalEl.querySelector(FOCUSABLE);
    if (firstFocusable) firstFocusable.focus();

    // Trap de foco
    modalEl.addEventListener("keydown", trapFocus);
    window.addEventListener("keydown", escToClose);
  }

  function closeModal(modalEl) {
    if (!modalEl) return;

    modalEl.classList.remove("is-open");
    modalEl.hidden = true;

    // Remove inert do resto
    setInertForSiblings(modalEl, false);

    modalEl.removeEventListener("keydown", trapFocus);
    window.removeEventListener("keydown", escToClose);

    // Volta foco para o botão que abriu
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  function trapFocus(e) {
    if (e.key !== "Tab") return;

    const modalEl = e.currentTarget;
    const focusables = Array.from(modalEl.querySelectorAll(FOCUSABLE))
      .filter((el) => el.offsetParent !== null); // ignora escondidos

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    // Shift+Tab no primeiro -> vai pro último
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    // Tab no último -> vai pro primeiro
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function escToClose(e) {
    if (e.key !== "Escape") return;
    const openModalEl = document.querySelector(".modal.is-open");
    if (openModalEl) closeModal(openModalEl);
  }

  // Delegação: abrir modal
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open-modal]");
    if (openBtn) {
      const selector = openBtn.getAttribute("data-open-modal");
      const modalEl = document.querySelector(selector);
      openModal(modalEl, openBtn);
      return;
    }

    const closeBtn = e.target.closest("[data-close-modal]");
    if (closeBtn) {
      const modalEl = closeBtn.closest(".modal");
      closeModal(modalEl);
      return;
    }
  });

  // Clique no overlay fecha
  document.addEventListener("mousedown", (e) => {
    const modalEl = e.target.closest(".modal.is-open");
    if (!modalEl) return;

    const clickedBackdrop = e.target.classList.contains("modal__backdrop");
    if (clickedBackdrop) closeModal(modalEl);
  });

  // Exemplo: preencher campos do modal (você chama isso quando clicar em um lead)
  window.fillLeadDetailsModal = function (lead) {
    // lead = { nome, telefone, origem, score }
    document.getElementById("leadNameValue").textContent = lead?.nome ?? "—";
    document.getElementById("leadPhoneValue").textContent = lead?.telefone ?? "—";
    document.getElementById("leadSourceValue").textContent = lead?.origem ?? "—";
    document.getElementById("leadScoreValue").textContent =
      lead?.score != null ? String(lead.score) : "—";
  };

  // Submit do form (substitua pela sua chamada real pra API)
  const form = document.getElementById("leadActionForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = new FormData(form);
      const payload = Object.fromEntries(data.entries());
      payload.confirmSale = data.get("confirmSale") === "on";

      console.log("Salvar ação:", payload);

      const modalEl = document.getElementById("leadDetailsModal");
      closeModal(modalEl);
    });
  }
})();

(function () {
  const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let lastFocusedElement = null;

  function setInertForSiblings(modalEl, enable) {
    const bodyChildren = Array.from(document.body.children);
    bodyChildren.forEach((el) => {
      if (el === modalEl) return;
      if (enable) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }

  function openModal(modalEl, triggerEl) {
    if (!modalEl) return;

    lastFocusedElement = triggerEl || document.activeElement;

    modalEl.hidden = false;
    modalEl.classList.add("is-open");

    setInertForSiblings(modalEl, true);

    const firstFocusable = modalEl.querySelector(FOCUSABLE);
    if (firstFocusable) firstFocusable.focus();

    modalEl.addEventListener("keydown", trapFocus);
    window.addEventListener("keydown", escToClose);
  }

  function closeModal(modalEl) {
    if (!modalEl) return;

    modalEl.classList.remove("is-open");
    modalEl.hidden = true;

    setInertForSiblings(modalEl, false);

    modalEl.removeEventListener("keydown", trapFocus);
    window.removeEventListener("keydown", escToClose);

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  function trapFocus(e) {
    if (e.key !== "Tab") return;

    const modalEl = e.currentTarget;
    const focusables = Array.from(modalEl.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    );

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function escToClose(e) {
    if (e.key !== "Escape") return;
    const openModalEl = document.querySelector(".modal.is-open");
    if (openModalEl) closeModal(openModalEl);
  }

  // Fecha no overlay e nos botões data-close-modal
  document.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-close-modal]");
    if (closeBtn) {
      const modalEl = closeBtn.closest(".modal");
      closeModal(modalEl);
      return;
    }

    const openBtn = e.target.closest("[data-open-modal]");
    if (openBtn) {
      const selector = openBtn.getAttribute("data-open-modal");
      const modalEl = document.querySelector(selector);
      openModal(modalEl, openBtn);
      return;
    }
  });

  document.addEventListener("mousedown", (e) => {
    const modalEl = e.target.closest(".modal.is-open");
    if (!modalEl) return;
    if (e.target.classList.contains("modal__backdrop")) closeModal(modalEl);
  });

  // ✅ Preenche o modal a partir do TR
  function fillFromRow(row) {
    const lead = {
      id: row.dataset.leadId,
      nome: row.dataset.nome,
      telefone: row.dataset.telefone,
      origem: row.dataset.origem,
      score: row.dataset.score,
      email: row.dataset.email,
      prob: row.dataset.prob
    };

    document.getElementById("leadNameValue").textContent = lead.nome || "—";
    document.getElementById("leadPhoneValue").textContent = lead.telefone || "—";
    document.getElementById("leadSourceValue").textContent = lead.origem || "—";
    document.getElementById("leadScoreValue").textContent = lead.score || "—";
    document.getElementById("leadEmailValue").textContent = lead.email || "—";
    document.getElementById("leadProbValue").textContent = lead.prob || "—";

    const hiddenId = document.getElementById("leadId");
    if (hiddenId) hiddenId.value = lead.id || "";
  }

  // ✅ Clique na linha abre modal (MAS não quando clicar em botão/link/input dentro da linha)
  function isInteractiveChild(target) {
    return !!target.closest("button, a, input, select, textarea, label, [data-stop-row-open]");
  }

  const modalEl = document.getElementById("leadDetailsModal");

  document.addEventListener("click", (e) => {
    const row = e.target.closest("tr.lead-row");
    if (!row) return;

    if (isInteractiveChild(e.target)) return;

    fillFromRow(row);
    openModal(modalEl, row);
  });

  // ✅ Teclado (Enter/Space) na linha
  document.addEventListener("keydown", (e) => {
    const row = e.target.closest("tr.lead-row");
    if (!row) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fillFromRow(row);
      openModal(modalEl, row);
    }
  });

  // Submit do form (troque pelo seu POST real)
  const form = document.getElementById("leadActionForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = new FormData(form);
      const payload = Object.fromEntries(data.entries());
      payload.confirmSale = data.get("confirmSale") === "on";

      console.log("Salvar ação:", payload);

      // TODO: aqui você chama sua API (ex: /confirmar_venda ou /negar_venda, etc.)
      // await fetch("/algum-endpoint", { method:"POST", headers:..., body: JSON.stringify(payload) })

      closeModal(modalEl);
    });
  }
})();