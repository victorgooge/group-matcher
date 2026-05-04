<template>
  <section class="grid grid-2" v-if="loaded">
    <div class="card">
      <div class="page-header__content">
        <p class="eyebrow">Account</p>
        <h1 class="page-title"><UserIcon class="heading-icon" /> Profile</h1>
        <p class="muted tight">Keep the basics current so your matches are easier to trust.</p>
      </div>
      <form class="form" @submit.prevent="saveProfile">
        <div class="form-section">
          <div class="form-section__header">
            <h2>About You</h2>
            <p>These basics make your profile easier for other students to read and trust.</p>
          </div>

          <label>
            Name
            <input v-model="form.name" type="text" required />
          </label>

          <div class="grid grid-2">
            <label>
              Major
              <input v-model="form.major" type="text" placeholder="Computer Science" />
            </label>

            <label>
              Preferred Group Size
              <input v-model.number="form.preferredGroupSize" type="number" min="2" max="12" />
              <span class="field-hint">Share the team size where you tend to work best.</span>
            </label>
          </div>

          <label>
            Bio
            <textarea v-model="form.bio" rows="5" placeholder="What makes you a good study partner?" />
            <span class="field-hint">A short note about how you study helps others set expectations.</span>
          </label>
        </div>

        <div class="form-section">
          <div class="form-section__header">
            <h2>Academic Fit</h2>
            <p>These details improve matching and make your suggestions more useful.</p>
          </div>

          <label>
            Courses
            <input v-model="form.courses" type="text" placeholder="CSC 4370, CSC 3320, MATH 2215" />
            <span class="field-hint">Separate courses with commas so matching can recognize each one.</span>
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

          <label style="flex-direction:row;align-items:center;gap:0.75rem;cursor:pointer">
            <input v-model="form.isLookingForGroup" type="checkbox" style="width:auto;border-radius:4px;flex:0 0 auto" />
            <span style="font-weight:600">I am actively looking for a group</span>
          </label>
          <p class="field-hint" style="margin-top:-0.5rem">Leaders can see this flag when searching for students to invite.</p>
        </div>

        <button class="button" type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Profile' }}
        </button>
      </form>

      <div class="feedback-stack">
        <p v-if="message" class="feedback-banner feedback-banner--success success-text">{{ message }}</p>
        <p v-if="errorMessage" class="feedback-banner feedback-banner--error error-text">{{ errorMessage }}</p>
      </div>
    </div>

    <div class="stack-md">
      <div class="card">
        <div class="section-header__content">
          <h2 class="section-title">Reliability</h2>
          <p class="muted tight">This is the summary other members can use to judge dependability.</p>
        </div>
        <ReliabilityBadge :score="reliability.score" />
        <div class="status-banner" :data-status="reliabilityTone">
          <strong>{{ reliabilityHeadline }}</strong>
          <span>{{ reliabilityMessage }}</span>
        </div>
        <div class="metric-grid">
          <div class="metric-card">
            <strong>{{ Math.round(reliability.attendanceRate * 100) }}%</strong>
            <span>Attendance rate</span>
          </div>
          <div class="metric-card">
            <strong>{{ reliability.peerRatingAverage ?? 'New' }}</strong>
            <span>Peer rating average</span>
          </div>
          <div class="metric-card">
            <strong>{{ reliability.noShowCount }}</strong>
            <span>No-shows</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-header__content">
          <h2 class="section-title"><CalendarDaysIcon class="heading-icon heading-icon--sm" /> Availability</h2>
          <p class="muted tight">Add the time windows when you can reliably meet.</p>
        </div>
        <form class="form" @submit.prevent="addAvailability">
          <div class="form-section surface-muted">
            <div class="form-section__header">
              <h2>Add A Time Block</h2>
              <p>Use blocks for the times you can usually commit to, not one-off exceptions.</p>
            </div>

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
          </div>
        </form>

        <div class="table-like">
          <div v-for="block in availability" :key="block.id" class="table-row">
            <span>{{ block.day_of_week }}</span>
            <div class="inline-actions">
              <strong>{{ block.start_time }} - {{ block.end_time }}</strong>
              <button class="button link" type="button" @click="removeAvailability(block.id)">Remove</button>
            </div>
          </div>
          <p v-if="!availability.length" class="empty-state">No availability added yet.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { CalendarDaysIcon, UserIcon } from '@heroicons/vue/24/outline';
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
  bio: '',
  isLookingForGroup: false
});

const availabilityForm = reactive({
  dayOfWeek: 'Monday',
  startTime: '15:00',
  endTime: '17:00'
});

const reliabilityHeadline = computed(() => {
  if (reliability.value.score == null) return 'You are still building a reliability record';
  if (reliability.value.score >= 90) return 'Your reliability is a strong selling point';
  if (reliability.value.score >= 75) return 'Your reliability looks solid';
  if (reliability.value.score >= 50) return 'Your reliability is mixed right now';
  return 'Your reliability needs improvement';
});

const reliabilityMessage = computed(() => {
  if (reliability.value.score == null) return 'Attend a few sessions and collect ratings so other groups have more context.';
  if (reliability.value.noShowCount > 0) return 'Reducing no-shows will help this improve faster than anything else.';
  if (reliability.value.attendanceRate >= 0.85) return 'Your attendance record already gives other users a good reason to trust you.';
  return 'Consistent attendance and more completed ratings will make this profile stronger.';
});

const reliabilityTone = computed(() => {
  if (reliability.value.score == null) return 'neutral';
  if (reliability.value.score >= 90) return 'approved';
  if (reliability.value.score >= 75) return 'member';
  if (reliability.value.score >= 50) return 'pending';
  return 'rejected';
});

async function loadProfile() {
  const response = await usersApi.getMe();
  form.name = response.data.user.name;
  form.major = response.data.profile.major || '';
  form.courses = (response.data.profile.courses || []).join(', ');
  form.studyStyle = response.data.profile.studyStyle || '';
  form.preferredGroupSize = response.data.profile.preferred_group_size || 4;
  form.bio = response.data.profile.bio || '';
  form.isLookingForGroup = Boolean(response.data.profile.is_looking_for_group);
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
