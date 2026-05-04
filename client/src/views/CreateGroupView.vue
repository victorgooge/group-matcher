<template>
  <section class="card" style="max-width: 840px; margin: 0 auto;">
    <div class="page-header">
      <div class="page-header__content">
        <p class="eyebrow">{{ isEditing ? 'Update Group' : 'New Group' }}</p>
        <h1 class="page-title">{{ isEditing ? 'Edit Study Group' : 'Create a Study Group' }}</h1>
        <p class="muted tight">Keep the info specific so students can understand the fit quickly.</p>
      </div>
      <RouterLink class="button secondary" v-if="isEditing" :to="`/groups/${route.params.id}`">Back to Group</RouterLink>
    </div>

    <form class="form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <div class="form-section__header">
          <h2>Basic Details</h2>
          <p>Start with the core information students use to decide whether the group is relevant.</p>
        </div>

        <label>
          Group Title
          <input v-model="form.title" type="text" placeholder="CSC 4370 Midterm Prep" required />
          <span class="field-hint">Use the course and the goal so the purpose is obvious right away.</span>
        </label>

        <div class="grid grid-2">
          <label>
            Course Code
            <input v-model="form.courseCode" type="text" placeholder="CSC 4370" required />
          </label>

          <label>
            Capacity
            <input v-model.number="form.capacity" type="number" min="2" max="50" required />
            <span class="field-hint">Set the maximum number of active members you want in the group.</span>
          </label>
        </div>

        <label>
          Description
          <textarea v-model="form.description" rows="5" placeholder="What will this study group focus on?" required />
          <span class="field-hint">Mention the topic, pace, and what members should expect from sessions.</span>
        </label>
      </div>

      <div class="form-section">
        <div class="form-section__header">
          <h2>Meeting Setup</h2>
          <p>Clarify how the group meets so people can quickly rule it in or out.</p>
        </div>

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

        <div class="grid grid-2">
          <label>
            Location
            <input v-model="form.location" type="text" placeholder="Library North 3F" />
          </label>

          <label>
            Meeting Link
            <input v-model="form.meetingLink" type="text" placeholder="https://meet.example.com/study" />
            <span class="field-hint">Use whichever field matches the format best. You can leave the other blank.</span>
          </label>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section__header">
          <h2>Extra Context</h2>
          <p>These details help the right students recognize the fit faster.</p>
        </div>

        <label>
          Tags
          <input v-model="form.tags" type="text" placeholder="Vue, API, finals" />
          <span class="field-hint">Separate tags with commas to highlight topics or focus areas.</span>
        </label>
      </div>

      <button class="button" type="submit" :disabled="submitting">
        {{ submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Group' }}
      </button>

      <div class="feedback-stack">
        <p v-if="message" class="feedback-banner feedback-banner--success success-text">{{ message }}</p>
        <p v-if="errorMessage" class="feedback-banner feedback-banner--error error-text">{{ errorMessage }}</p>
      </div>
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
