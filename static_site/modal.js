/* Accessible modal for Lead Details
   - Uses inert on the rest of the page to avoid focus leaving the modal.
   - Avoids aria-hidden on an ancestor that still contains focus (Chrome warning).
   - Exposes window.__lrModal.open(dataset) / close()
*/

(() => {
  const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const modalEl = document.getElementById("leadDetailsModal");
  if (!modalEl) return;

  let lastFocused = null;

  const nodes = {
    title: document.getElementById("leadDetailsTitle"),
    phone: document.getElementById("leadDetailsPhone"),
    origin: document.getElementById("leadDetailsOrigin"),
    time: document.getElementById("leadDetailsTime"),
    pages: document.getElementById("leadDetailsPages"),
    price: document.getElementById("leadDetailsPrice"),
    score: document.getElementById("leadDetailsScore"),
    copyPhone: document.getElementById("copyPhone")
  };

  function setInertForSiblings(enable) {
    // Make rest of page inert while modal is open
    const bodyChildren = Array.from(document.body.children);
    bodyChildren.forEach((el) => {
      if (el === modalEl) return;
      if (enable) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    const focusables = Array.from(modalEl.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null && !el.hasAttribute("inert")
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
    if (e.key === "Escape") close();
  }

  function open(dataset = {}, triggerEl = null) {
    lastFocused = triggerEl || document.activeElement;

    // Fill fields (dataset comes from data-* attributes)
    const name = dataset.name || dataset.nome || "—";
    const phone = dataset.phone || dataset.telefone || "—";
    const origin = dataset.origin || dataset.origem || "—";
    const time = dataset.time || dataset.tempo || "—";
    const pages = dataset.pages || dataset.paginas || "—";
    const price = dataset.price || dataset.preco || "—";
    const score = (dataset.score ?? "—");
    const prob = (dataset.prob ?? dataset.probabilidade ?? "—");

    if (nodes.title) nodes.title.textContent = name;
    if (nodes.phone) nodes.phone.textContent = phone;
    if (nodes.origin) nodes.origin.textContent = origin;
    if (nodes.time) nodes.time.textContent = time !== "—" ? `${time}` : "—";
    if (nodes.pages) nodes.pages.textContent = pages;
    if (nodes.price) nodes.price.textContent = price;
    if (nodes.score) nodes.score.textContent = `${score} • ${prob}`;

    // Show modal
    modalEl.hidden = false;
    modalEl.classList.add("modal--open");
    modalEl.setAttribute("aria-hidden", "false");

    // Inert siblings (prevents focus outside and avoids aria-hidden focus warning)
    setInertForSiblings(true);

    // Focus first focusable inside
    const firstFocusable = modalEl.querySelector(FOCUSABLE);
    if (firstFocusable) firstFocusable.focus();

    modalEl.addEventListener("keydown", trapFocus);
    window.addEventListener("keydown", escToClose);
  }

  function close() {
    // Move focus out BEFORE hiding/aria-hidden
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    } else {
      // fallback: blur if focus is inside modal
      if (modalEl.contains(document.activeElement)) {
        document.activeElement.blur?.();
      }
    }

    modalEl.classList.remove("modal--open");
    modalEl.setAttribute("aria-hidden", "true");
    modalEl.hidden = true;

    setInertForSiblings(false);

    modalEl.removeEventListener("keydown", trapFocus);
    window.removeEventListener("keydown", escToClose);

    lastFocused = null;
  }

  // Close on backdrop / close buttons
  document.addEventListener("click", (e) => {
    if (!modalEl.classList.contains("modal--open")) return;

    if (e.target.closest("[data-close-details]") || e.target.classList.contains("modal__backdrop")) {
      e.preventDefault();
      close();
    }
  });

  // Copy phone
  nodes.copyPhone?.addEventListener("click", async () => {
    const text = nodes.phone?.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      nodes.copyPhone.textContent = "Copiado!";
      setTimeout(() => (nodes.copyPhone.textContent = "Copiar"), 1200);
    } catch (_) {
      alert("Não foi possível copiar. Copie manualmente: " + text);
    }
  });

  window.__lrModal = { open, close };
})();
