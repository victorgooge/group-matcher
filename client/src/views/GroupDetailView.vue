<template>
  <section class="grid" v-if="details">
    <div class="card">
      <div style="display: flex; justify-content: space-between; gap: 1rem; align-items: start; flex-wrap: wrap;">
        <div>
          <p class="pill">{{ details.group.courseCode }}</p>
          <h1 class="section-title">{{ details.group.title }}</h1>
          <p class="muted">
            {{ details.group.meetingFormat }} - {{ details.group.location || details.group.meetingLink || 'Location shared later' }} -
            Leader: {{ details.group.leader.name }}
          </p>
          <div class="chip-row" style="margin-top: 0.75rem;">
            <span class="pill">{{ membershipLabel }}</span>
            <span v-if="details.group.joinRequestStatus" class="pill">Request: {{ details.group.joinRequestStatus }}</span>
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <RouterLink
            v-if="details.group.isLeader"
            class="button secondary"
            :to="`/groups/${details.group.id}/edit`"
          >
            Edit Group
          </RouterLink>
          <button
            v-if="details.group.isLeader"
            class="button secondary"
            type="button"
            @click="deleteGroup"
          >
            Delete Group
          </button>
          <button
            v-if="canRequestJoin"
            class="button"
            type="button"
            @click="requestJoin"
          >
            {{ joinButtonLabel }}
          </button>
        </div>
      </div>

      <p style="margin: 1rem 0;">{{ details.group.description }}</p>
      <div class="chip-row">
        <span v-for="tag in details.group.tags" :key="tag" class="pill">{{ tag }}</span>
        <span class="pill">{{ details.group.activeMemberCount }}/{{ details.group.capacity }} members</span>
        <span class="pill">Preferred style: {{ details.group.preferredStudyStyle || 'Any' }}</span>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div style="display: flex; justify-content: space-between; gap: 1rem; align-items: center;">
          <h2 class="section-title">Sessions</h2>
        </div>

        <form v-if="details.group.isLeader" class="form" style="margin-bottom: 1rem;" @submit.prevent="createSession">
          <label>
            Session Title
            <input v-model="sessionForm.title" type="text" placeholder="Backend API Review" required />
          </label>

          <div class="grid grid-2">
            <label>
              Scheduled At
              <input v-model="sessionForm.scheduledAt" type="datetime-local" required />
            </label>

            <label>
              Duration Minutes
              <input v-model.number="sessionForm.durationMinutes" type="number" min="30" step="15" required />
            </label>
          </div>

          <label>
            Location
            <input v-model="sessionForm.location" type="text" placeholder="Library or Zoom" />
          </label>

          <label>
            Notes
            <textarea v-model="sessionForm.notes" rows="3" placeholder="What should members prepare?" />
          </label>

          <button class="button secondary" type="submit">Create Session</button>
        </form>

        <div class="table-like">
          <div v-for="session in details.sessions" :key="session.id" class="table-row">
            <div>
              <div><strong>{{ session.title }}</strong></div>
              <div class="muted">{{ formatDate(session.scheduled_at) }} - {{ session.status }}</div>
            </div>
            <RouterLink class="button secondary" :to="`/groups/${details.group.id}/sessions/${session.id}`">Open</RouterLink>
          </div>
          <p v-if="!details.sessions.length" class="muted">No sessions scheduled yet.</p>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Members</h2>
        <div class="table-like">
          <div v-for="member in details.members" :key="member.id" class="table-row">
            <div>
              <div><strong>{{ member.name }}</strong></div>
              <div class="muted">{{ member.role }}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <ReliabilityBadge :score="member.reliability.score" />
              <span class="pill">No-shows: {{ member.reliability.noShowCount }}</span>
              <button
                v-if="details.group.isLeader && member.id !== auth.user?.id"
                class="button link"
                type="button"
                @click="removeMember(member.id)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" v-if="details.group.isLeader">
      <h2 class="section-title">Pending Join Requests</h2>
      <div class="table-like">
        <div v-for="request in details.pendingRequests" :key="request.id" class="table-row">
          <div>
            <div><strong>{{ request.name }}</strong></div>
            <div class="muted">{{ request.email }}</div>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button class="button secondary" type="button" @click="approveRequest(request.id)">Approve</button>
            <button class="button secondary" type="button" @click="rejectRequest(request.id)">Reject</button>
          </div>
        </div>
        <p v-if="!details.pendingRequests.length" class="muted">No pending requests right now.</p>
      </div>
    </div>

    <p v-if="message" class="success-text">{{ message }}</p>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import ReliabilityBadge from '../components/ReliabilityBadge.vue';
import { useAuthStore } from '../stores/auth';
import { groupsApi, sessionsApi } from '../services/api';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const details = ref(null);
const message = ref('');
const errorMessage = ref('');

const sessionForm = reactive({
  title: '',
  scheduledAt: '',
  durationMinutes: 90,
  location: '',
  notes: ''
});

const canRequestJoin = computed(() => {
  if (!auth.isAuthenticated || !details.value) return false;
  return !details.value.group.isLeader && !details.value.group.isMember && details.value.group.joinRequestStatus !== 'pending';
});

const joinButtonLabel = computed(() => {
  if (!details.value) return 'Request to Join';
  if (details.value.group.joinRequestStatus === 'approved') return 'Approved';
  if (details.value.group.joinRequestStatus === 'rejected') return 'Request Again';
  return 'Request to Join';
});

const membershipLabel = computed(() => {
  if (!details.value) return 'Loading';
  if (details.value.group.isLeader) return 'Leader';
  if (details.value.group.isMember) return 'Member';
  if (details.value.group.joinRequestStatus === 'pending') return 'Pending approval';
  if (details.value.group.joinRequestStatus === 'rejected') return 'Request rejected';
  if (details.value.group.joinRequestStatus === 'approved') return 'Approved';
  return 'Not a member';
});

function formatDate(value) {
  return new Date(value).toLocaleString();
}

async function loadDetails() {
  const response = await groupsApi.get(route.params.id);
  details.value = response.data;
}

onMounted(async () => {
  try {
    await loadDetails();
  } catch (error) {
    errorMessage.value = error.message;
  }
});

async function requestJoin() {
  try {
    await groupsApi.requestJoin(route.params.id);
    message.value = 'Join request submitted.';
    await loadDetails();
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function approveRequest(requestId) {
  try {
    await groupsApi.approveRequest(route.params.id, requestId);
    await loadDetails();
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function rejectRequest(requestId) {
  try {
    await groupsApi.rejectRequest(route.params.id, requestId);
    await loadDetails();
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function removeMember(memberId) {
  try {
    await groupsApi.removeMember(route.params.id, memberId);
    await loadDetails();
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function createSession() {
  try {
    await sessionsApi.create(route.params.id, sessionForm);
    message.value = 'Session created.';
    sessionForm.title = '';
    sessionForm.scheduledAt = '';
    sessionForm.location = '';
    sessionForm.notes = '';
    await loadDetails();
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function deleteGroup() {
  if (!window.confirm('Delete this study group? This will remove its sessions, requests, and memberships.')) {
    return;
  }

  try {
    await groupsApi.delete(route.params.id);
    router.push('/groups');
  } catch (error) {
    errorMessage.value = error.message;
  }
}
</script>
