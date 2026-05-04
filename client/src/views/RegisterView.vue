<template>
  <section class="auth-shell">
    <div class="card auth-card">
      <div class="page-header__content">
        <p class="eyebrow">Get Started</p>
        <h1 class="page-title">Create an account</h1>
        <p class="muted tight">Start simple, then finish your profile and availability after signup.</p>
      </div>

      <form class="form" @submit.prevent="handleSubmit">
        <div class="form-section">
          <div class="form-section__header">
            <h2>Account Setup</h2>
            <p>These are the only details required to create your account.</p>
          </div>

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
            <span class="field-hint">Choose a password you will remember. You can complete the rest of your profile after this step.</span>
          </label>

          <label>
            Role
            <select v-model="form.role">
              <option value="student">Student</option>
              <option value="leader">Group Leader</option>
            </select>
            <span class="field-hint">Pick the role that best matches how you expect to use the app.</span>
          </label>
        </div>

        <button class="button" type="submit" :disabled="submitting">
          {{ submitting ? 'Creating account...' : 'Create account' }}
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
