<script setup>
import AdminProtection from '~/components/admin/AdminProtection.vue'


definePageMeta({
  layout: 'admin'
})
</script>

<template>
  <AdminProtection>
    <section class="dashboard">
      <div class="page-heading">
        <p class="eyebrow">VUE GÉNÉRALE</p>
        <h1>Tableau de bord</h1>
        <p class="description">
          Gérez le contenu de votre plateforme Movie King.
        </p>
      </div>

      <div class="stats-grid">
        <article class="stat-card">
          <div class="stat-icon">🏷️</div>
          <p>Genres</p>
          <strong>Classification</strong>
          <NuxtLink to="/admin/categories">
            Gérer les genres →
          </NuxtLink>
        </article>

        <article class="stat-card">
          <div class="stat-icon">👥</div>
          <p>Utilisateurs</p>
          <strong>Comptes inscrits</strong>
          <NuxtLink to="/admin/joueurs">
            Gérer les utilisateurs →
          </NuxtLink>
        </article>
        <article class="stat-card">
          <div class="stat-icon">💬</div>
          <p>Citations</p>
          <strong>Gérer les citations</strong>
          <NuxtLink to="/admin/quotes">
            Gérer les citations →
          </NuxtLink>
        </article>
<article class="stat-card">
          <div class="stat-icon">📊</div>
          <p>Films</p>
          <strong>Les statistiques</strong>
          <NuxtLink to="/admin/statistiques">
            Gérer les statistiques →
          </NuxtLink>
        </article>
        

      </div>
    </section>
  </AdminProtection>

</template>

<style scoped>
.page-heading {
  margin-bottom: 30px;
}

.eyebrow {
  margin-bottom: 10px;
  color: #739C91;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}


.description {
  margin-top: 10px;
  color: #ff626b;
  font-size: 14px;
  line-height: 1.6;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.stat-card {
  padding: 24px;
  background:#ffb800;
  border: 1px solid #E5E0D6;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgb(33 33 33 / 4%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  border-color: #739C91;
  box-shadow: 0 8px 20px rgb(33 33 33 / 8%);
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
}

.stat-card p {
  margin: 18px 0 8px;
  color: black;
  font-size: 13px;
}

.stat-card strong {
  display: block;
  margin-bottom: 20px;
  color: #212121;
  font-size: 22px;
  font-weight: 700;
}

.stat-card a {
  display: inline-block;
  color: #52796F;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.stat-card a:hover {
  color: #212121;
  text-decoration: underline;
}

.stat-card a:focus-visible {
  outline: 2px solid #739C91;
  outline-offset: 4px;
  border-radius: 3px;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .page-heading {
    margin-bottom: 24px;
  }

  h1 {
    font-size: 25px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .stat-card {
    padding: 20px;
  }
}
</style>
