<template>
  <section class="auth-shell">
    <div class="card auth-card">
      <h1 class="section-title">Login</h1>
      <p class="muted">Use a seeded account or sign in with a registered user.</p>

      <form class="form" @submit.prevent="handleSubmit">
        <label>
          Email
          <input v-model="form.email" type="email" placeholder="student1@example.com" required />
        </label>

        <label>
          Password
          <input v-model="form.password" type="password" placeholder="Password123!" required />
        </label>

        <button class="button" type="submit" :disabled="submitting">
          {{ submitting ? 'Logging in...' : 'Login' }}
        </button>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
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
