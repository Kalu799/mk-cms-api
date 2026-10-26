<script setup>
import { onMounted, ref } from 'vue'

const isAuthorized = ref(false)
const isMobileMenuOpen = ref(false)

// Vérifie que l'utilisateur possède une session administrateur valide.
onMounted(async () => {
  const token = sessionStorage.getItem('movieKingAdminToken')

  if (!token) {
    await navigateTo('/admin/login', { replace: true })
    return
  }

  try {
    const response = await $fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.user_role !== 'admin') {
      sessionStorage.removeItem('movieKingAdminToken')
      await navigateTo('/admin/login', { replace: true })
      return
    }

    isAuthorized.value = true
  } catch {
    sessionStorage.removeItem('movieKingAdminToken')
    await navigateTo('/admin/login', { replace: true })
  }
})

// Ferme le menu mobile.
const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Déconnexion.
const handleLogout = async () => {
  sessionStorage.removeItem('movieKingAdminToken')
  isMobileMenuOpen.value = false
  await navigateTo('/admin/login', { replace: true })
}
</script>

<template>
  <div v-if="isAuthorized" class="admin-layout">
    <!-- Navigation latérale -->
    <aside
      class="sidebar"
      :class="{ 'sidebar-open': isMobileMenuOpen }"
      aria-label="Navigation administrateur"
    >
      <NuxtLink
        to="/admin"
        class="brand"
        @click="closeMobileMenu"
      >
        <img src="/logo.png" alt="Logo Movie King" class="brand-icon" />
        <span class="brand-name">
          <strong>Movie King</strong>
          <small>ADMINISTRATION</small>
        </span>
      </NuxtLink>

      <div class="menu-label">MENU PRINCIPAL</div>

      <nav id="admin-navigation" class="navigation">
        <NuxtLink
          to="/admin"
          class="nav-link"
          @click="closeMobileMenu"
        >
          <span class="nav-icon">▦</span>
          <span>Tableau de bord</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/categories"
          class="nav-link"
          @click="closeMobileMenu"
        >
          <span class="nav-icon">▤</span>
          <span>Genres</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/joueurs"
          class="nav-link"
          @click="closeMobileMenu"
        >
          <span class="nav-icon">♙</span>
          <span>Utilisateurs</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/quotes"
          class="nav-link"
          @click="closeMobileMenu"
        >
          <span class="nav-icon">💬</span>
          <span>Citations</span>
        </NuxtLink>

        <NuxtLink
          to="/admin/statistiques"
          class="nav-link"
          @click="closeMobileMenu"
        >
          <span class="nav-icon">▥</span>
          <span>Statistiques</span>
        </NuxtLink>
      </nav>

      <!-- Déconnexion en bas de la barre latérale -->
      <div class="sidebar-bottom">
        <div class="sidebar-separator"></div>

        <button
          class="nav-link logout-link"
          type="button"
          @click="handleLogout"
        >
          <span class="nav-icon">⇥</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>

    <!-- Fond sombre affiché derrière le menu sur mobile -->
    <button
      v-if="isMobileMenuOpen"
      class="mobile-menu-backdrop"
      type="button"
      aria-label="Fermer le menu de navigation"
      @click="closeMobileMenu"
    ></button>

    <!-- Zone principale -->
    <div class="admin-main">
      <header class="topbar">
        <button
          class="mobile-menu-button"
          type="button"
          :aria-label="isMobileMenuOpen ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation'"
          :aria-expanded="isMobileMenuOpen"
          aria-controls="admin-navigation"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <span aria-hidden="true">{{ isMobileMenuOpen ? '×' : '☰' }}</span>
        </button>

        <div class="breadcrumb">
          <span class="breadcrumb-muted">MOVIE KING</span>
          <span class="breadcrumb-separator">/</span>
          <span>Administration</span>
        </div>

        <div class="admin-badge">
          <span class="status-dot"></span>
          ADMIN
        </div>
      </header>

      <main class="page-content">
        <slot />
      </main>

      <footer class="admin-footer">
        <span>MOVIE KING CMS</span>
        <span>ESPACE ADMINISTRATEUR</span>
      </footer>
    </div>
  </div>
</template>

<style>
:root {
  --mk-background: #1d1d1d;
  --mk-sidebar: #171717;
  --mk-card: #2d2d2d;
  --mk-mint: #5e9e94;
  --mk-beige: #eadfc9;
  --mk-yellow: #ffb800;
  --mk-coral: #e85b65;
  --mk-white: #ffffff;
  --mk-muted: #a6a29a;
  --mk-border: #414141;
}

.admin-layout,
.admin-layout * {
  box-sizing: border-box;
}

.admin-layout {
  min-height: 100vh;
  width: 100%;
  display: flex;
  background: var(--mk-background);
  color: var(--mk-beige);
  font-family: Inter, Arial, sans-serif;
}

/* BARRE LATÉRALE */
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  width: 250px;
  overflow-y: auto;
  padding: 26px 18px 20px;
  background: var(--mk-sidebar);
  border-right: 1px solid var(--mk-border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 28px;
  margin-bottom: 24px;
  color: var(--mk-beige);
  text-decoration: none;
  border-bottom: 1px solid var(--mk-border);
}

.brand-icon {
  width: 42px;
  height: 42px;
  object-fit: contain;
  flex-shrink: 0;
}

.brand-name {
  min-width: 0;
}

.brand strong,
.brand small {
  display: block;
}

.brand strong {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.brand small {
  margin-top: 6px;
  color: var(--mk-mint);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 2px;
}

.menu-label {
  margin: 0 10px 14px;
  color: var(--mk-muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.8px;
}

.navigation {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 12px;
  border: 1px solid transparent;
  border-radius: 5px;
  color: #c8c4bb;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  flex-shrink: 0;
  font-size: 19px;
}

.nav-link:hover {
  color: var(--mk-beige);
  background: #292929;
  border-color: var(--mk-border);
}

.nav-link.router-link-active {
  color: #111111;
  background: var(--mk-mint);
  border-color: var(--mk-mint);
  font-weight: 800;
}

/* Le tableau de bord ne reste pas actif sur les sous-pages. */
.navigation a.router-link-exact-active[href="/admin"] {
  background: var(--mk-mint);
  color: #111111;
}

/* BAS DE LA BARRE LATÉRALE */
.sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
  padding-top: 28px;
}

.sidebar-separator {
  height: 1px;
  margin-bottom: 6px;
  background: var(--mk-border);
}

.logout-link {
  color: #e5b8b8;
}

.logout-link:hover {
  color: var(--mk-white);
  background: #47272a;
  border-color: var(--mk-coral);
}

/* CONTENU PRINCIPAL */
.admin-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 100vh;
  margin-left: 250px;
  background: var(--mk-background);
}

/* BARRE SUPÉRIEURE */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 70px;
  padding: 0 32px;
  background: #242424;
  border-bottom: 1px solid var(--mk-border);
}

.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--mk-beige);
  font-size: 12px;
  font-weight: 600;
}

.breadcrumb-muted {
  color: var(--mk-muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
}

.breadcrumb-separator {
  color: var(--mk-mint);
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  background: #303d39;
  border: 1px solid #446c63;
  border-radius: 4px;
  color: var(--mk-mint);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.2px;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--mk-mint);
}

/* Bouton mobile caché sur desktop */
.mobile-menu-button {
  display: none;
}

.mobile-menu-backdrop {
  display: none;
}

/* ZONE DES PAGES */
.page-content {
  flex: 1;
  min-width: 0;
  padding: 32px;
}

.page-content h1 {
  color: var(--mk-beige);
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 800;
  letter-spacing: -0.8px;
}

.page-content h2,
.page-content h3 {
  color: var(--mk-beige);
}

.page-content a:not(.nav-link) {
  color: var(--mk-mint);
}

.page-content input,
.page-content select,
.page-content textarea {
  max-width: 100%;
  background: var(--mk-beige);
  color: #1d1d1d;
  border: 1px solid #b8ad99;
  border-radius: 4px;
}

.page-content input:focus,
.page-content select:focus,
.page-content textarea:focus {
  outline: 2px solid var(--mk-mint);
  outline-offset: 2px;
}

/* BOUTONS */
.page-content button:not(.nav-link) {
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.page-content button:not(.nav-link):hover {
  filter: brightness(1.05);
}

.page-content button:focus-visible,
.nav-link:focus-visible,
.mobile-menu-button:focus-visible {
  outline: 2px solid var(--mk-yellow);
  outline-offset: 3px;
}

.page-content .mk-button {
  padding: 11px 18px;
  background: var(--mk-yellow);
  color: #111111;
  border: 1px solid #111111;
  border-radius: 4px;
  box-shadow: 4px 4px 0 #000000;
  font-weight: 800;
  cursor: pointer;
}

.page-content .mk-button:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 #000000;
}

.page-content .mk-button:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 #000000;
}

/* CARTES ET TABLEAUX COMMUNS */
.page-content .mk-card {
  padding: 22px;
  background: var(--mk-card);
  border: 1px solid var(--mk-border);
  border-left: 4px solid var(--mk-coral);
  border-radius: 5px;
}

.page-content .mk-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--mk-card);
  color: var(--mk-beige);
}

.page-content .mk-table th {
  padding: 14px;
  background: #242424;
  color: var(--mk-mint);
  font-size: 11px;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.page-content .mk-table td {
  padding: 14px;
  border-top: 1px solid var(--mk-border);
}

.page-content .mk-table tr:hover td {
  background: #343434;
}

/* PIED DE PAGE */
.admin-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 32px;
  border-top: 1px solid var(--mk-border);
  color: var(--mk-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

/* TABLETTE */
@media (max-width: 900px) {
  .sidebar {
    width: 210px;
    padding-right: 12px;
    padding-left: 12px;
  }

  .admin-main {
    margin-left: 210px;
  }

  .page-content {
    padding: 24px 20px;
  }

  .topbar {
    padding: 0 20px;
  }

  .admin-footer {
    padding: 16px 20px;
  }
}

/* MOBILE */
@media (max-width: 600px) {
  .sidebar {
    width: min(280px, 85vw);
    padding: 26px 18px 20px;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: none;
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
    box-shadow: 8px 0 24px rgb(0 0 0 / 35%);
  }

  .admin-main {
    width: 100%;
    min-width: 0;
    margin-left: 0;
  }

  .mobile-menu-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    background: #2d2d2d;
    color: var(--mk-beige);
    border: 1px solid var(--mk-border);
    border-radius: 5px;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
  }

  .mobile-menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    background: rgb(0 0 0 / 55%);
    border: 0;
    cursor: pointer;
  }

  .topbar {
    min-height: 60px;
    justify-content: flex-start;
    gap: 10px;
    padding: 0 12px;
  }

  .breadcrumb {
    flex: 1;
    gap: 6px;
    font-size: 10px;
  }

  .breadcrumb-muted {
    display: none;
  }

  .admin-badge {
    gap: 5px;
    padding: 7px;
    font-size: 9px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
  }

  .page-content {
    padding: 22px 12px;
  }

  .admin-footer {
    flex-direction: column;
    padding: 14px 12px;
    font-size: 8px;
  }
}

/* Petits téléphones */
@media (max-width: 360px) {
  .admin-badge {
    padding: 6px;
    font-size: 8px;
  }

  .page-content {
    padding: 18px 10px;
  }
}

/* Respecte les préférences de réduction des animations. */
@media (prefers-reduced-motion: reduce) {
  .nav-link,
  .page-content button,
  .sidebar {
    transition: none;
  }
}
</style>
