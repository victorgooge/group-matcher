<template>
  <div class="app-shell">
    <AppHeader />
    <main class="page-shell" :class="{ 'page-shell--home': route.name === 'home' }">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterView, useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';

const route = useRoute();
</script>
