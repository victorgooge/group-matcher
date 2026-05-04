<template>
  <header class="site-header">
    <div class="site-header__inner">
      <RouterLink to="/" class="brand-mark">
        <span class="brand-mark__eyebrow">{{ currentSection }}</span>
        <strong class="brand-logo">
          <span class="brand-logo__spark" aria-hidden="true"></span>
          <span class="brand-logo__study">Study</span><span class="brand-logo__sync">Sync</span>
        </strong>
        <span class="brand-mark__context">{{ currentPage }}</span>
      </RouterLink>

      <div class="site-nav-wrap">
        <nav class="site-nav">
          <RouterLink class="nav-link" to="/groups">Groups</RouterLink>
          <RouterLink v-if="auth.isAuthenticated" class="nav-link" to="/my-groups">My Groups</RouterLink>
          <RouterLink v-if="auth.isAuthenticated" class="nav-link" to="/dashboard">Dashboard</RouterLink>
          <RouterLink v-if="auth.isAuthenticated" class="nav-link" to="/profile">Profile</RouterLink>
        </nav>

        <div class="site-nav__actions">
          <span
            v-if="auth.user"
            class="pill role-pill"
            :data-role="auth.user.role"
          >
            {{ auth.user.name }} | {{ formatRoleLabel(auth.user.role) }}
          </span>

          <button
            v-if="auth.isAuthenticated"
            class="button button--logout"
            @click="logout"
          >
            Logout
          </button>

          <template v-else>
            <RouterLink class="button secondary" to="/login">Login</RouterLink>
            <RouterLink class="button" to="/register">Sign Up</RouterLink>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const currentSection = computed(() => {
  if (route.name === 'home') return 'Home';
  if (route.name === 'groups' || route.name === 'group-detail' || route.name === 'group-create' || route.name === 'group-edit') return 'Groups';
  if (route.name === 'session-detail') return 'Sessions';
  if (route.name === 'dashboard') return 'Dashboard';
  if (route.name === 'profile') return 'Profile';
  if (route.name === 'my-groups') return 'My Groups';
  if (route.name === 'login') return 'Account Access';
  if (route.name === 'register') return 'Create Account';
  return 'StudySync';
});

const currentPage = computed(() => {
  if (route.name === 'home') return 'Find reliable study partners';
  if (route.name === 'groups') return 'Browse open study groups';
  if (route.name === 'group-detail') return 'Review group details and activity';
  if (route.name === 'group-create') return 'Set up a new study group';
  if (route.name === 'group-edit') return 'Update group details';
  if (route.name === 'session-detail') return 'Track attendance and ratings';
  if (route.name === 'dashboard') return 'See your progress and next steps';
  if (route.name === 'profile') return 'Manage your profile and availability';
  if (route.name === 'my-groups') return 'Quick access to your groups';
  if (route.name === 'login') return 'Sign in to your account';
  if (route.name === 'register') return 'Create your account to get started';
  return 'StudySync';
});

function formatRoleLabel(role) {
  return role === 'teacher' ? 'Teacher' : 'Student';
}

async function logout() {
  await auth.logout();
  router.push('/');
}
</script>
