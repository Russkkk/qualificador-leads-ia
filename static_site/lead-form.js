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

if (leadForm) {
  leadForm.addEventListener("submit", async (event) => {
    if (!leadForm.action || leadForm.action.includes("SEU_FORM_ID")) {
      showStatus("Atualize o link do formulário (Formspree/Web3Forms) antes de enviar.", "warning");
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const formData = new FormData(leadForm);

    try {
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
