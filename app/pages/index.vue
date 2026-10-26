
<script setup>
await navigateTo('/admin/login', {
  replace: true
})
</script>

<template>
  <main class="home">
    <h1>Movie King</h1>
    <p>Bienvenue dans ton CMS cinéma</p>
    <p>Gère tes films, tes genres et tes utilisateurs depuis ton espace d’administration.</p>
  </main>
</template>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  background: #1D1D1D;
  color: #EADFC9;
  text-align: center;
  font-family: Arial, sans-serif;
}

h1 {
  margin-bottom: 10px;
  color: #5E9E94;
  font-size: 42px;
}

p {
  line-height: 1.6;
}
</style>
