<template>
  <section class="auth-shell">
    <div class="card auth-card">
      <h1 class="section-title">Create an account</h1>
      <p class="muted">Start simple, then finish your profile and availability after signup.</p>

      <form class="form" @submit.prevent="handleSubmit">
        <label>
          Full Name
          <input v-model="form.name" type="text" placeholder="Jordan Student" required />
        </label>

        <label>
          Email
          <input v-model="form.email" type="email" placeholder="student@gsu.edu" required />
        </label>

        <label>
          Password
          <input v-model="form.password" type="password" placeholder="At least 8 characters" required />
        </label>

        <label>
          Role
          <select v-model="form.role">
            <option value="student">Student</option>
            <option value="leader">Group Leader</option>
          </select>
        </label>

        <button class="button" type="submit" :disabled="submitting">
          {{ submitting ? 'Creating account...' : 'Create account' }}
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
  name: '',
  email: '',
  password: '',
  role: 'student'
});

async function handleSubmit() {
  submitting.value = true;
  errorMessage.value = '';

  try {
    await auth.register(form);
    router.push('/profile');
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    submitting.value = false;
  }
}
</script>
