<template>
  <section class="card" style="max-width: 840px; margin: 0 auto;">
    <div style="display: flex; justify-content: space-between; gap: 1rem; align-items: start; flex-wrap: wrap;">
      <div>
        <h1 class="section-title">{{ isEditing ? 'Edit Study Group' : 'Create a Study Group' }}</h1>
        <p class="muted">Keep the info specific so students understand the fit quickly.</p>
      </div>
      <RouterLink class="button secondary" v-if="isEditing" :to="`/groups/${route.params.id}`">Back to Group</RouterLink>
    </div>

    <form class="form" @submit.prevent="handleSubmit">
      <label>
        Group Title
        <input v-model="form.title" type="text" placeholder="CSC 4370 Midterm Prep" required />
      </label>

      <label>
        Course Code
        <input v-model="form.courseCode" type="text" placeholder="CSC 4370" required />
      </label>

      <label>
        Description
        <textarea v-model="form.description" rows="5" placeholder="What will this study group focus on?" required />
      </label>

      <div class="grid grid-2">
        <label>
          Meeting Format
          <select v-model="form.meetingFormat">
            <option>In-Person</option>
            <option>Online</option>
            <option>Hybrid</option>
          </select>
        </label>

        <label>
          Capacity
          <input v-model.number="form.capacity" type="number" min="2" max="50" required />
        </label>
      </div>

      <div class="grid grid-2">
        <label>
          Location
          <input v-model="form.location" type="text" placeholder="Library North 3F" />
        </label>

        <label>
          Meeting Link
          <input v-model="form.meetingLink" type="text" placeholder="https://meet.example.com/study" />
        </label>
      </div>

      <div class="grid grid-2">
        <label>
          Tags
          <input v-model="form.tags" type="text" placeholder="Vue, API, finals" />
        </label>

        <label>
          Preferred Study Style
          <select v-model="form.preferredStudyStyle">
            <option value="">Any</option>
            <option>Silent / Focused</option>
            <option>Discussion-heavy</option>
            <option>Problem-solving</option>
            <option>Mixed</option>
          </select>
        </label>
      </div>

      <button class="button" type="submit" :disabled="submitting">
        {{ submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Group' }}
      </button>

      <p v-if="message" class="success-text">{{ message }}</p>
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    </form>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { groupsApi } from '../services/api';

const route = useRoute();
const router = useRouter();
const isEditing = computed(() => Boolean(route.params.id));
const submitting = ref(false);
const message = ref('');
const errorMessage = ref('');

const form = reactive({
  title: '',
  courseCode: '',
  description: '',
  meetingFormat: 'In-Person',
  capacity: 6,
  location: '',
  meetingLink: '',
  tags: '',
  preferredStudyStyle: ''
});

onMounted(async () => {
  if (!isEditing.value) return;

  try {
    const response = await groupsApi.get(route.params.id);
    const group = response.data.group;
    form.title = group.title;
    form.courseCode = group.courseCode;
    form.description = group.description;
    form.meetingFormat = group.meetingFormat;
    form.capacity = group.capacity;
    form.location = group.location || '';
    form.meetingLink = group.meetingLink || '';
    form.tags = (group.tags || []).join(', ');
    form.preferredStudyStyle = group.preferredStudyStyle || '';
  } catch (error) {
    errorMessage.value = error.message;
  }
});

async function handleSubmit() {
  submitting.value = true;
  message.value = '';
  errorMessage.value = '';

  try {
    const payload = { ...form };
    if (isEditing.value) {
      await groupsApi.update(route.params.id, payload);
      message.value = 'Group updated successfully.';
      router.push(`/groups/${route.params.id}`);
    } else {
      const response = await groupsApi.create(payload);
      router.push(`/groups/${response.data.id}`);
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    submitting.value = false;
  }
}
</script>
