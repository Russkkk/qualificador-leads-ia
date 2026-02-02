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

  function getLeadFromDataset(ds) {
    return {
      id: ds.leadId || ds.id || "",
      nome: ds.nome || ds.name || "",
      telefone: ds.telefone || ds.phone || "",
      email: ds.email || "",
      origem: ds.origem || ds.origin || "",
      score: ds.score || "",
      prob: ds.prob || ds.probabilidade || ""
    };
  }

  function fillLeadDetails(lead) {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || "—";
    };

    set("leadNameValue", lead.nome);
    set("leadPhoneValue", lead.telefone);
    set("leadEmailValue", lead.email);
    set("leadSourceValue", lead.origem);
    set("leadScoreValue", lead.score);
    set("leadProbValue", lead.prob);

    const hiddenId = document.getElementById("leadId");
    if (hiddenId) hiddenId.value = lead.id || "";
  }

  function isInteractiveChild(target) {
    return !!target.closest(
      "button, a, input, select, textarea, label, [data-stop-row-open]"
    );
  }

  const modalEl = document.getElementById("leadDetailsModal");
  if (!modalEl) return;

  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open-modal]");
    if (openBtn) {
      const selector = openBtn.getAttribute("data-open-modal");
      const m = document.querySelector(selector);
      openModal(m, openBtn);
      return;
    }

    const closeBtn = e.target.closest("[data-close-modal]");
    if (closeBtn) {
      const m = closeBtn.closest(".modal");
      closeModal(m);
      return;
    }
  });

  document.addEventListener("mousedown", (e) => {
    const open = e.target.closest(".modal.is-open");
    if (!open) return;
    if (e.target.classList.contains("modal__backdrop")) closeModal(open);
  });

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-open-details], tr.lead-row, .lead-row");
    if (!trigger) return;

    if (isInteractiveChild(e.target) && !e.target.closest("[data-open-details]")) return;

    const lead = getLeadFromDataset(trigger.dataset || {});
    fillLeadDetails(lead);
    openModal(modalEl, trigger);
  });

  document.addEventListener("keydown", (e) => {
    const row = e.target.closest("tr.lead-row, .lead-row");
    if (!row) return;
    if (e.key !== "Enter" && e.key !== " ") return;

    e.preventDefault();
    const lead = getLeadFromDataset(row.dataset || {});
    fillLeadDetails(lead);
    openModal(modalEl, row);
  });

  const form = document.getElementById("leadActionForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const payload = Object.fromEntries(data.entries());
      payload.confirmSale = data.get("confirmSale") === "on";

      console.log("Salvar ação:", payload);

      closeModal(modalEl);
    });
  }
})();
