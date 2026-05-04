<template>
  <section class="auth-shell">
    <div class="card auth-card">
      <div class="page-header__content">
        <p class="eyebrow">Welcome Back</p>
        <h1 class="page-title">Login</h1>
        <p class="muted tight">Sign in with an existing account to see your dashboard, groups, and profile.</p>
      </div>

      <form class="form" @submit.prevent="handleSubmit">
        <label>
          Email
          <input v-model="form.email" type="email" placeholder="student1@example.com" required />
        </label>

        <label>
          Password
          <input v-model="form.password" type="password" placeholder="Password123!" required />
          <span class="field-hint">Use the email and password tied to your existing account.</span>
        </label>

        <button class="button" type="submit" :disabled="submitting">
          {{ submitting ? 'Logging in...' : 'Login' }}
        </button>

        <div class="feedback-stack">
          <p v-if="errorMessage" class="feedback-banner feedback-banner--error error-text">{{ errorMessage }}</p>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const submitting = ref(false);
const errorMessage = ref('');

const form = reactive({
  email: 'student1@example.com',
  password: 'Password123!'
});

async function handleSubmit() {
  submitting.value = true;
  errorMessage.value = '';

  try {
    await auth.login(form);
    router.push('/dashboard');
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    submitting.value = false;
  }
}
</script>
