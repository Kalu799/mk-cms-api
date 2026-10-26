<script setup>
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'admin'
})

// ========================================
// DONNÉES ET ÉTATS
// ========================================

const categories = ref([])
const search = ref('')
const isLoading = ref(true)
const errorMessage = ref('')
const loaded = ref(false);

// ========================================
// RECHERCHE DES CATÉGORIES
// ========================================

const filteredCategories = computed(() => {
  const searchText = search.value.toLowerCase().trim()

  return categories.value.filter((category) =>
    (category.genre_name || '').toLowerCase().includes(searchText)
  )
})

// ========================================
// CHARGEMENT DEPUIS L'API
// ========================================

const loadCategories = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const token = sessionStorage.getItem('movieKingAdminToken')

    if (!token) {
      await navigateTo('/admin/login', { replace: true })
      return
    }

    const response = await $fetch('/api/category', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    categories.value = response.categories || []
    loaded.value = true;
  } catch (error) {
    errorMessage.value =
      error.data?.statusMessage ||
      'Impossible de charger les genres.'
  } finally {
    isLoading.value = false
  }
}

// ========================================
// INITIALISATION
// ========================================

onMounted(loadCategories)
</script>

<template>
  <section class="categories-page">
    <!-- En-tête -->
    <header class="page-header">
      <div>
        <p class="eyebrow">ADMINISTRATION / CONTENU</p>
        <h1>Genres</h1>
        <p class="subtitle">
          Consulte les genres enregistrés dans Movie King.
        </p>
      </div>

      <button
        class="refresh-button"
        type="button"
        :disabled="isLoading"
        @click="loadCategories"
      >
        <span class="refresh-icon">↻</span>
        {{ isLoading ? 'Chargement...' : 'Actualiser' }}
      </button>
    </header>

    <!-- Statistique -->
    <div class="stats-card">
      <span class="stats-icon">▤</span>

      <div v-show="loaded">
        <p>Genres enregistrés</p>
        <strong>{{ categories.length }}</strong>
      </div>
    </div>

    <!-- Tableau des catégories -->
    <div class="categories-card">
      <div class="table-heading">
        <div>
          <h2>Liste des genres</h2>
          <p>Retrouve facilement un genre dans la liste.</p>
        </div>
      </div>

      <!-- Recherche -->
      <div class="filters">
        <span class="search-icon" aria-hidden="true">⌕</span>

        <input
          v-model="search"
          type="search"
          placeholder="Rechercher un genre..."
          aria-label="Rechercher un genre"
        />
      </div>

      <!-- Chargement -->
      <p v-if="isLoading" class="feedback">
        <span class="loading-dot"></span>
        Chargement des genres...
      </p>

      <!-- Erreur -->
      <div v-else-if="errorMessage" class="feedback error">
        <span class="feedback-icon">!</span>

        <p>{{ errorMessage }}</p>

        <button
          type="button"
          class="retry-button"
          @click="loadCategories"
        >
          Réessayer
        </button>
      </div>

      <!-- Résultats -->
      <template v-else>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th scope="col">Identifiant</th>
                <th scope="col">Nom du genre</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="category in filteredCategories"
                :key="category.id_genre"
              >
                <td class="category-id">
                  #{{ category.id_genre }}
                </td>

                <td class="category-name">
                  <span class="genre-indicator"></span>
                  {{ category.genre_name }}
                </td>
              </tr>

              <tr v-if="filteredCategories.length === 0">
                <td colspan="2" class="empty-state">
                  <span class="empty-icon">⌕</span>

                  <p>
                    {{
                      search
                        ? 'Aucun genre ne correspond à ta recherche.'
                        : 'Aucun genre enregistré.'
                    }}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="table-footer">
          <p class="results-count">
            <strong>{{ filteredCategories.length }}</strong>
            genre(s) affiché(s)
          </p>

          <button
            v-if="search"
            type="button"
            class="clear-search"
            @click="search = ''"
          >
            Effacer la recherche
          </button>
        </footer>
      </template>
    </div>
  </section>
</template>

<style scoped>
/* ========================================
   PAGE ET EN-TÊTE
======================================== */

.categories-page {
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



.subtitle {
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
  border: 1px solid #739C91;
  border-radius: 9px;
  background: #739C91;
  color: #FFFFFF;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.refresh-button:hover:not(:disabled) {
  background: #52796F;
  transform: translateY(-1px);
}

.refresh-button:disabled {
  opacity: 0.65;
  cursor: wait;
}

.refresh-icon {
  font-size: 19px;
  line-height: 1;
}

/* ========================================
   CARTE STATISTIQUE
======================================== */

.stats-card,
.categories-card {
  border: 1px solid #E5E0D6;
  border-radius: 14px;
  background: #FFFFFF;
  box-shadow: 0 4px 12px rgb(33 33 33 / 4%);
}

.stats-card {
  display: flex;
  align-items: center;
  gap: 16px;
  width: fit-content;
  min-width: 250px;
  padding: 20px 24px;
  margin-bottom: 24px;
}

.stats-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 12px;
  background: #E7F0EC;
  color: #52796F;
  font-size: 25px;
}

.stats-card p {
  margin: 0 0 5px;
  color: #6B706D;
  font-size: 13px;
}

.stats-card strong {
  color: #212121;
  font-size: 27px;
  font-weight: 700;
}

/* ========================================
   CARTE PRINCIPALE
======================================== */

.categories-card {
  padding: 24px;
}

.table-heading {
  margin-bottom: 20px;
}

.table-heading h2 {
  margin: 0;
  color: #212121;
  font-size: 17px;
  font-weight: 700;
}

.table-heading p {
  margin: 7px 0 0;
  color: #777D79;
  font-size: 13px;
  line-height: 1.5;
}

/* ========================================
   BARRE DE RECHERCHE
======================================== */

.filters {
  position: relative;
  margin-bottom: 22px;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  color: #6B706D;
  font-size: 23px;
  transform: translateY(-54%);
  pointer-events: none;
}

.filters input {
  box-sizing: border-box;
  width: 100%;
  padding: 13px 14px 13px 43px;
  border: 1px solid #DEDCD3;
  border-radius: 9px;
  outline: none;
  background: #FAF9F5;
  color: #212121;
  font: inherit;
  font-size: 13px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.filters input::placeholder {
  color: #929792;
}

.filters input:focus {
  border-color: #739C91;
  box-shadow: 0 0 0 3px rgb(115 156 145 / 15%);
}

/* ========================================
   TABLEAU
======================================== */

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
  color: #666D68;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border-bottom: 1px solid #E5E0D6;
}

td {
  padding: 17px 16px;
  border-bottom: 1px solid #F0EEE7;
  color: #343835;
  font-size: 13px;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:not(:last-child) {
  transition: background 0.15s ease;
}

tbody tr:not(:last-child):hover {
  background: #F9FAF6;
}

.category-id {
  width: 140px;
  color: #52796F;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.category-name {
  font-weight: 600;
}

.genre-indicator {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 9px;
  border-radius: 50%;
  background: #739C91;
  vertical-align: middle;
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
  color: #6B706D;
  font-size: 13px;
  text-align: center;
}

.loading-dot {
  width: 22px;
  height: 22px;
  border: 3px solid #E7F0EC;
  border-top-color: #52796F;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.error {
  color: #B8403B;
}

.feedback-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #FCE8E6;
  color: #B8403B;
  font-weight: 700;
}

.feedback p {
  margin: 0;
}

.retry-button {
  padding: 9px 13px;
  border: 1px solid #D9534F;
  border-radius: 7px;
  background: #FFFFFF;
  color: #B8403B;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.retry-button:hover {
  background: #FCE8E6;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ========================================
   AUCUN RÉSULTAT
======================================== */

.empty-state {
  padding: 38px 16px;
  color: #777D79;
  text-align: center;
}

.empty-icon {
  color: #739C91;
  font-size: 26px;
}

.empty-state p {
  margin: 8px 0 0;
  font-size: 13px;
}

/* ========================================
   PIED DU TABLEAU
======================================== */

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.results-count {
  margin: 0;
  color: #777D79;
  font-size: 12px;
}

.results-count strong {
  color: #212121;
}

.clear-search {
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: #E7F0EC;
  color: #42675D;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.clear-search:hover {
  background: #D7E7DF;
}

/* ========================================
   RESPONSIVE
======================================== */

@media (max-width: 700px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .refresh-button {
    width: 100%;
  }

  .stats-card {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
  }

  .categories-card {
    padding: 16px;
  }

  .table-heading h2 {
    font-size: 16px;
  }

  th,
  td {
    padding: 13px 11px;
  }

  .category-id {
    width: 95px;
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
</style>
