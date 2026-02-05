<template>
  <div class="action-list" :data-state="state">
    <div class="action-list__header">
      <h2>📞 Leads para agir agora</h2>
      <div class="action-list__actions">
        <button class="btn btn--ghost btn--small" type="button" @click="$emit('refresh')">Recarregar</button>
        <button class="btn btn--ghost btn--small" type="button" @click="$emit('seed')">Enviar leads de teste</button>
      </div>
    </div>

    <div v-if="state === 'loading'" class="card card--soft">Carregando leads...</div>
    <div v-else-if="state === 'empty'" class="card card--soft">Nenhum lead disponível no momento.</div>
    <div v-else-if="state === 'error'" class="card card--soft">Falha ao carregar. Tente novamente.</div>

    <div v-else class="action-list__rows">
      <div v-for="lead in leads" :key="lead.id" class="lead-row">
        <div>
          <p class="lead-row__name">{{ lead.nome || "Lead" }}</p>
          <p class="text-muted">{{ lead.origem || "—" }} • {{ lead.telefone || "—" }}</p>
        </div>
        <div class="lead-row__meta">
          <span class="pill pill--muted">{{ temperatureLabel(lead) }}</span>
          <button class="btn btn--small" type="button" @click="$emit('open', lead)">Ver detalhes</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  leads: { type: Array, default: () => [] },
  state: { type: String, default: "loading" }
});

const temperatureLabel = (lead) => {
  const prob = Number(lead.probabilidade ?? lead.prob ?? 0);
  const score = Number(lead.score ?? 0);
  if (prob >= 0.7 || score >= 70) return "🔥 Quente";
  if (prob >= 0.35 || score >= 35) return "🟡 Morno";
  return "❄️ Frio";
};
</script>
