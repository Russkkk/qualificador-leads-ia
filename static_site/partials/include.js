document.addEventListener("DOMContentLoaded", () => {
  const targets = Array.from(document.querySelectorAll("[data-include]"));
  Promise.all(
    targets.map(async (el) => {
      const file = el.getAttribute("data-include");
      if (!file) return;
      try {
        const resp = await fetch(file);
        if (!resp.ok) throw new Error(`Failed include: ${file}`);
        el.outerHTML = await resp.text();
      } catch (err) {
        console.warn("Partial include failed", file, err);
      }
    })
  ).then(() => {
    document.dispatchEvent(new Event("partials:loaded"));
  });
});
