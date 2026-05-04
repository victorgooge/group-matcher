<template>
  <section class="stack-lg" v-if="details">
    <!-- Session header -->
    <div class="card">
      <div class="page-header">
        <div class="page-header__content">
          <RouterLink class="eyebrow" :to="`/groups/${details.session.groupId}`" style="text-decoration:underline;text-underline-offset:3px">
            &larr; {{ details.session.groupTitle }}
          </RouterLink>
          <h1 class="page-title" style="margin-top:0.3rem">{{ details.session.title }}</h1>
          <p class="muted tight">
            {{ formatDate(details.session.scheduledAt) }} &middot;
            {{ details.session.durationMinutes }} min &middot;
            {{ details.session.location || 'Location TBD' }}
          </p>
          <div class="chip-row" style="margin-top:0.5rem">
            <span class="status-tag" :data-status="details.session.status">{{ sessionStatusLabel(details.session.status) }}</span>
          </div>
        </div>

        <!-- Leader session controls -->
        <div class="page-header__actions" v-if="details.session.isLeader">
          <button
            v-if="['scheduled', 'missed'].includes(details.session.status)"
            class="button"
            type="button"
            @click="startSession"
          >
            Start Session
          </button>
          <button
            v-if="details.session.status === 'active'"
            class="button"
            type="button"
            @click="completeSession"
          >
            Complete Session
          </button>
          <button
            v-if="['scheduled', 'active', 'missed'].includes(details.session.status)"
            class="button secondary"
            type="button"
            @click="cancelSession"
          >
            Cancel
          </button>
        </div>
      </div>

      <p v-if="details.session.notes" class="muted" style="margin-top:0.5rem">{{ details.session.notes }}</p>

      <!-- Student check-in banner -->
      <div v-if="details.session.canCheckIn" class="status-banner" data-status="active">
        <strong>Session is live — check in now</strong>
        <span>Your attendance is only recorded if you check in while the session is active.</span>
        <div class="inline-actions" style="margin-top:0.5rem">
          <button class="button" type="button" :disabled="checkingIn" @click="handleCheckIn">
            {{ checkingIn ? 'Checking in...' : 'Check In' }}
          </button>
        </div>
      </div>

      <div v-else-if="myAttendance?.status === 'present'" class="status-banner" data-status="approved">
        <strong>You are checked in</strong>
        <span>Your attendance for this session has been recorded.</span>
      </div>
    </div>

    <div class="grid grid-2">
      <!-- Attendance -->
      <div class="card">
        <div class="section-header__content">
          <h2 class="section-title">Attendance</h2>
          <p class="muted tight">
            <span v-if="details.session.status === 'active'">Live session — members can self check-in.</span>
            <span v-else-if="details.session.status === 'completed'">Attendance is finalized.</span>
            <span v-else>Attendance will be tracked once the session starts.</span>
          </p>
        </div>

        <!-- Leader override form (on completed sessions) -->
        <form
          v-if="details.session.canManageAttendance && details.session.status === 'completed'"
          class="form surface-muted"
          @submit.prevent="saveAttendance"
        >
          <p style="margin:0;font-weight:700;font-size:0.9rem">Override Attendance</p>
          <div v-for="member in details.members" :key="member.id" class="table-row" style="padding:0.5rem 0">
            <span>{{ member.name }}</span>
            <select v-model="attendanceMap[member.id]" style="width:auto;min-width:120px">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <button class="button secondary" type="submit">Save Changes</button>
        </form>

        <!-- Attendance display -->
        <div class="table-like">
          <div v-if="details.attendance.length">
            <div v-for="entry in details.attendance" :key="entry.user_id" class="table-row">
              <span>{{ entry.name }}</span>
              <div class="inline-actions">
                <span class="status-tag" :data-status="entry.status">{{ attendanceLabel(entry.status) }}</span>
                <span v-if="entry.checked_in_at" class="muted" style="font-size:0.82rem">
                  Checked in {{ formatTime(entry.checked_in_at) }}
                </span>
              </div>
            </div>
          </div>
          <div v-else>
            <div v-for="member in details.members" :key="member.id" class="table-row">
              <span>{{ member.name }}</span>
              <span class="status-tag" data-status="scheduled">Not yet</span>
            </div>
          </div>
          <p v-if="!details.members.length" class="empty-state">No members in this group.</p>
        </div>
      </div>

      <!-- Ratings -->
      <div class="card">
        <div class="section-header__content">
          <h2 class="section-title">Peer Ratings</h2>
          <p class="muted tight">
            <span v-if="details.session.status !== 'completed'">Ratings open after the session is completed.</span>
            <span v-else-if="details.session.canRate">Rate attendees you shared the session with.</span>
            <span v-else>You are not eligible to rate in this session.</span>
          </p>
        </div>

        <form
          v-if="details.session.canRate && details.eligibleRatees.length"
          class="form surface-muted"
          @submit.prevent="submitRating"
        >
          <label>
            Rate
            <select v-model="ratingForm.ratedUserId">
              <option v-for="member in details.eligibleRatees" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
          </label>
          <label>
            Score
            <select v-model.number="ratingForm.score">
              <option :value="5">5 — Excellent</option>
              <option :value="4">4 — Good</option>
              <option :value="3">3 — Okay</option>
              <option :value="2">2 — Below average</option>
              <option :value="1">1 — Poor</option>
            </select>
          </label>
          <label>
            Feedback (optional)
            <textarea v-model="ratingForm.feedbackText" rows="3" placeholder="Brief note about their participation..." />
          </label>
          <button class="button secondary" type="submit">Submit Rating</button>
        </form>

        <p
          v-else-if="details.session.canRate && !details.eligibleRatees.length"
          class="muted"
          style="font-size:0.92rem"
        >
          You have already rated all eligible attendees for this session.
        </p>

        <div class="table-like" style="margin-top:0.75rem">
          <div v-for="rating in details.ratings" :key="rating.id" class="table-row">
            <div class="table-row__content">
              <div>
                <strong>{{ rating.rater_name }}</strong>
                <span class="muted"> rated </span>
                <strong>{{ rating.rated_name }}</strong>
              </div>
              <div class="muted" style="font-size:0.88rem">{{ rating.feedback_text || 'No written feedback.' }}</div>
            </div>
            <strong style="font-size:1.05rem">{{ rating.score }}<span class="muted">/5</span></strong>
          </div>
          <p v-if="!details.ratings.length" class="empty-state">No ratings submitted yet.</p>
        </div>
      </div>
    </div>

    <p v-if="message" class="feedback-banner feedback-banner--success">{{ message }}</p>
    <p v-if="errorMessage" class="feedback-banner feedback-banner--error error-text">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { sessionsApi } from '../services/api';

const route = useRoute();
const auth = useAuthStore();
const details = ref(null);
const message = ref('');
const errorMessage = ref('');
const checkingIn = ref(false);
const attendanceMap = reactive({});
const ratingForm = reactive({
  ratedUserId: null,
  score: 5,
  feedbackText: ''
});

const myAttendance = computed(() => {
  if (!details.value || !auth.user) return null;
  return details.value.attendance.find((e) => Number(e.user_id) === Number(auth.user.id)) ?? null;
});

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function sessionStatusLabel(status) {
  const labels = {
    scheduled: 'Scheduled',
    active: 'Live Now',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rescheduled: 'Rescheduled',
    missed: 'Missed'
  };
  return labels[status] ?? status;
}

function attendanceLabel(status) {
  const labels = {
    present: 'Present',
    absent: 'Absent',
    excused: 'Excused',
    no_show: 'No Show'
  };
  return labels[status] ?? status;
}

function showMessage(msg) {
  message.value = msg;
  errorMessage.value = '';
  setTimeout(() => { message.value = ''; }, 3500);
}

function showError(msg) {
  errorMessage.value = msg;
  message.value = '';
}

async function loadSession() {
  const response = await sessionsApi.get(route.params.sessionId);
  details.value = response.data;

  for (const member of response.data.members) {
    const existing = response.data.attendance.find((e) => Number(e.user_id) === Number(member.id));
    attendanceMap[member.id] = existing?.status ?? 'absent';
  }

  if (!ratingForm.ratedUserId && response.data.eligibleRatees.length) {
    ratingForm.ratedUserId = response.data.eligibleRatees[0].id;
  }
}

onMounted(async () => {
  try {
    await loadSession();
  } catch (error) {
    showError(error.message);
  }
});

async function handleCheckIn() {
  checkingIn.value = true;
  try {
    await sessionsApi.checkIn(route.params.sessionId);
    showMessage('Checked in successfully!');
    await loadSession();
  } catch (error) {
    showError(error.message);
  } finally {
    checkingIn.value = false;
  }
}

async function startSession() {
  try {
    await sessionsApi.start(route.params.sessionId);
    showMessage('Session is now live. Members can check in.');
    await loadSession();
  } catch (error) {
    showError(error.message);
  }
}

async function completeSession() {
  if (!window.confirm('Complete this session? Members who did not check in will be marked absent.')) return;
  try {
    await sessionsApi.complete(route.params.sessionId);
    showMessage('Session completed. Attendance finalized.');
    await loadSession();
  } catch (error) {
    showError(error.message);
  }
}

async function cancelSession() {
  if (!window.confirm('Cancel this session?')) return;
  try {
    await sessionsApi.cancel(route.params.sessionId);
    showMessage('Session cancelled.');
    await loadSession();
  } catch (error) {
    showError(error.message);
  }
}

async function saveAttendance() {
  try {
    const entries = Object.entries(attendanceMap).map(([userId, status]) => ({
      userId: Number(userId),
      status
    }));
    await sessionsApi.saveAttendance(route.params.sessionId, { entries });
    showMessage('Attendance updated.');
    await loadSession();
  } catch (error) {
    showError(error.message);
  }
}

async function submitRating() {
  try {
    await sessionsApi.rate(route.params.sessionId, ratingForm);
    showMessage('Rating submitted.');
    ratingForm.feedbackText = '';
    await loadSession();
  } catch (error) {
    showError(error.message);
  }
}
</script>
