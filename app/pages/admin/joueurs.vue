<script setup>
import { ref, computed, onMounted, watch } from "vue";
const updatingUserId = ref(null);
const actionError = ref("");
const deletingUserId = ref(null);
const loaded = ref(false);

definePageMeta({
  layout: "admin",
});

// ========================================
// DONNÉES ET ÉTATS
// ========================================

const users = ref([]);
const search = ref("");
const selectedRole = ref("all");
const isLoading = ref(true);
const errorMessage = ref("");
const selectedSort = ref("default");
const currentPage = ref(1);
const pageSize = 25;

// ========================================
// RECHERCHE ET FILTRE DES UTILISATEURS
// ========================================

const filteredUsers = computed(() => {
  const searchText = search.value.toLowerCase().trim();

  return users.value
    .filter((user) => {
      const pseudo = (user.user_pseudo || "").toLowerCase();
      const mail = (user.user_mail || "").toLowerCase();

      const matchesSearch =
        pseudo.includes(searchText) || mail.includes(searchText);

      const matchesRole =
        selectedRole.value === "all" || user.user_role === selectedRole.value;

      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {

      // Tri par date de création
      if (
        selectedSort.value === "date-desc" ||
        selectedSort.value === "date-asc"
      ) {
        const dateA = a.user_created_at
          ? new Date(String(a.user_created_at).replace(" ", "T")).getTime()
          : 0;

        const dateB = b.user_created_at
          ? new Date(String(b.user_created_at).replace(" ", "T")).getTime()
          : 0;

        return selectedSort.value === "date-desc"
          ? dateB - dateA
          : dateA - dateB;
      }




      // Classement selon le score
      if (selectedSort.value === "score-desc") {
        const scoreDifference =
          Number(b.user_score ?? 0) - Number(a.user_score ?? 0);

        if (scoreDifference !== 0) return scoreDifference;
      }

      if (selectedSort.value === "score-asc") {
        const scoreDifference =
          Number(a.user_score ?? 0) - Number(b.user_score ?? 0);

        if (scoreDifference !== 0) return scoreDifference;
      }

      // Tri par défaut : administrateurs en premier
      if (a.user_role === "admin" && b.user_role !== "admin") return -1;
      if (a.user_role !== "admin" && b.user_role === "admin") return 1;

      // Puis ordre alphabétique
      return (a.user_pseudo || "").localeCompare(b.user_pseudo || "", "fr");
    });
});

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredUsers.value.slice(start, start + pageSize);
});

watch([search, selectedRole, selectedSort], () => {
  currentPage.value = 1;
});

watch(filteredUsers, () => {
  const lastPage = Math.max(1, Math.ceil(filteredUsers.value.length / pageSize));
  if (currentPage.value > lastPage) currentPage.value = lastPage;
});

// ========================================
// CHARGEMENT DEPUIS L'API
// ========================================

const loadUsers = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const token = sessionStorage.getItem("movieKingAdminToken");

    if (!token) {
      await navigateTo("/admin/login", { replace: true });
      return;
    }

    const response = await $fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    users.value = response.users || [];
    loaded.value = true;
  } catch (error) {
    errorMessage.value =
      error.data?.statusMessage || "Impossible de charger les utilisateurs.";
  } finally {
    isLoading.value = false;
  }
};

// ========================================
// AFFICHAGE DE LA DATE DE CRÉATION
// ========================================


const formatCreatedAt = (date) => {
  if (!date) return "—";

  // MySQL peut renvoyer une date au format YYYY-MM-DD HH:mm:ss.
  const normalizedDate = String(date).replace(" ", "T");
  const parsedDate = new Date(normalizedDate);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
};





// ========================================
// EXPORT CSV DES UTILISATEURS
// ========================================

const exportUsersToCSV = () => {
  // Les mêmes utilisateurs que ceux affichés dans le tableau.
  const data = filteredUsers.value

  if (data.length === 0) {
    actionError.value = "Aucun utilisateur à exporter."
    return
  }

  // Colonnes autorisées dans le fichier CSV.
  const columns = [
    { label: "Identifiant", key: "ID_user" },
    { label: "Pseudo", key: "user_pseudo" },
    { label: "E-mail", key: "user_mail" },
    { label: "Rôle", key: "user_role" },
    { label: "Score", key: "user_score" },
    { label: "Statut", key: "user_is_blocked" },
    { label: "Date de création", key: "user_created_at" },
  ]

  // Protège les cellules et échappe les guillemets.
  const escapeCSV = (value) => {
    let text = String(value ?? "")

    // Évite qu'un tableur interprète une cellule comme une formule.
    if (/^[\s]*[=+\-@]/.test(text)) {
      text = `'${text}`
    }

    return `"${text.replace(/"/g, '""')}"`
  }

  const header = columns
    .map((column) => escapeCSV(column.label))
    .join(";")

  const rows = data.map((user) =>
    columns
      .map((column) => {
        let value = user[column.key]

        if (column.key === "user_is_blocked") {
          value = Number(value) === 1 ? "Bloqué" : "Actif"
        }

        return escapeCSV(value)
      })
      .join(";"),
  )

  // BOM UTF-8 pour faciliter l'ouverture des accents dans Excel.
  const csvContent = "\uFEFF" + [header, ...rows].join("\r\n")
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = `utilisateurs-movie-king-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`

  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// ========================================
// BLOQUAGE DE USERS
// ========================================

const toggleUserBlock = async (user) => {
  actionError.value = "";

  const isBlocked = Number(user.user_is_blocked) === 1;
  const newBlockedState = !isBlocked;

  updatingUserId.value = user.ID_user;

  try {
    const token = sessionStorage.getItem("movieKingAdminToken");

    await $fetch(`/api/admin/user/${user.ID_user}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        user_is_blocked: newBlockedState,
      },
    });

    // Actualise le statut dans le tableau après confirmation du serveur.
    user.user_is_blocked = newBlockedState ? 1 : 0;
  } catch (error) {
    actionError.value =
      error.data?.statusMessage ||
      "Impossible de modifier le statut de cet utilisateur.";
  } finally {
    updatingUserId.value = null;
  }
};

// ========================================
// SUPPRESSION DE USERS
// ========================================

const deleteUser = async (user) => {
  actionError.value = "";

  const confirmed = window.confirm(
    `Veux-tu vraiment supprimer le compte de ${user.user_pseudo} ? Cette action est irréversible.`,
  );

  if (!confirmed) return;

  deletingUserId.value = user.ID_user;

  try {
    const token = sessionStorage.getItem("movieKingAdminToken");

    if (!token) {
      throw new Error("Session administrateur introuvable.");
    }

    await $fetch(`/api/admin/user/${user.ID_user}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Retire la ligne uniquement après confirmation du serveur.
    users.value = users.value.filter((item) => item.ID_user !== user.ID_user);
  } catch (error) {
    actionError.value =
      error.data?.statusMessage ||
      error.message ||
      "Impossible de supprimer cet utilisateur.";
  } finally {
    deletingUserId.value = null;
  }
};

// ========================================
// INITIALISATION
// ========================================

onMounted(loadUsers);
</script>

<template>
  <section class="users-page">
    <!-- En-tête -->
    <header class="page-header">
      <div>
        <p class="eyebrow">ADMINISTRATION / COMPTES</p>
        <h1>Utilisateurs</h1>
        <p class="subtitle">
          Consulte et retrouve les comptes inscrits sur Movie King.
        </p>
      </div>


      <div class="header-actions">
        <button class="export-button" type="button" :disabled="isLoading || filteredUsers.length === 0"
          @click="exportUsersToCSV">
          ↓ Exporter CSV
        </button>

        <button class="refresh-button" type="button" :disabled="isLoading" @click="loadUsers">
          <span class="refresh-icon">↻</span>
          {{ isLoading ? "Chargement..." : "Actualiser" }}
        </button>
      </div>

    </header>

    <!-- Statistique -->
    <div class="stats-card">
      <span class="stats-icon">♙</span>

      <div v-show="loaded">
        <p>Comptes enregistrés</p>
        <strong>{{ users.length }}</strong>
      </div>
    </div>

    <!-- Liste des utilisateurs -->
    <div class="users-card">
      <div class="table-heading">
        <div>
          <h2>Liste des comptes</h2>
          <p>Recherche et filtre les membres de Movie King.</p>
        </div>
      </div>

      <!-- Recherche et filtre -->
      <div class="filters">
        <div class="search-wrapper">
          <span class="search-icon" aria-hidden="true">⌕</span>

          <input v-model="search" type="search" placeholder="Rechercher un pseudo ou un e-mail..."
            aria-label="Rechercher un utilisateur" />
        </div>

        <select v-model="selectedRole" aria-label="Filtrer par rôle">
          <option value="all">Tous les rôles</option>
          <option value="player">Joueurs</option>
          <option value="admin">Administrateurs</option>
        </select>

        <select v-model="selectedSort" aria-label="Trier les utilisateurs">
          <option value="default">Tri par défaut</option>
          <option value="score-desc">Meilleurs scores</option>
          <option value="score-asc">Scores les plus faibles</option>
          <option value="date-desc">Plus récents</option>
          <option value="date-asc">Plus anciens</option>
        </select>
      </div>

      <!-- Chargement -->
      <p v-if="isLoading" class="feedback">
        <span class="loading-dot"></span>
        Chargement des utilisateurs...
      </p>

      <!-- Erreur -->
      <div v-else-if="errorMessage" class="feedback error">
        <span class="feedback-icon">!</span>

        <p>{{ errorMessage }}</p>

        <button type="button" class="retry-button" @click="loadUsers">
          Réessayer
        </button>
      </div>

      <!-- Résultats -->
      <template v-else>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th scope="col">Utilisateur</th>
                <th scope="col">E-mail</th>
                <th scope="col">Rôle</th>
                <th scope="col">Score</th>
                <th scope="col">Statut</th>
                <th scope="col">Date de création</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="user in paginatedUsers" :key="user.ID_user">
                <td class="pseudo">
                  {{ user.user_pseudo || "Sans pseudo" }}
                </td>

                <td class="user-mail">
                  {{ user.user_mail || "—" }}
                </td>

                <td>
                  <span class="role-badge" :class="user.user_role">
                    <span class="role-dot"></span>
                    {{ user.user_role === "admin" ? "Admin" : "Joueur" }}
                  </span>
                </td>

                <td class="score">
                  {{ user.user_score ?? 0 }}
                </td>

                <!-- Statut du compte -->
                <td>
                  <span class="status-badge" :class="Number(user.user_is_blocked) === 1 ? 'blocked' : 'active'
                    ">
                    {{
                      Number(user.user_is_blocked) === 1 ? "Bloqué" : "Actif"
                    }}
                  </span>
                </td>

                <!-- Date de création du compte -->
                <td class="created-at">
                  {{ formatCreatedAt(user.user_created_at) }}
                </td>

                <!-- Action de blocage -->
                <td>
                  <button type="button" class="block-button" :class="Number(user.user_is_blocked) === 1 ? 'unblock' : 'block'
                    " :disabled="updatingUserId === user.ID_user" @click="toggleUserBlock(user)">
                    {{
                      updatingUserId === user.ID_user
                        ? "Patientez..."
                        : Number(user.user_is_blocked) === 1
                          ? "Débloquer"
                          : "Bloquer"
                    }}
                  </button>

                  <button type="button" class="delete-button" :disabled="deletingUserId === user.ID_user"
                    :aria-label="`Supprimer le compte de ${user.user_pseudo}`"
                    :title="`Supprimer le compte de ${user.user_pseudo}`" @click="deleteUser(user)">
                    <span v-if="deletingUserId === user.ID_user">Suppression...</span>
                    <span v-else aria-hidden="true">🗑️</span>
                  </button>
                </td>
              </tr>

              <!-- Aucun résultat -->
              <tr v-if="filteredUsers.length === 0">
                <td colspan="7" class="empty-state">
                  <span class="empty-icon">⌕</span>

                  <p>
                    {{
                      search || selectedRole !== "all"
                        ? "Aucun utilisateur ne correspond aux filtres."
                        : "Aucun utilisateur enregistré."
                    }}
                  </p>

                  <button v-if="
                    search ||
                    selectedRole !== 'all' ||
                    selectedSort !== 'default'
                  " type="button" class="clear-filters" @click="
                    search = '';
                  selectedRole = 'all';
                  selectedSort = 'default';
                  ">
                    Réinitialiser les filtres
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Cartes utilisateurs sur mobile -->
        <div class="mobile-user-list">
          <article v-for="user in filteredUsers" :key="user.ID_user" class="mobile-user-card">
            <div class="mobile-user-heading">
              <div class="mobile-user-identity">
                <h3>{{ user.user_pseudo || 'Sans pseudo' }}</h3>
                <p>{{ user.user_mail || '—' }}</p>
              </div>

              <span class="status-badge" :class="Number(user.user_is_blocked) === 1 ? 'blocked' : 'active'">
                {{ Number(user.user_is_blocked) === 1 ? 'Bloqué' : 'Actif' }}
              </span>
            </div>

            <dl class="mobile-user-details">
              <div>
                <dt>Rôle</dt>
                <dd>{{ user.user_role === 'admin' ? 'Administrateur' : 'Joueur' }}</dd>
              </div>

              <div>
                <dt>Score</dt>
                <dd>{{ user.user_score ?? 0 }}</dd>
              </div>

              <div>
                <dt>Inscription</dt>
                <dd>{{ formatCreatedAt(user.user_created_at) }}</dd>
              </div>
            </dl>

            <div class="mobile-user-actions">
              <button type="button" class="block-button"
                :class="Number(user.user_is_blocked) === 1 ? 'unblock' : 'block'"
                :disabled="updatingUserId === user.ID_user" @click="toggleUserBlock(user)">
                {{
                  updatingUserId === user.ID_user
                    ? 'Patientez...'
                    : Number(user.user_is_blocked) === 1
                      ? 'Débloquer'
                      : 'Bloquer'
                }}
              </button>

              <button type="button" class="delete-button" :disabled="deletingUserId === user.ID_user"
                @click="deleteUser(user)"
                :aria-label="deletingUserId === user.ID_user ? 'Suppression en cours' : `Supprimer ${user.user_pseudo}`"
                title="Supprimer l'utilisateur">
                <span v-if="deletingUserId === user.ID_user">Suppression...</span>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14H6L5 6"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                  <path d="M9 6V4h6v2"></path>
                </svg>
              </button>
            </div>
          </article>

          <p v-if="filteredUsers.length === 0" class="mobile-empty-state">
            {{
              search || selectedRole !== 'all'
                ? 'Aucun utilisateur ne correspond aux filtres.'
                : 'Aucun utilisateur enregistré.'
            }}
          </p>
        </div>

        <AdminPagination
          v-model:current-page="currentPage"
          :total-items="filteredUsers.length"
          :page-size="pageSize"
        />

        <!-- Pied du tableau -->
        <footer class="table-footer">
          <p class="results-count">
            <strong>{{ paginatedUsers.length }}</strong>
            utilisateur(s) affiché(s)
            <span class="results-separator">/</span>
            {{ filteredUsers.length }} résultat(s)
          </p>

          <button v-if="search || selectedRole !== 'all'" type="button" class="clear-filters" @click="
            search = '';
          selectedRole = 'all';
          ">
            Réinitialiser les filtres
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

.users-page {
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

.refresh-icon {
  font-size: 19px;
  line-height: 1;
}


/* ========================================
   BOUTON CSV
======================================== */

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.export-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border: 1px solid #739c91;
  border-radius: 9px;
  background: #ffffff;
  color: #52796f;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.export-button:hover:not(:disabled) {
  background: #e7f0ec;
}

.export-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .header-actions {
    width: 100%;
    flex-direction: column;
  }

  .header-actions button {
    width: 100%;
  }
}


/* ========================================
   STATISTIQUE
======================================== */

.stats-card,
.users-card {
  border: 1px solid #e5e0d6;
  border-radius: 14px;
  background: #ffffff;
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
  background: #e7f0ec;
  color: #52796f;
  font-size: 25px;
}

.stats-card p {
  margin: 0 0 5px;
  color: #6b706d;
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

.users-card {
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
  color: #777d79;
  font-size: 13px;
  line-height: 1.5;
}

/* ========================================
   RECHERCHE ET FILTRE
======================================== */

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  color: #6b706d;
  font-size: 23px;
  transform: translateY(-54%);
  pointer-events: none;
}

.filters input,
.filters select {
  box-sizing: border-box;
  min-width: 0;
  padding: 13px 14px;
  border: 1px solid #dedcd3;
  border-radius: 9px;
  outline: none;
  background: #faf9f5;
  color: #212121;
  font: inherit;
  font-size: 13px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.filters input {
  width: 100%;
  padding-left: 43px;
}

.filters input::placeholder {
  color: #929792;
}

.filters select {
  width: 200px;
  cursor: pointer;
}

.filters input:focus,
.filters select:focus {
  border-color: #739c91;
  box-shadow: 0 0 0 3px rgb(115 156 145 / 15%);
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
  color: #666d68;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border-bottom: 1px solid #e5e0d6;
  white-space: nowrap;
}

td {
  padding: 17px 16px;
  border-bottom: 1px solid #f0eee7;
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
  background: #f9faf6;
}

.pseudo {
  color: #212121;
  font-weight: 700;
}

.user-mail {
  overflow-wrap: anywhere;
}

.score {
  color: #806000;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* ========================================
   BADGES DE RÔLE
======================================== */

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.role-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.role-badge.admin {
  background: #fce8e6;
  color: #b8403b;
}

.role-badge.admin .role-dot {
  background: #d9534f;
}

.role-badge.player {
  background: #e7f0ec;
  color: #42675d;
}

.role-badge.player .role-dot {
  background: #739c91;
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
  color: #6b706d;
  font-size: 13px;
  text-align: center;
}

.loading-dot {
  width: 22px;
  height: 22px;
  border: 3px solid #e7f0ec;
  border-top-color: #52796f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.error {
  color: #b8403b;
}

.feedback-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fce8e6;
  color: #b8403b;
  font-weight: 700;
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
  color: #777d79;
  font-size: 12px;
}

.results-count strong {
  color: #212121;
}

.results-separator {
  padding: 0 5px;
  color: #b4b6b1;
}

.clear-filters {
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

.clear-filters:hover {
  background: #d7e7df;
}

/* ========================================
   RESPONSIVE
======================================== */

@media (max-width: 900px) {
  .filters {
    flex-direction: column;
  }

  .filters select {
    width: 100%;
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

  .stats-card {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
  }

  .users-card {
    padding: 16px;
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

/* ========================================
   bouton bloquage
======================================== */

.status-badge {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.status-badge.active {
  background: #e7f0ec;
  color: #42675d;
}

.status-badge.blocked {
  background: #fce8e6;
  color: #b8403b;
}

.block-button {
  padding: 8px 11px;
  border: 1px solid transparent;
  border-radius: 7px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.block-button.block {
  background: #fce8e6;
  color: #b8403b;
}

.block-button.unblock {
  background: #e7f0ec;
  color: #42675d;
}

.block-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.block-button:focus-visible {
  outline: 2px solid #739c91;
  outline-offset: 3px;
}

/* ========================================
   bouton SUPRESSION
======================================== */

.delete-button {
  padding: 10px 13px;
  border: 1px solid #d9534f;
  border-radius: 7px;
  background: #ffffff;
  color: #b8403b;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  margin-left: 8px;
}

.delete-button:hover:not(:disabled) {
  background: #fce8e6;
}

.delete-button:disabled {
  opacity: 0.6;
  cursor: wait;
}


.created-at {
  color: #6b706d;
  font-size: 12px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}


/* Cartes utilisateurs : masquées sur ordinateur */
.mobile-user-list {
  display: none;
}

@media (max-width: 700px) {
  .users-page {
    min-width: 0;
    width: 100%;
  }

  .table-wrapper {
    display: none;
  }

  .mobile-user-list {
    display: grid;
    gap: 12px;
  }

  .mobile-user-card {
    min-width: 0;
    padding: 16px;
    border: 1px solid #E5E0D6;
    border-radius: 12px;
    background: #FAF9F5;
  }

  .mobile-user-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
  }

  .mobile-user-identity {
    flex: 1;
    min-width: 0;
  }

  .mobile-user-identity h3 {
    margin: 0 0 6px;
    font-size: 15px;
    overflow-wrap: anywhere;
    color: #000000;
  }

  .mobile-user-identity p {
    margin: 0;
    color: #777D79;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .mobile-user-details {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin: 18px 0;
  }

  .mobile-user-details dt {
    margin-bottom: 5px;
    color: #777D79;
    font-size: 11px;
  }

  .mobile-user-details dd {
    margin: 0;
    color: #212121;
    font-size: 13px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .mobile-user-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding-top: 14px;
    border-top: 1px solid #E5E0D6;
  }

  .mobile-user-actions button {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 10px 6px;
    white-space: normal;
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
