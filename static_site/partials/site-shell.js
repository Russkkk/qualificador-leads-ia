const loadPartial = async (selector, partialPath) => {
  const target = document.querySelector(selector);
  if (!target) {
    return null;
  }

  const response = await fetch(partialPath);
  if (!response.ok) {
    console.warn(`Não foi possível carregar ${partialPath}.`);
    return null;
  }

  const html = await response.text();
  target.innerHTML = html;
  return target;
};

const applyActiveNav = (root, activeNav) => {
  if (!root || !activeNav) {
    return;
  }

  const activeLink = root.querySelector(`[data-nav="${activeNav}"]`);
  if (activeLink) {
    activeLink.setAttribute("aria-current", "page");
  }
};

const applyHeaderActions = (root) => {
  const actionsSlot = root?.querySelector("[data-header-actions]");
  const actionsTemplate = document.getElementById("header-actions-template");
  if (!actionsSlot || !actionsTemplate) {
    return;
  }

  actionsSlot.innerHTML = "";
  actionsSlot.append(actionsTemplate.content.cloneNode(true));
};

document.addEventListener("DOMContentLoaded", async () => {
  const activeNav = document.body.dataset.activeNav;

  try {
    const header = await loadPartial("[data-include='site-header']", "partials/site-header.html");
    applyActiveNav(header, activeNav);
    applyHeaderActions(header);
    document.dispatchEvent(new CustomEvent("site-shell:header-ready"));

    await loadPartial("[data-include='site-footer']", "partials/site-footer.html");
  } catch (error) {
    console.warn("Falha ao carregar o template base.", error);
  }
});
