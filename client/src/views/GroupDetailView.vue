<template>
  <section class="stack-lg" v-if="details">
    <!-- Group header -->
    <div class="card">
      <div class="page-header">
        <div class="page-header__content">
          <p class="eyebrow">{{ details.group.courseCode }}</p>
          <h1 class="page-title">{{ details.group.title }}</h1>
          <p class="muted tight">
            {{ details.group.meetingFormat }} &middot;
            {{ details.group.location || 'Location TBD' }} &middot;
            Led by {{ details.group.leader.name }}
          </p>
          <div class="chip-row" style="margin-top:0.5rem">
            <span class="pill pill--status" :data-status="membershipStatusTone">{{ membershipLabel }}</span>
            <span v-for="tag in details.group.tags" :key="tag" class="pill">{{ tag }}</span>
            <span class="pill">{{ details.group.activeMemberCount }}/{{ details.group.capacity }} members</span>
          </div>
        </div>

        <div class="page-header__actions">
          <RouterLink v-if="details.group.isLeader" class="button secondary" :to="`/groups/${details.group.id}/edit`" style="display:inline-flex;align-items:center;gap:0.35rem">
            <PencilSquareIcon style="width:1em;height:1em" />
            Edit Group
          </RouterLink>
          <button v-if="details.group.isLeader" class="button danger" type="button" @click="deleteGroup" style="display:inline-flex;align-items:center;gap:0.35rem">
            <TrashIcon style="width:1em;height:1em" />
            Delete
          </button>
          <button v-if="canRequestJoin" class="button" type="button" @click="requestJoin">
            {{ joinButtonLabel }}
          </button>
        </div>
      </div>

      <p class="muted" style="margin-top:0.25rem">{{ details.group.description }}</p>

      <div v-if="details.group.meetingLink && (details.group.isMember || details.group.isLeader)" class="meeting-link-row">
        <span class="muted" style="font-size:0.88rem">Meeting link:</span>
        <a :href="details.group.meetingLink" target="_blank" rel="noopener noreferrer" class="meeting-link">
          {{ details.group.meetingLink }}
        </a>
      </div>

      <div v-if="statusBannerMessage" class="status-banner" :data-status="statusBannerTone">
        <strong>{{ statusBannerTitle }}</strong>
        <span>{{ statusBannerMessage }}</span>
      </div>
    </div>

    <!-- Active session notice for members -->
    <div v-if="activeSession && !details.group.isLeader && details.group.isMember" class="status-banner" data-status="active">
      <strong>A session is live right now</strong>
      <span>{{ activeSession.title }} is currently active. Open it to check in before it closes.</span>
      <div class="inline-actions" style="margin-top:0.5rem">
        <RouterLink class="button" :to="`/groups/${details.group.id}/sessions/${activeSession.id}`">
          Open &amp; Check In
        </RouterLink>
      </div>
    </div>

    <!-- Leader layout: form left, everything else right -->
    <div v-if="details.group.isLeader" class="grid grid-2" style="align-items:start">
      <!-- Left: schedule form -->
      <div class="card">
        <form class="form" @submit.prevent="createSession">
          <h2 class="section-title" style="margin:0">Schedule New Session</h2>
          <label>
            Title
            <input v-model="sessionForm.title" type="text" placeholder="e.g. Final Exam Review" required />
          </label>
          <div class="grid grid-2">
            <label>
              Date &amp; Time
              <input v-model="sessionForm.scheduledAt" type="datetime-local" required />
            </label>
            <label>
              Duration (min)
              <input v-model.number="sessionForm.durationMinutes" type="number" min="30" step="15" required />
            </label>
          </div>
          <label>
            Location / Link
            <input v-model="sessionForm.location" type="text" placeholder="Library 3F or Zoom link" />
          </label>
          <label>
            Notes
            <textarea v-model="sessionForm.notes" rows="2" placeholder="What should members prepare?" />
          </label>
          <button class="button secondary" type="submit">Create Session</button>
        </form>
      </div>

      <!-- Right: Members + Invite + Sessions + Pending -->
      <div class="stack-md">
        <div class="card">
          <div class="section-header__content" style="margin-bottom:0.75rem">
            <h2 class="section-title"><UserGroupIcon class="heading-icon--sm" /> Members</h2>
            <p class="muted tight">Current group members and their reliability.</p>
          </div>
          <div class="table-like">
            <div v-for="member in details.members" :key="member.id" class="table-row">
              <div class="table-row__content">
                <div><strong>{{ member.name }}</strong></div>
                <div class="muted" style="font-size:0.88rem">{{ formatRoleLabel(member.role) }}</div>
              </div>
              <div class="inline-actions">
                <ReliabilityBadge :score="member.reliability.score" />
                <span v-if="member.reliability.noShowCount > 0" class="pill" style="font-size:0.85rem;color:var(--danger)">
                  {{ member.reliability.noShowCount }} no-show{{ member.reliability.noShowCount !== 1 ? 's' : '' }}
                </span>
                <button
                  v-if="member.id !== auth.user?.id"
                  class="button link"
                  style="font-size:0.88rem"
                  type="button"
                  @click="removeMember(member.id)"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section-header">
            <div class="section-header__content">
              <h2 class="section-title">Find &amp; Invite Students</h2>
              <p class="muted tight">Students matched by course, availability, and reliability.</p>
            </div>
            <button class="button secondary" type="button" @click="loadMatches" :disabled="matchesLoading">
              {{ matchesLoading ? 'Loading...' : matchesLoaded ? 'Refresh' : 'Find Matches' }}
            </button>
          </div>
          <div v-if="matchesLoaded" class="table-like">
            <div v-for="match in studentMatches" :key="match.id" class="table-row">
              <div class="table-row__content">
                <div>
                  <strong>{{ match.name }}</strong>
                  <span v-if="match.isLookingForGroup" class="pill" style="margin-left:0.5rem;font-size:0.8rem;background:rgba(33,95,82,0.1);color:var(--primary-dark)">Looking</span>
                </div>
                <div class="muted" style="font-size:0.88rem">{{ match.major || 'No major listed' }}</div>
                <div class="chip-row" style="margin-top:0.3rem">
                  <span v-for="reason in match.matchReasons" :key="reason" class="pill" style="font-size:0.8rem">{{ reason }}</span>
                </div>
              </div>
              <div class="inline-actions">
                <ReliabilityBadge :score="match.reliability.score" />
                <button
                  class="button secondary"
                  style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem"
                  type="button"
                  :disabled="sentInvites.has(match.id)"
                  @click="inviteStudent(match.id)"
                >
                  {{ sentInvites.has(match.id) ? 'Invited' : 'Invite' }}
                </button>
              </div>
            </div>
            <p v-if="!studentMatches.length" class="empty-state">No additional students to invite right now.</p>
          </div>
        </div>

        <div class="card">
          <div class="section-header__content" style="margin-bottom:0.75rem">
            <h2 class="section-title"><CalendarDaysIcon class="heading-icon--sm" /> Sessions</h2>
            <p class="muted tight">Past and upcoming meetings for this group.</p>
          </div>
          <div class="table-like">
            <div v-for="session in details.sessions" :key="session.id" class="table-row">
              <div class="table-row__content">
                <div><strong>{{ session.title }}</strong></div>
                <div class="muted" style="font-size:0.9rem">{{ formatDate(session.scheduled_at) }}</div>
              </div>
              <div class="inline-actions">
                <span class="status-tag" :data-status="session.status">{{ sessionStatusLabel(session.status) }}</span>
                <button
                  v-if="session.status === 'scheduled' || session.status === 'missed'"
                  class="button secondary"
                  style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem"
                  type="button"
                  @click="startSession(session.id)"
                >
                  Start
                </button>
                <button
                  v-if="session.status === 'active'"
                  class="button"
                  style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem"
                  type="button"
                  @click="completeSession(session.id)"
                >
                  Complete
                </button>
                <button
                  v-if="['scheduled', 'active', 'missed'].includes(session.status)"
                  class="button link"
                  type="button"
                  @click="cancelSession(session.id)"
                >
                  Cancel
                </button>
                <RouterLink
                  class="button secondary"
                  style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem"
                  :to="`/groups/${details.group.id}/sessions/${session.id}`"
                >
                  Open
                </RouterLink>
              </div>
            </div>
            <p v-if="!details.sessions.length" class="empty-state">No sessions scheduled yet.</p>
          </div>
        </div>

        <div class="card" v-if="details.pendingRequests.length">
          <div class="section-header__content" style="margin-bottom:0.75rem">
            <h2 class="section-title">Pending Join Requests</h2>
            <p class="muted tight">{{ details.pendingRequests.length }} request{{ details.pendingRequests.length !== 1 ? 's' : '' }} waiting for a decision.</p>
          </div>
          <div class="table-like">
            <div v-for="request in details.pendingRequests" :key="request.id" class="table-row request-row" data-status="pending">
              <div class="table-row__content">
                <div><strong>{{ request.name }}</strong></div>
                <div class="muted" style="font-size:0.88rem">{{ request.email }}</div>
              </div>
              <span class="status-tag" data-status="pending">Pending</span>
              <div class="inline-actions">
                <button class="button secondary" type="button" @click="approveRequest(request.id)">Approve</button>
                <button class="button link" type="button" @click="rejectRequest(request.id)">Decline</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Member/visitor layout: sessions left, members right -->
    <div v-else class="grid grid-2" style="align-items:start">
      <!-- Left: Sessions -->
      <div class="card">
        <div class="section-header__content" style="margin-bottom:0.75rem">
          <h2 class="section-title">Sessions</h2>
          <p class="muted tight">Past and upcoming meetings for this group.</p>
        </div>
        <div class="table-like">
          <div v-for="session in details.sessions" :key="session.id" class="table-row">
            <div class="table-row__content">
              <div><strong>{{ session.title }}</strong></div>
              <div class="muted" style="font-size:0.9rem">{{ formatDate(session.scheduled_at) }}</div>
            </div>
            <div class="inline-actions">
              <span class="status-tag" :data-status="session.status">{{ sessionStatusLabel(session.status) }}</span>
              <RouterLink
                class="button secondary"
                style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem"
                :to="`/groups/${details.group.id}/sessions/${session.id}`"
              >
                Open
              </RouterLink>
            </div>
          </div>
          <p v-if="!details.sessions.length" class="empty-state">No sessions scheduled yet.</p>
        </div>
      </div>

      <!-- Right: Members -->
      <div class="card">
        <div class="section-header__content" style="margin-bottom:0.75rem">
          <h2 class="section-title">Members</h2>
          <p class="muted tight">Current group members and their reliability.</p>
        </div>
        <div class="table-like">
          <div v-for="member in details.members" :key="member.id" class="table-row">
            <div class="table-row__content">
              <div><strong>{{ member.name }}</strong></div>
              <div class="muted" style="font-size:0.88rem">{{ formatRoleLabel(member.role) }}</div>
            </div>
            <div class="inline-actions">
              <ReliabilityBadge :score="member.reliability.score" />
              <span v-if="member.reliability.noShowCount > 0" class="pill" style="font-size:0.85rem;color:var(--danger)">
                {{ member.reliability.noShowCount }} no-show{{ member.reliability.noShowCount !== 1 ? 's' : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback -->
    <p v-if="message" class="feedback-banner feedback-banner--success">{{ message }}</p>
    <p v-if="errorMessage" class="feedback-banner feedback-banner--error error-text">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { CalendarDaysIcon, PencilSquareIcon, TrashIcon, UserGroupIcon } from '@heroicons/vue/24/outline';
import ReliabilityBadge from '../components/ReliabilityBadge.vue';
import { useAuthStore } from '../stores/auth';
import { groupsApi, sessionsApi } from '../services/api';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const details = ref(null);
const message = ref('');
const errorMessage = ref('');
const studentMatches = ref([]);
const matchesLoading = ref(false);
const matchesLoaded = ref(false);
const sentInvites = ref(new Set());

const sessionForm = reactive({
  title: '',
  scheduledAt: '',
  durationMinutes: 90,
  location: '',
  notes: ''
});

const activeSession = computed(() => {
  if (!details.value) return null;
  return details.value.sessions.find((s) => s.status === 'active') ?? null;
});

const canRequestJoin = computed(() => {
  if (!auth.isAuthenticated || !details.value) return false;
  return (
    !details.value.group.isLeader &&
    !details.value.group.isMember &&
    details.value.group.joinRequestStatus !== 'pending'
  );
});

const joinButtonLabel = computed(() => {
  if (!details.value) return 'Request to Join';
  if (details.value.group.joinRequestStatus === 'rejected') return 'Request Again';
  return 'Request to Join';
});

const membershipLabel = computed(() => {
  if (!details.value) return '';
  if (details.value.group.isLeader) return 'Leader';
  if (details.value.group.isMember) return 'Member';
  if (details.value.group.joinRequestStatus === 'pending') return 'Pending approval';
  if (details.value.group.joinRequestStatus === 'rejected') return 'Request declined';
  if (details.value.group.joinRequestStatus === 'approved') return 'Approved';
  return 'Not a member';
});

const membershipStatusTone = computed(() => {
  if (!details.value) return 'neutral';
  if (details.value.group.isLeader) return 'leader';
  if (details.value.group.isMember) return 'member';
  if (details.value.group.joinRequestStatus === 'pending') return 'pending';
  if (details.value.group.joinRequestStatus === 'rejected') return 'rejected';
  if (details.value.group.joinRequestStatus === 'approved') return 'approved';
  return 'neutral';
});

const statusBannerTitle = computed(() => {
  if (!details.value) return '';
  if (details.value.group.isLeader) return 'You lead this group';
  if (details.value.group.isMember) return 'You are a member';
  if (details.value.group.joinRequestStatus === 'pending') return 'Join request pending';
  if (details.value.group.joinRequestStatus === 'rejected') return 'Request was declined';
  if (details.value.group.joinRequestStatus === 'approved') return 'Request approved';
  return '';
});

const statusBannerMessage = computed(() => {
  if (!details.value) return '';
  if (details.value.group.isLeader) return 'Use the controls below to manage sessions, review requests, and invite students.';
  if (details.value.group.isMember) return 'Watch this page for active sessions — check in while they are live to record your attendance.';
  if (details.value.group.joinRequestStatus === 'pending') return 'The leader still needs to review your request.';
  if (details.value.group.joinRequestStatus === 'rejected') return 'You can request again if your schedule has changed.';
  if (details.value.group.joinRequestStatus === 'approved') return 'You have been accepted. Check the sessions below for the next meeting.';
  return '';
});

const statusBannerTone = computed(() => {
  if (!details.value) return 'neutral';
  if (details.value.group.isLeader) return 'leader';
  if (details.value.group.isMember) return 'member';
  if (details.value.group.joinRequestStatus === 'pending') return 'pending';
  if (details.value.group.joinRequestStatus === 'rejected') return 'rejected';
  if (details.value.group.joinRequestStatus === 'approved') return 'approved';
  return 'neutral';
});

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
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

function formatRoleLabel(role) {
  return role === 'teacher' ? 'Teacher' : 'Student';
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

async function loadDetails() {
  const response = await groupsApi.get(route.params.id);
  details.value = response.data;
}

onMounted(async () => {
  try {
    await loadDetails();
  } catch (error) {
    showError(error.message);
  }
});

async function requestJoin() {
  try {
    await groupsApi.requestJoin(route.params.id);
    showMessage('Join request submitted.');
    await loadDetails();
  } catch (error) {
    showError(error.message);
  }
}

async function approveRequest(requestId) {
  try {
    await groupsApi.approveRequest(route.params.id, requestId);
    showMessage('Request approved.');
    await loadDetails();
  } catch (error) {
    showError(error.message);
  }
}

async function rejectRequest(requestId) {
  try {
    await groupsApi.rejectRequest(route.params.id, requestId);
    await loadDetails();
  } catch (error) {
    showError(error.message);
  }
}

async function removeMember(memberId) {
  if (!window.confirm('Remove this member from the group?')) return;
  try {
    await groupsApi.removeMember(route.params.id, memberId);
    await loadDetails();
  } catch (error) {
    showError(error.message);
  }
}

async function createSession() {
  try {
    await sessionsApi.create(route.params.id, sessionForm);
    showMessage('Session created.');
    Object.assign(sessionForm, { title: '', scheduledAt: '', durationMinutes: 90, location: '', notes: '' });
    await loadDetails();
  } catch (error) {
    showError(error.message);
  }
}

async function startSession(sessionId) {
  try {
    await sessionsApi.start(sessionId);
    showMessage('Session is now live.');
    await loadDetails();
  } catch (error) {
    showError(error.message);
  }
}

async function completeSession(sessionId) {
  if (!window.confirm('Complete this session? Members who did not check in will be marked absent.')) return;
  try {
    await sessionsApi.complete(sessionId);
    showMessage('Session completed. Attendance finalized.');
    await loadDetails();
  } catch (error) {
    showError(error.message);
  }
}

async function cancelSession(sessionId) {
  if (!window.confirm('Cancel this session?')) return;
  try {
    await sessionsApi.cancel(sessionId);
    showMessage('Session cancelled.');
    await loadDetails();
  } catch (error) {
    showError(error.message);
  }
}

async function loadMatches() {
  matchesLoading.value = true;
  try {
    const response = await groupsApi.getStudentMatches(route.params.id);
    studentMatches.value = response.data.matches;
    matchesLoaded.value = true;
  } catch (error) {
    showError(error.message);
  } finally {
    matchesLoading.value = false;
  }
}

async function inviteStudent(userId) {
  try {
    await groupsApi.sendInvitation(route.params.id, userId);
    sentInvites.value = new Set([...sentInvites.value, userId]);
    showMessage('Invitation sent.');
  } catch (error) {
    showError(error.message);
  }
}

async function deleteGroup() {
  if (!window.confirm('Delete this study group? This will remove all sessions, requests, and memberships.')) return;
  try {
    await groupsApi.delete(route.params.id);
    router.push('/groups');
  } catch (error) {
    showError(error.message);
  }
}
</script>
