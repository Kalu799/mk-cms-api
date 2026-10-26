<script setup>
import { ref, computed, onMounted, watch } from "vue";

definePageMeta({
  layout: "admin",
});
// ========================================
// ÉTAT DE LA PAGE
// ========================================

const quotes = ref([]);
const selectedStatus = ref("");
const selectedMovie = ref("");
const selectedQuote = ref("");
const isLoading = ref(true);
const errorMessage = ref("");
const loaded = ref(false);
const currentPage = ref(1);
const pageSize = 10;

// Revient en haut sur mobile après le passage à la page suivante.
watch(
  currentPage,
  (page, previousPage) => {
    if (
      page <= previousPage ||
      !window.matchMedia("(max-width: 700px)").matches
    ) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  },
  { flush: "post" },
);

// ========================================
// FILTRAGE DES CITATIONS
// ========================================

const filteredQuotes = computed(() => {
  return quotes.value.filter((quote) => {
    const matchesStatus =
      !selectedStatus.value || quote.quote_status === selectedStatus.value;

    const matchesMovie =
      !selectedMovie.value || String(quote.ID_movie) === selectedMovie.value;

    const matchesQuote =
      !selectedQuote.value || String(quote.ID_quote) === selectedQuote.value;

    return matchesStatus && matchesMovie && matchesQuote;
  });
});

const paginatedQuotes = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredQuotes.value.slice(start, start + pageSize);
});

watch([selectedStatus, selectedMovie, selectedQuote], () => {
  currentPage.value = 1;
});

watch(filteredQuotes, () => {
  const lastPage = Math.max(
    1,
    Math.ceil(filteredQuotes.value.length / pageSize),
  );
  if (currentPage.value > lastPage) currentPage.value = lastPage;
});

// ========================================
// CHARGEMENT DES CITATIONS DEPUIS L'API
// ========================================

const loadQuotes = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const token = sessionStorage.getItem("movieKingAdminToken");

    if (!token) {
      throw new Error("Session administrateur introuvable. Reconnecte-toi.");
    }

    const response = await $fetch("/api/admin/quotes", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    quotes.value = response.quotes || [];
    loaded.value = true;
  } catch (error) {
    errorMessage.value =
      error.data?.statusMessage ||
      error.message ||
      "Impossible de charger les citations.";
  } finally {
    isLoading.value = false;
  }
};

// ========================================
// OUTILS D'AFFICHAGE
// ========================================

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
};

const formatStatus = (status) => {
  if (!status) return "Non défini";

  return String(status)
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
};

const statusClass = (status) => {
  const value = String(status || "").toLowerCase();

  if (value === "approved") return "status-published";
  if (value === "pending") return "status-pending";
  if (value === "rejected") return "status-archived";

  return "status-default";
};

// ========================================
// INITIALISATION
// ========================================

onMounted(() => {
  loadQuotes();
});
</script>

<template>
  <section class="page-content quotes-page">
    <!-- EN-TÊTE -->
    <header class="page-header">
      <div>
        <p class="eyebrow">MOVIE KING / CONTENU</p>
        <h1>Gestion des citations</h1>
        <p class="page-description">
          Consulte et retrouve les citations associées aux films de ton quiz.
        </p>
      </div>

      <button
        class="refresh-button"
        type="button"
        :disabled="isLoading"
        @click="loadQuotes"
      >
        <span aria-hidden="true">↻</span>
        {{ isLoading ? "Chargement..." : "Actualiser" }}
      </button>
    </header>

    <!-- RÉSUMÉ -->
    <div class="summary-card">
      <div class="summary-icon" aria-hidden="true">❝</div>

      <div v-show="loaded">
        <p class="summary-label">Citations enregistrées</p>
        <p class="summary-number">
          {{ quotes.length }}
        </p>
      </div>
    </div>

    <!-- ERREUR -->
    <div v-if="errorMessage" class="feedback error" role="alert">
      <p>{{ errorMessage }}</p>

      <button type="button" class="retry-button" @click="loadQuotes">
        Réessayer
      </button>
    </div>

    <!-- CHARGEMENT -->
    <div v-else-if="isLoading" class="feedback">
      Chargement des citations...
    </div>

    <!-- TABLEAU DES CITATIONS -->
    <div v-else class="table-card">
      <!-- RECHERCHE ET FILTRES -->
      <div class="filters">
        <select
          v-model="selectedStatus"
          aria-label="Filtrer par statut"
          class="status-filter"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvées</option>
          <option value="rejected">Rejetées</option>
        </select>

        <AdminQuoteMovieFilter
          v-model:movie="selectedMovie"
          v-model:quote="selectedQuote"
          :quotes="quotes"
        />
      </div>

      <!-- EN-TÊTE DU TABLEAU -->
      <div class="table-header">
        <h2>Liste des citations</h2>

        <span class="result-count">
          {{ filteredQuotes.length }}
          résultat{{ filteredQuotes.length > 1 ? "s" : "" }}
        </span>
      </div>

      <!-- CONTENU DU TABLEAU -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Citation</th>
              <th>Film associé</th>
              <th>statut</th>
              <th>Langue</th>
              <th>Date d'ajout</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="quote in paginatedQuotes" :key="quote.ID_quote">
              <td class="quote-cell">
                <span class="quote-mark" aria-hidden="true">“</span>
                <span>
                  {{ quote.quote_text || "Citation sans texte" }}
                </span>
                <span class="quote-mark quote-mark-end" aria-hidden="true"
                  >”</span
                >
              </td>

              <td class="movie-cell">
                {{ quote.movie_title || "Film inconnu" }}
              </td>

              <td>
                <span
                  class="status-badge"
                  :class="statusClass(quote.quote_status)"
                >
                  {{ formatStatus(quote.quote_status) }}
                </span>
              </td>

              <td>
                <span class="language-badge">
                  {{ quote.quote_language || "—" }}
                </span>
              </td>

              <td class="date-cell">
                {{ formatDate(quote.quote_created_at) }}
              </td>
            </tr>

            <!-- AUCUN RÉSULTAT -->
            <tr v-if="filteredQuotes.length === 0">
              <td colspan="5" class="empty-state">
                <span class="empty-icon" aria-hidden="true">⌕</span>

                <p>
                  {{
                    quotes.length === 0
                      ? "Aucune citation enregistrée."
                      : "Aucune citation ne correspond à ta recherche."
                  }}
                </p>

                <button
                  v-if="selectedStatus || selectedMovie || selectedQuote"
                  type="button"
                  class="reset-button"
                  @click="
                    selectedStatus = '';
                    selectedMovie = '';
                    selectedQuote = '';
                  "
                >
                  Réinitialiser les filtres
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Affichage mobile des citations -->
      <div class="mobile-quote-list">
        <article
          v-for="quote in paginatedQuotes"
          :key="quote.ID_quote"
          class="mobile-quote-card"
        >
          <p class="mobile-quote-text">
            « {{ quote.quote_text || "Citation sans texte" }} »
          </p>

          <h3>{{ quote.movie_title || "Film inconnu" }}</h3>

          <div class="mobile-quote-details">
            <span class="status-badge" :class="statusClass(quote.quote_status)">
              {{ formatStatus(quote.quote_status) }}
            </span>

            <span class="language-badge">
              {{ quote.quote_language || "—" }}
            </span>
          </div>

          <p class="mobile-quote-date">
            Ajoutée le {{ formatDate(quote.quote_created_at) }}
          </p>
        </article>

        <p v-if="filteredQuotes.length === 0" class="mobile-empty-state">
          {{
            quotes.length === 0
              ? "Aucune citation enregistrée."
              : "Aucune citation ne correspond à tes filtres."
          }}
        </p>
      </div>

      <AdminPagination
        v-model:current-page="currentPage"
        :total-items="filteredQuotes.length"
        :page-size="pageSize"
      />
    </div>
  </section>
</template>

<style scoped>
/* ========================================
   PAGE ET EN-TÊTE
======================================== */

.quotes-page {
  padding: 1px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  color: #212121;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #52796f;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.page-description {
  margin: 10px 0 0;
  color: #ff626b;
  font-size: 14px;
  line-height: 1.6;
}

/* ========================================
   BOUTON ACTUALISER
======================================== */

.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border: 1px solid #739c91;
  border-radius: 9px;
  background: #739c91;
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.refresh-button:hover:not(:disabled) {
  background: #52796f;
  transform: translateY(-1px);
}

.refresh-button:disabled {
  opacity: 0.65;
  cursor: wait;
}

/* ========================================
   STATISTIQUE
======================================== */

.summary-card,
.table-card {
  border: 1px solid #e5e0d6;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgb(33 33 33 / 4%);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  width: fit-content;
  min-width: 250px;
  padding: 20px 24px;
  margin-bottom: 24px;
}

.summary-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 12px;
  background: #e7f0ec;
  color: #52796f;
  font-size: 28px;
}

.summary-label {
  margin: 0 0 5px;
  color: #6b706d;
  font-size: 13px;
}

.summary-number {
  margin: 0;
  color: #212121;
  font-size: 27px;
  font-weight: 700;
}

/* ========================================
   RECHERCHE ET FILTRES
======================================== */

.filters {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 22px;
}

.status-filter:focus {
  border-color: #739c91;
  box-shadow: 0 0 0 3px rgb(115 156 145 / 15%);
  outline: none;
}

.status-filter {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 13px 14px;
  border: 1px solid #dedcd3;
  border-radius: 9px;
  outline: none;
  background: #faf9f5;
  color: #212121;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

/* ========================================
   CARTE ET EN-TÊTE DU TABLEAU
======================================== */

.table-card {
  padding: 24px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.table-header h2 {
  margin: 0;
  color: #212121;
  font-size: 17px;
  font-weight: 700;
}

.result-count {
  color: #777d79;
  font-size: 12px;
  white-space: nowrap;
}

/* ========================================
   TABLEAU
======================================== */

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #eae7df;
  border-radius: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

thead {
  background: #f7f4ea;
}

th {
  padding: 15px 16px;
  border-bottom: 1px solid #e5e0d6;
  color: #666d68;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
}

td {
  padding: 17px 16px;
  border-bottom: 1px solid #f0eee7;
  color: #343835;
  font-size: 13px;
  line-height: 1.6;
  vertical-align: middle;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr {
  transition: background 0.15s ease;
}

tbody tr:hover {
  background: #f9faf6;
}

.quote-cell {
  min-width: 230px;
  max-width: 360px;
  color: #212121;
  font-style: italic;
  overflow-wrap: anywhere;
}

.quote-mark {
  margin-right: 5px;
  color: #739c91;
  font-size: 20px;
  font-weight: 800;
}

.quote-mark-end {
  margin-right: 0;
  margin-left: 1px;
}

.movie-cell {
  min-width: 150px;
  color: #212121;
  font-weight: 700;
}

.language-badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 6px;
  background: #e7f0ec;
  color: #42675d;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.source-cell,
.date-cell {
  color: #777d79;
}

.date-cell {
  min-width: 100px;
  white-space: nowrap;
}

/* ========================================
   STATUTS
======================================== */

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  background: #e7f0ec;
  color: #42675d;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.status-published {
  background: #e7f0ec;
  color: #42675d;
}

.status-pending {
  background: #fff2cc;
  color: #806000;
}

.status-archived {
  background: #fce8e6;
  color: #b8403b;
}

.status-default {
  background: #f0eee7;
  color: #666d68;
}

/* ========================================
   CHARGEMENT ET ERREURS
======================================== */

.feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 150px;
  padding: 24px;
  border: 1px solid #e5e0d6;
  border-radius: 14px;
  background: #ffffff;
  color: #6b706d;
  font-size: 13px;
  text-align: center;
}

.feedback.error {
  color: #b8403b;
}

.feedback p {
  margin: 0;
}

.retry-button {
  padding: 9px 13px;
  border: 1px solid #d9534f;
  border-radius: 7px;
  background: #ffffff;
  color: #b8403b;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.retry-button:hover {
  background: #fce8e6;
}

/* ========================================
   AUCUN RÉSULTAT
======================================== */

.empty-state {
  padding: 38px 16px;
  color: #777d79;
  text-align: center;
}

.empty-icon {
  color: #739c91;
  font-size: 26px;
}

.empty-state p {
  margin: 8px 0 12px;
  font-size: 13px;
}

.reset-button {
  padding: 8px 11px;
  border: none;
  border-radius: 6px;
  background: #e7f0ec;
  color: #42675d;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.reset-button:hover {
  background: #d7e7df;
}

/* ========================================
   RESPONSIVE
======================================== */

@media (max-width: 900px) {
  .filters {
    grid-template-columns: 160px minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .filters {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 700px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .refresh-button {
    width: 100%;
  }

  .summary-card {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
  }

  .table-card {
    padding: 16px;
  }

  .table-header {
    align-items: flex-start;
    flex-direction: column;
  }

  th,
  td {
    padding: 13px 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Cartes mobiles : masquées sur ordinateur */
.mobile-quote-list {
  display: none;
}

@media (max-width: 700px) {
  .quotes-page {
    min-width: 0;
  }

  .filters {
    grid-template-columns: minmax(0, 1fr);
  }

  .table-wrapper {
    display: none;
  }

  .mobile-quote-list {
    display: grid;
    gap: 12px;
  }

  .mobile-quote-card {
    min-width: 0;
    padding: 16px;
    border: 1px solid #e5e0d6;
    border-radius: 12px;
    background: #faf9f5;
  }

  .mobile-quote-text {
    margin: 0 0 14px;
    color: #212121;
    font-size: 14px;
    line-height: 1.7;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  .mobile-quote-card h3 {
    margin: 0 0 12px;
    font-size: 14px;
    overflow-wrap: anywhere;
    color: #000000;
  }

  .mobile-quote-details {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .mobile-quote-date {
    margin: 12px 0 0;
    color: #777d79;
    font-size: 12px;
  }

  .mobile-empty-state {
    padding: 20px 8px;
    color: #777d79;
    font-size: 13px;
    text-align: center;
  }
}
.page-content,
.quotes-page,
.users-page,
.stats-page {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}
</style>
