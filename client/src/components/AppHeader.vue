<template>
  <header class="site-header">
    <div class="site-header__inner">
      <RouterLink to="/" class="brand-mark">
        <span class="brand-mark__eyebrow">CSC 4370 Final Project</span>
        <strong>Study Group Matcher</strong>
      </RouterLink>

      <nav class="site-nav">
        <RouterLink to="/groups">Groups</RouterLink>
        <RouterLink v-if="auth.isAuthenticated" to="/my-groups">My Groups</RouterLink>
        <RouterLink v-if="auth.isAuthenticated" to="/dashboard">Dashboard</RouterLink>
        <RouterLink v-if="auth.isAuthenticated" to="/profile">Profile</RouterLink>
        <span v-if="auth.user" class="pill">{{ auth.user.name }} - {{ auth.user.role }}</span>

        <button
          v-if="auth.isAuthenticated"
          class="button secondary"
          @click="logout"
        >
          Logout
        </button>

        <template v-else>
          <RouterLink class="button secondary" to="/login">Login</RouterLink>
          <RouterLink class="button" to="/register">Sign Up</RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

async function logout() {
  await auth.logout();
  router.push('/');
}
</script>
