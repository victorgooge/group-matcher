<template>
  <section class="grid grid-2" v-if="loaded">
    <div class="card">
      <h1 class="section-title">Profile</h1>
      <form class="form" @submit.prevent="saveProfile">
        <label>
          Name
          <input v-model="form.name" type="text" required />
        </label>

        <label>
          Major
          <input v-model="form.major" type="text" placeholder="Computer Science" />
        </label>

        <label>
          Courses
          <input v-model="form.courses" type="text" placeholder="CSC 4370, CSC 3320, MATH 2215" />
        </label>

        <label>
          Study Style
          <select v-model="form.studyStyle">
            <option value="">Select one</option>
            <option>Silent / Focused</option>
            <option>Discussion-heavy</option>
            <option>Problem-solving</option>
            <option>Mixed</option>
          </select>
        </label>

        <label>
          Preferred Group Size
          <input v-model.number="form.preferredGroupSize" type="number" min="2" max="12" />
        </label>

        <label>
          Bio
          <textarea v-model="form.bio" rows="5" placeholder="What makes you a good study partner?" />
        </label>

        <button class="button" type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Profile' }}
        </button>
      </form>

      <p v-if="message" class="success-text">{{ message }}</p>
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    </div>

    <div class="grid" style="gap: 1rem;">
      <div class="card">
        <h2 class="section-title">Reliability</h2>
        <ReliabilityBadge :score="reliability.score" />
        <div class="table-like" style="margin-top: 1rem;">
          <div class="table-row"><span>Attendance Rate</span><strong>{{ Math.round(reliability.attendanceRate * 100) }}%</strong></div>
          <div class="table-row"><span>Peer Rating Avg</span><strong>{{ reliability.peerRatingAverage ?? 'Not enough ratings' }}</strong></div>
          <div class="table-row"><span>No-Shows</span><strong>{{ reliability.noShowCount }}</strong></div>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Availability Blocks</h2>
        <form class="form" @submit.prevent="addAvailability">
          <div class="grid grid-2">
            <label>
              Day
              <select v-model="availabilityForm.dayOfWeek">
                <option>Monday</option>
                <option>Tuesday</option>
                <option>Wednesday</option>
                <option>Thursday</option>
                <option>Friday</option>
                <option>Saturday</option>
                <option>Sunday</option>
              </select>
            </label>

            <label>
              Start Time
              <input v-model="availabilityForm.startTime" type="time" required />
            </label>
          </div>

          <label>
            End Time
            <input v-model="availabilityForm.endTime" type="time" required />
          </label>

          <button class="button secondary" type="submit">Add Availability</button>
        </form>

        <div class="table-like" style="margin-top: 1rem;">
          <div v-for="block in availability" :key="block.id" class="table-row">
            <span>{{ block.day_of_week }}</span>
            <div style="display: flex; gap: 0.75rem; align-items: center;">
              <strong>{{ block.start_time }} - {{ block.end_time }}</strong>
              <button class="button link" type="button" @click="removeAvailability(block.id)">Remove</button>
            </div>
          </div>
          <p v-if="!availability.length" class="muted">No availability added yet.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import ReliabilityBadge from '../components/ReliabilityBadge.vue';
import { usersApi } from '../services/api';

const loaded = ref(false);
const saving = ref(false);
const message = ref('');
const errorMessage = ref('');
const reliability = ref({
  score: null,
  attendanceRate: 0,
  peerRatingAverage: null,
  noShowCount: 0
});
const availability = ref([]);

const form = reactive({
  name: '',
  major: '',
  courses: '',
  studyStyle: '',
  preferredGroupSize: 4,
  bio: ''
});

const availabilityForm = reactive({
  dayOfWeek: 'Monday',
  startTime: '15:00',
  endTime: '17:00'
});

async function loadProfile() {
  const response = await usersApi.getMe();
  form.name = response.data.user.name;
  form.major = response.data.profile.major || '';
  form.courses = (response.data.profile.courses || []).join(', ');
  form.studyStyle = response.data.profile.studyStyle || '';
  form.preferredGroupSize = response.data.profile.preferred_group_size || 4;
  form.bio = response.data.profile.bio || '';
  availability.value = response.data.availability;
  reliability.value = response.data.reliability;
  loaded.value = true;
}

onMounted(async () => {
  try {
    await loadProfile();
  } catch (error) {
    errorMessage.value = error.message;
  }
});

async function saveProfile() {
  saving.value = true;
  message.value = '';
  errorMessage.value = '';

  try {
    await usersApi.updateMe(form);
    await loadProfile();
    message.value = 'Profile saved.';
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    saving.value = false;
  }
}

async function addAvailability() {
  try {
    await usersApi.addAvailability(availabilityForm);
    await loadProfile();
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function removeAvailability(id) {
  try {
    await usersApi.deleteAvailability(id);
    await loadProfile();
  } catch (error) {
    errorMessage.value = error.message;
  }
}
</script>
