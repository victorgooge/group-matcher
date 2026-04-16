<template>
  <section class="grid" v-if="details">
    <div class="card">
      <p class="pill">{{ details.session.groupTitle }}</p>
      <h1 class="section-title">{{ details.session.title }}</h1>
      <p class="muted">
        {{ formatDate(details.session.scheduledAt) }} - {{ details.session.durationMinutes }} minutes -
        {{ details.session.location || 'Location TBD' }}
      </p>
      <p>{{ details.session.notes || 'No additional notes for this session.' }}</p>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h2 class="section-title">Attendance</h2>

        <form v-if="details.session.canManageAttendance" class="form" @submit.prevent="saveAttendance">
          <div v-for="member in details.members" :key="member.id" class="table-row">
            <span>{{ member.name }}</span>
            <select v-model="attendanceMap[member.id]">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          <button class="button" type="submit">Save Attendance</button>
        </form>

        <div v-else class="table-like">
          <div v-for="entry in details.attendance" :key="entry.user_id" class="table-row">
            <span>{{ entry.name }}</span>
            <strong>{{ entry.status }}</strong>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Ratings</h2>

        <form v-if="details.session.canRate && details.eligibleRatees.length" class="form" @submit.prevent="submitRating">
          <label>
            Rate Attendee
            <select v-model="ratingForm.ratedUserId">
              <option v-for="member in details.eligibleRatees" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
          </label>

          <label>
            Score
            <select v-model.number="ratingForm.score">
              <option :value="5">5</option>
              <option :value="4">4</option>
              <option :value="3">3</option>
              <option :value="2">2</option>
              <option :value="1">1</option>
            </select>
          </label>

          <label>
            Feedback
            <textarea v-model="ratingForm.feedbackText" rows="4" placeholder="Optional short feedback" />
          </label>

          <button class="button secondary" type="submit">Submit Rating</button>
        </form>

        <p v-else class="muted">
          Ratings open only for attendees marked present in this session.
        </p>

        <div class="table-like" style="margin-top: 1rem;">
          <div v-for="rating in details.ratings" :key="rating.id" class="table-row">
            <div>
              <div><strong>{{ rating.rater_name }} -> {{ rating.rated_name }}</strong></div>
              <div class="muted">{{ rating.feedback_text || 'No written feedback.' }}</div>
            </div>
            <strong>{{ rating.score }}/5</strong>
          </div>
          <p v-if="!details.ratings.length" class="muted">No ratings submitted yet.</p>
        </div>
      </div>
    </div>

    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { sessionsApi } from '../services/api';

const route = useRoute();
const details = ref(null);
const message = ref('');
const errorMessage = ref('');
const attendanceMap = reactive({});
const ratingForm = reactive({
  ratedUserId: null,
  score: 5,
  feedbackText: ''
});

function formatDate(value) {
  return new Date(value).toLocaleString();
}

async function loadSession() {
  const response = await sessionsApi.get(route.params.sessionId);
  details.value = response.data;

  for (const member of response.data.members) {
    const attendance = response.data.attendance.find((entry) => Number(entry.user_id) === Number(member.id));
    attendanceMap[member.id] = attendance?.status || 'absent';
  }

  if (!ratingForm.ratedUserId && response.data.eligibleRatees.length) {
    ratingForm.ratedUserId = response.data.eligibleRatees[0].id;
  }
}

onMounted(async () => {
  try {
    await loadSession();
  } catch (error) {
    errorMessage.value = error.message;
  }
});

async function saveAttendance() {
  try {
    const entries = Object.entries(attendanceMap).map(([userId, status]) => ({
      userId: Number(userId),
      status
    }));

    await sessionsApi.saveAttendance(route.params.sessionId, { entries });
    message.value = 'Attendance saved.';
    await loadSession();
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function submitRating() {
  try {
    await sessionsApi.rate(route.params.sessionId, ratingForm);
    message.value = 'Rating submitted.';
    ratingForm.feedbackText = '';
    await loadSession();
  } catch (error) {
    errorMessage.value = error.message;
  }
}
</script>
