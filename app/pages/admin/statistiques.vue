<script setup>
import { ref, computed, onMounted, watch } from 'vue'

definePageMeta({
  layout: 'admin',
})

// ========================================
// ÉTAT DE LA PAGE
// ========================================

const quotes = ref([])
const search = ref('')
const sortBy = ref('times_asked')
const isLoading = ref(true)
const errorMessage = ref('')
const currentPage = ref(1)
const pageSize = 25

// ========================================
// CHARGEMENT DES CITATIONS
// ========================================

const loadQuotes = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = sessionStorage.getItem('movieKingAdminToken')

    if (!token) {
      throw new Error('Session administrateur introuvable. Reconnecte-toi.')
    }

    const response = await $fetch('/api/admin/quotes', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    quotes.value = response.quotes || []
  } catch (error) {
    errorMessage.value =
      error.data?.statusMessage ||
      error.message ||
      'Impossible de charger les statistiques.'
  } finally {
    isLoading.value = false
  }
}

// ========================================
// CALCUL DES STATISTIQUES GLOBALES
// ========================================

const totalQuotes = computed(() => quotes.value.length)

const totalAsked = computed(() =>
  quotes.value.reduce(
    (total, quote) => total + Number(quote.times_asked || 0),
    0,
  ),
)

const totalCorrect = computed(() =>
  quotes.value.reduce(
    (total, quote) => total + Number(quote.correct_count || 0),
    0,
  ),
)

const totalIncorrect = computed(() =>
  quotes.value.reduce(
    (total, quote) => total + Number(quote.incorrect_count || 0),
    0,
  ),
)

const successRate = computed(() => {
  const evaluatedAnswers = totalCorrect.value + totalIncorrect.value

  if (evaluatedAnswers === 0) return 0

  return Math.round((totalCorrect.value / evaluatedAnswers) * 100)
})

// ========================================
// RECHERCHE ET TRI
// ========================================

const filteredQuotes = computed(() => {
  const searchText = search.value.toLowerCase().trim()

  return quotes.value
    .filter((quote) => {
      return (
        !searchText ||
        (quote.quote_text || '').toLowerCase().includes(searchText) ||
        (quote.movie_title || '').toLowerCase().includes(searchText)
      )
    })
    .sort((a, b) => {
      if (sortBy.value === 'times_asked_asc') {
        return Number(a.times_asked || 0) - Number(b.times_asked || 0)
      }

      if (sortBy.value === 'success_asc') {
        return getSuccessRate(a) - getSuccessRate(b)
      }

      if (sortBy.value === 'success_desc') {
        return getSuccessRate(b) - getSuccessRate(a)
      }

      if (sortBy.value === 'incorrect_count') {
        return Number(b.incorrect_count || 0) - Number(a.incorrect_count || 0)
      }

      return Number(b.times_asked || 0) - Number(a.times_asked || 0)
    })
})

const paginatedQuotes = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredQuotes.value.slice(start, start + pageSize)
})

watch([search, sortBy], () => {
  currentPage.value = 1
})

watch(filteredQuotes, () => {
  const lastPage = Math.max(1, Math.ceil(filteredQuotes.value.length / pageSize))
  if (currentPage.value > lastPage) currentPage.value = lastPage
})

function getSuccessRate(quote) {
  const correct = Number(quote.correct_count || 0)
  const incorrect = Number(quote.incorrect_count || 0)
  const total = correct + incorrect

  if (total === 0) return 0

  return (correct / total) * 100
}

onMounted(() => {
  loadQuotes()
})
</script>

<template>
  <section class="page-content stats-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">MOVIE KING / ANALYSE</p>
        <h1>Statistiques des citations</h1>
        <p class="page-description">
          Analyse les bonnes et mauvaises réponses pour chaque citation.
        </p>
      </div>

      <button class="refresh-button" type="button" :disabled="isLoading" @click="loadQuotes">
        ↻ {{ isLoading ? 'Chargement...' : 'Actualiser' }}
      </button>
    </header>

    <div v-if="errorMessage" class="feedback error" role="alert">
      <p>{{ errorMessage }}</p>
      <button class="retry-button" type="button" @click="loadQuotes">
        Réessayer
      </button>
    </div>

    <div v-else-if="isLoading" class="feedback">
      Chargement des statistiques...
    </div>

    <template v-else>
      <div class="summary-grid">
        <article class="summary-card">
          <div class="summary-icon">❝</div>
          <div>
            <p class="summary-label">Citations enregistrées</p>
            <p class="summary-number">{{ totalQuotes }}</p>
          </div>
        </article>

        <article class="summary-card">
          <div class="summary-icon">↻</div>
          <div>
            <p class="summary-label">Questions posées</p>
            <p class="summary-number">{{ totalAsked }}</p>
          </div>
        </article>

        <article class="summary-card">
          <div class="summary-icon correct-icon">✓</div>
          <div>
            <p class="summary-label">Bonnes réponses</p>
            <p class="summary-number">{{ totalCorrect }}</p>
          </div>
        </article>

        <article class="summary-card">
          <div class="summary-icon incorrect-icon">✕</div>
          <div>
            <p class="summary-label">Mauvaises réponses</p>
            <p class="summary-number">{{ totalIncorrect }}</p>
          </div>
        </article>
      </div>

      <article class="rate-card">
        <div>
          <p class="summary-label">Taux de réussite global</p>
          <p class="rate-number">{{ successRate }} %</p>
          <p class="rate-description">
            {{ totalCorrect }} bonnes réponses sur
            {{ totalCorrect + totalIncorrect }} réponses évaluées.
          </p>
        </div>

        <div class="rate-track" role="progressbar" :aria-valuenow="successRate" aria-valuemin="0" aria-valuemax="100"
          aria-label="Taux de réussite global">
          <div class="rate-fill" :style="{ width: `${successRate}%` }"></div>
        </div>
      </article>

      <article class="table-card">
        <div class="filters">
          <div class="search-field">
            <span aria-hidden="true">⌕</span>
            <input v-model="search" type="search" placeholder="Rechercher une citation ou un film..."
              aria-label="Rechercher une citation ou un film" />
          </div>

          <select v-model="sortBy" class="sort-filter" aria-label="Trier les citations">
            <option value="times_asked">Plus proposées</option>
            <option value="incorrect_count">Plus de mauvaises réponses</option>
            <option value="success_asc">Taux de réussite croissant</option>
            <option value="success_desc">Taux de réussite décroissant</option>
            <option value="times_asked_asc">Moins proposées</option>
          </select>
        </div>

        <div class="table-header">
          <h2>Détail par citation</h2>
          <span class="result-count">
            {{ filteredQuotes.length }} résultat(s)
          </span>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Citation / Film</th>
                <th>Proposée</th>
                <th>Bonnes réponses</th>
                <th>Mauvaises réponses</th>
                <th>Réussite</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="quote in paginatedQuotes" :key="quote.ID_quote">
                <td class="quote-cell">
                  <strong>{{ quote.quote_text || 'Citation sans texte' }}</strong>
                  <span class="movie-name">{{ quote.movie_title || 'Film inconnu' }}</span>
                </td>

                <td>{{ Number(quote.times_asked || 0) }}</td>

                <td>
                  <span class="count-badge correct-badge">
                    {{ Number(quote.correct_count || 0) }}
                  </span>
                </td>

                <td>
                  <span class="count-badge incorrect-badge">
                    {{ Number(quote.incorrect_count || 0) }}
                  </span>
                </td>

                <td class="rate-cell">
                  <strong>{{ Math.round(getSuccessRate(quote)) }} %</strong>
                  <div class="mini-track">
                    <div class="mini-fill" :class="{ difficult: getSuccessRate(quote) < 50 }"
                      :style="{ width: `${getSuccessRate(quote)}%` }"></div>
                  </div>
                </td>
              </tr>

              <tr v-if="filteredQuotes.length === 0">
                <td colspan="5" class="empty-state">
                  Aucune citation ne correspond à ta recherche.
                </td>
              </tr>
            </tbody>
          </table>
        </div>


        <!-- Détails statistiques sur mobile -->
        <div class="mobile-stat-list">
          <article v-for="quote in filteredQuotes" :key="quote.ID_quote" class="mobile-stat-card">
            <h3>{{ quote.quote_text || 'Citation sans texte' }}</h3>

            <p class="mobile-stat-movie">
              {{ quote.movie_title || 'Film inconnu' }}
            </p>

            <div class="mobile-stat-metrics">
              <div>
                <span>Proposée</span>
                <strong>{{ Number(quote.times_asked || 0) }}</strong>
              </div>

              <div>
                <span>Bonnes réponses</span>
                <strong class="mobile-correct">
                  {{ Number(quote.correct_count || 0) }}
                </strong>
              </div>

              <div>
                <span>Mauvaises réponses</span>
                <strong class="mobile-incorrect">
                  {{ Number(quote.incorrect_count || 0) }}
                </strong>
              </div>

              <div>
                <span>Réussite</span>
                <strong>{{ Math.round(getSuccessRate(quote)) }} %</strong>
              </div>
            </div>

            <div class="mini-track mobile-stat-track" role="progressbar"
              :aria-valuenow="Math.round(getSuccessRate(quote))" aria-valuemin="0" aria-valuemax="100"
              :aria-label="`Taux de réussite pour ${quote.movie_title || 'ce film'}`">
              <div class="mini-fill" :class="{ difficult: getSuccessRate(quote) < 50 }"
                :style="{ width: `${getSuccessRate(quote)}%` }"></div>
            </div>
          </article>

          <p v-if="filteredQuotes.length === 0" class="mobile-empty-state">
            Aucune citation ne correspond à ta recherche.
          </p>
        </div>


        <AdminPagination
          v-model:current-page="currentPage"
          :total-items="filteredQuotes.length"
          :page-size="pageSize"
        />
      </article>
    </template>
  </section>
</template>

<style scoped>
.stats-page {
  width: 100%;
  min-width: 0;
  padding: 1px;
  box-sizing: border-box;
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
  color: #52796F;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.page-description {
  margin: 10px 0 0;
  color: #ff626b;
  font-size: 14px;
  line-height: 1.6;
}

.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border: 1px solid #739C91;
  border-radius: 9px;
  background: #739C91;
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.refresh-button:hover:not(:disabled) {
  background: #52796F;
}

.refresh-button:disabled {
  opacity: 0.65;
  cursor: wait;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card,
.rate-card,
.table-card {
  border: 1px solid #E5E0D6;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 12px rgb(33 33 33 / 4%);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding: 20px;
}

.summary-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: #E7F0EC;
  color: #52796F;
  font-size: 23px;
}

.correct-icon {
  background: #E7F0EC;
  color: #287653;
}

.incorrect-icon {
  background: #FCE8E6;
  color: #B8403B;
}

.summary-label {
  margin: 0 0 6px;
  color: #6B706D;
  font-size: 12px;
}

.summary-number {
  margin: 0;
  font-size: 25px;
  font-weight: 700;
}

.rate-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 24px;
  padding: 24px;
}

.rate-number {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
}

.rate-description {
  margin: 8px 0 0;
  color: #777D79;
  font-size: 12px;
}

.rate-track,
.mini-track {
  overflow: hidden;
  border-radius: 99px;
  background: #EAE7DF;
}

.rate-track {
  width: 42%;
  height: 12px;
}

.rate-fill,
.mini-fill {
  height: 100%;
  border-radius: inherit;
  background: #739C91;
  transition: width 0.25s ease;
}

.table-card {
  padding: 24px;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}

.search-field {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  padding-left: 14px;
  border: 1px solid #DEDCD3;
  border-radius: 9px;
  background: #FAF9F5;
}

.search-field:focus-within,
.sort-filter:focus {
  border-color: #739C91;
  outline: 2px solid rgb(115 156 145 / 15%);
}

.search-field>span {
  color: #6B706D;
  font-size: 23px;
}

.search-field input {
  width: 100%;
  min-width: 0;
  padding: 13px 14px 13px 10px;
  border: none;
  outline: none;
  background: transparent;
  color: #212121;
  font: inherit;
  font-size: 13px;
}

.sort-filter {
  width: 240px;
  max-width: 100%;
  padding: 13px 14px;
  border: 1px solid #DEDCD3;
  border-radius: 9px;
  background: #FAF9F5;
  color: #212121;
  font: inherit;
  font-size: 13px;
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
  font-size: 17px;
  color: #212121;
}

.result-count {
  color: #777D79;
  font-size: 12px;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #EAE7DF;
  border-radius: 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

thead {
  background: #F7F4EA;
}

th {
  padding: 15px 16px;
  border-bottom: 1px solid #E5E0D6;
  color: #666D68;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  white-space: nowrap;
}

td {
  padding: 15px 16px;
  border-bottom: 1px solid #F0EEE7;
  font-size: 13px;
  vertical-align: middle;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background: #F9FAF6;
}

.quote-cell {
  min-width: 230px;
  max-width: 380px;
  overflow-wrap: anywhere;
}

.quote-cell strong,
.movie-name {
  display: block;
}

.movie-name {
  margin-top: 5px;
  color: #777D79;
  font-size: 12px;
}

.count-badge {
  display: inline-block;
  min-width: 22px;
  padding: 5px 8px;
  border-radius: 6px;
  text-align: center;
  font-weight: 700;
}

.correct-badge {
  background: #E7F0EC;
  color: #287653;
}

.incorrect-badge {
  background: #FCE8E6;
  color: #B8403B;
}

.rate-cell {
  min-width: 100px;
}

.mini-track {
  width: 72px;
  height: 5px;
  margin-top: 7px;
}

.mini-fill.difficult {
  background: #D9534F;
}

.empty-state {
  padding: 35px;
  color: #777D79;
  text-align: center;
}

.feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 150px;
  padding: 24px;
  border: 1px solid #E5E0D6;
  border-radius: 14px;
  background: #fff;
  color: #6B706D;
  font-size: 13px;
  text-align: center;
}

.feedback.error {
  color: #B8403B;
}

.retry-button {
  padding: 9px 13px;
  border: 1px solid #D9534F;
  border-radius: 7px;
  background: #fff;
  color: #B8403B;
  cursor: pointer;
}

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .summary-card {
    padding: 16px;
  }

  .rate-card {
    align-items: stretch;
    flex-direction: column;
  }

  .rate-track {
    width: 100%;
  }

  .filters {
    flex-direction: column;
  }

  .sort-filter {
    width: 100%;
  }

  .table-card {
    padding: 16px;
  }

  .table-header {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {

  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
  }
}


/* Détails mobiles masqués sur ordinateur */
.mobile-stat-list {
  display: none;
}

@media (max-width: 700px) {
  .stats-page {
    min-width: 0;
    width: 100%;
  }

  .table-wrapper {
    display: none;
  }

  .mobile-stat-list {
    display: grid;
    gap: 12px;
  }

  .mobile-stat-card {
    min-width: 0;
    padding: 16px;
    border: 1px solid #E5E0D6;
    border-radius: 12px;
    background: #FAF9F5;
  }

  .mobile-stat-card h3 {
    margin: 0;
    color: #212121;
    font-size: 14px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  .mobile-stat-movie {
    margin: 6px 0 16px;
    color: #777D79;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .mobile-stat-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 12px;
  }

  .mobile-stat-metrics > div {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .mobile-stat-metrics span {
    color: #777D79;
    font-size: 11px;
    line-height: 1.4;
  }

  .mobile-stat-metrics strong {
    color: #212121;
    font-size: 17px;
    overflow-wrap: anywhere;
  }

  .mobile-stat-metrics .mobile-correct {
    color: #287653;
  }

  .mobile-stat-metrics .mobile-incorrect {
    color: #B8403B;
  }

  .mobile-stat-track {
    width: 100%;
    height: 7px;
    margin-top: 18px;
  }

  .mobile-empty-state {
    padding: 20px 8px;
    color: #777D79;
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
