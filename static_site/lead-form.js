const leadForm = document.getElementById("leadForm");
const formStatus = document.getElementById("formStatus");

if (window.lucide) {
  window.lucide.createIcons();
}

const showStatus = (message, tone = "success") => {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.dataset.tone = tone;
};

const saveLeadLocally = (payload) => {
  const stored = localStorage.getItem("leadrank_leads");
  const leads = stored ? JSON.parse(stored) : [];
  leads.push({
    ...payload,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem("leadrank_leads", JSON.stringify(leads));
};

const serializeForm = (form) => {
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = value;
  });
  return data;
};

if (leadForm) {
  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(leadForm);

    try {
      if (!leadForm.action || leadForm.action.includes("SEU_FORM_ID")) {
        saveLeadLocally(serializeForm(leadForm));
        leadForm.reset();
        showStatus(
          "Lead salvo localmente para teste. Configure o endpoint (Formspree/Web3Forms) para envios reais.",
          "warning"
        );
        return;
      }

      const response = await fetch(leadForm.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        leadForm.reset();
        showStatus("Recebido! Vamos entrar em contato com você em até 24h.");
      } else {
        showStatus("Não conseguimos enviar agora. Tente novamente em instantes.", "error");
      }
    } catch (error) {
      showStatus("Falha de conexão. Verifique sua internet e tente de novo.", "error");
    }
  });
}
