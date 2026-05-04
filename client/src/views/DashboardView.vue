<template>
  <section class="stack-lg">
    <div class="card" v-if="dashboard">
      <div class="page-header">
        <div class="page-header__content">
          <p class="eyebrow">Overview</p>
          <h1 class="page-title">Dashboard</h1>
          <p class="muted tight">
            Welcome back, <strong>{{ dashboard.user.name }}</strong>. Your reliability is
            <strong>{{ dashboard.reliability.label }}</strong>.
          </p>
        </div>
      </div>

      <div v-if="showOnboarding" class="status-banner" :data-status="onboardingTone">
        <strong><CheckIcon v-if="onboardingProgress >= 100" style="width:1em;height:1em;vertical-align:-0.15em;margin-right:0.2em" />{{ onboardingLabel }}</strong>
        <span>{{ onboardingMessage }}</span>
        <div class="progress-track" aria-hidden="true" style="margin-top:0.5rem">
          <span :style="{ width: `${onboardingProgress}%` }" />
        </div>
        <div class="inline-actions" style="margin-top:0.5rem">
          <button class="button secondary" type="button" @click="scrollToNextSteps">See Next Steps</button>
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric-card metric-card--soft">
          <strong>{{ ledGroups.length }}</strong>
          <span>Groups led</span>
        </div>
        <div class="metric-card metric-card--soft">
          <strong>{{ dashboard.profile.courses.length || 0 }}</strong>
          <span>Courses added</span>
        </div>
        <div class="metric-card metric-card--soft">
          <strong>{{ dashboard.availability.length || 0 }}</strong>
          <span>Availability blocks</span>
        </div>
        <div class="metric-card metric-card--soft">
          <strong>{{ myGroups.length }}</strong>
          <span>Groups joined</span>
        </div>
      </div>
    </div>

    <!-- Pending invitations -->
    <div class="card" v-if="pendingInvitations.length">
      <div class="section-header">
        <div class="section-header__content">
          <h2 class="section-title">Invitations</h2>
          <p class="muted tight">
            {{ pendingInvitations.length }} pending invitation{{ pendingInvitations.length !== 1 ? 's' : '' }} from group leaders.
          </p>
        </div>
      </div>
      <div class="table-like">
        <div v-for="invite in pendingInvitations" :key="invite.id" class="table-row">
          <div class="table-row__content">
            <div>
              <strong>{{ invite.group_title }}</strong>
              <span class="muted"> &middot; {{ invite.course_code }}</span>
            </div>
            <div class="muted" style="font-size:0.88rem">
              Invited by {{ invite.inviter_name }} &middot; {{ invite.meeting_format }}
            </div>
          </div>
          <div class="inline-actions">
            <span class="status-tag" data-status="pending">Pending</span>
            <button class="button" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" type="button" @click="respondInvite(invite.id, true)">Accept</button>
            <button class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" type="button" @click="respondInvite(invite.id, false)">Decline</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Live session alert -->
    <div v-if="liveSessions.length" class="status-banner" data-status="active">
      <strong><span style="display:inline-block;width:0.55em;height:0.55em;border-radius:50%;background:#ef4444;margin-right:0.4em;vertical-align:0.05em;animation:liveDot 1.4s ease-in-out infinite"></span>{{ liveSessions.length === 1 ? 'A session is live right now' : `${liveSessions.length} sessions are live right now` }}</strong>
      <span>{{ liveSessions[0].group_title }} — {{ liveSessions[0].title }}</span>
      <div class="inline-actions" style="margin-top:0.5rem">
        <RouterLink class="button" :to="`/groups/${liveSessions[0].group_id}/sessions/${liveSessions[0].id}`">Check In Now</RouterLink>
      </div>
    </div>

    <!-- Upcoming sessions -->
    <div class="card" v-if="dashboard && scheduledSessions.length">
      <div class="section-header__content">
        <h2 class="section-title"><CalendarDaysIcon class="heading-icon heading-icon--sm" /> Upcoming Sessions</h2>
        <p class="muted tight">Sessions scheduled across your groups.</p>
      </div>
      <div class="table-like">
        <div v-for="session in scheduledSessions" :key="session.id" class="table-row table-row--clickable"
          @click="router.push(`/groups/${session.group_id}/sessions/${session.id}`)"
          role="link" tabindex="0"
          @keydown.enter="router.push(`/groups/${session.group_id}/sessions/${session.id}`)">
          <div class="table-row__content">
            <strong>{{ session.title }}</strong>
            <span class="muted" style="font-size:0.88rem">{{ session.group_title }} &middot; {{ formatSessionDate(session.scheduled_at) }}</span>
          </div>
          <div class="inline-actions">
            <span class="muted" style="font-size:0.85rem">{{ session.duration_minutes }} min</span>
            <RouterLink class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" :to="`/groups/${session.group_id}/sessions/${session.id}`">View</RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Layout with suggestions: two-column -->
    <div class="grid grid-2" style="align-items: start" v-if="dashboard && suggestedGroups.length">
      <!-- Suggested groups -->
      <div class="card">
        <div class="section-header">
          <div class="section-header__content">
            <h2 class="section-title">Suggested Groups</h2>
            <p class="muted tight">Matched to your courses, schedule, and reliability.</p>
          </div>
          <RouterLink class="button secondary" to="/groups">Browse All</RouterLink>
        </div>
        <div class="list">
          <GroupCard v-for="group in suggestedGroups" :key="group.id" :group="group" />
        </div>
      </div>

      <!-- Right column stack -->
      <div class="stack-md">
        <!-- Reliability snapshot -->
        <div class="card">
          <div class="section-header__content">
            <h2 class="section-title">Your Reliability</h2>
            <p class="muted tight">Based on completed session attendance and peer ratings.</p>
          </div>
          <ReliabilityBadge :score="dashboard.reliability.score" />
          <div class="metric-grid" style="margin-top:0.75rem">
            <div class="metric-card">
              <strong>{{ Math.round((dashboard.reliability.attendanceRate ?? 0) * 100) }}%</strong>
              <span>Attendance rate</span>
            </div>
            <div class="metric-card">
              <strong>{{ dashboard.reliability.peerRatingAverage != null ? Number(dashboard.reliability.peerRatingAverage).toFixed(1) : '—' }}</strong>
              <span>Avg peer rating</span>
            </div>
            <div class="metric-card">
              <strong>{{ dashboard.reliability.noShowCount }}</strong>
              <span>No-shows</span>
            </div>
            <div class="metric-card">
              <strong>{{ dashboard.reliability.ratingCount }}</strong>
              <span>Ratings received</span>
            </div>
          </div>
          <p class="muted tight" style="font-size:0.92rem">{{ reliabilitySummary }}</p>
        </div>

        <!-- Your groups -->
        <div class="card">
          <div class="section-header">
            <div class="section-header__content">
              <h2 class="section-title">Your Groups <UserGroupIcon class="heading-icon heading-icon--sm" /> <span class="group-count-badge">{{ myGroups.length }}</span></h2>
            </div>
            <RouterLink v-if="myGroups.length >= 3" class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" to="/my-groups">See All</RouterLink>
          </div>

          <template v-if="ledGroups.length">
            <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.25rem;color:#1d4ed8">▾ Led by You <span style="opacity:0.7">(Leader)</span> <span style="opacity:0.55">· {{ ledGroups.length }}</span></p>
            <div class="table-like">
              <div v-for="group in ledGroups.slice(0, 3)" :key="group.id" class="table-row table-row--clickable" @click="router.push(`/groups/${group.id}`)" role="link" tabindex="0" @keydown.enter="router.push(`/groups/${group.id}`)">
                <div class="table-row__content">
                  <strong>{{ group.title }}</strong>
                  <span class="muted" style="font-size:0.88rem">{{ group.course_code }} &middot; {{ group.meeting_format }} &middot; {{ group.active_member_count ?? 0 }}/{{ group.capacity }} members</span>
                  <span v-if="group.location" class="muted" style="font-size:0.83rem;display:flex;align-items:center;gap:0.2rem"><MapPinIcon style="width:0.85em;height:0.85em;flex-shrink:0" />{{ group.location }}</span>
                </div>
                <RouterLink class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" :to="`/groups/${group.id}`">Go</RouterLink>
              </div>
            </div>
          </template>

          <template v-if="joinedGroups.length">
            <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-top:0.75rem;margin-bottom:0.25rem;color:#15803d">▾ Joined <span style="opacity:0.7">(Member)</span> <span style="opacity:0.55">· {{ joinedGroups.length }}</span></p>
            <div class="table-like">
              <div v-for="group in joinedGroups.slice(0, 3)" :key="group.id" class="table-row table-row--clickable" @click="router.push(`/groups/${group.id}`)" role="link" tabindex="0" @keydown.enter="router.push(`/groups/${group.id}`)">
                <div class="table-row__content">
                  <strong>{{ group.title }}</strong>
                  <span class="muted" style="font-size:0.88rem">{{ group.course_code }} &middot; {{ group.meeting_format }} &middot; {{ group.active_member_count ?? 0 }}/{{ group.capacity }} members</span>
                  <span v-if="group.location" class="muted" style="font-size:0.83rem;display:flex;align-items:center;gap:0.2rem"><MapPinIcon style="width:0.85em;height:0.85em;flex-shrink:0" />{{ group.location }}</span>
                </div>
                <RouterLink class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" :to="`/groups/${group.id}`">Go</RouterLink>
              </div>
            </div>
          </template>

          <p v-if="!myGroups.length" class="empty-state">You have not joined any groups yet.</p>
        </div>

        <!-- Next steps -->
        <div v-if="showOnboarding" ref="nextStepsRef" class="card">
          <div class="section-header__content">
            <h2 class="section-title"><ClipboardDocumentListIcon class="heading-icon heading-icon--sm" /> Next Steps</h2>
            <p class="muted tight">A short path to get fully set up.</p>
          </div>
          <div class="step-list">
            <div v-for="step in nextSteps" :key="step.id" class="step-item">
              <span class="step-index">{{ step.index }}</span>
              <span class="status-tag" :data-status="step.status === 'completed' ? 'completed' : step.status === 'in_progress' ? 'active' : 'scheduled'">
                {{ step.status === 'completed' ? 'Done' : step.status === 'in_progress' ? 'In progress' : 'To do' }}<CheckIcon v-if="step.status === 'completed'" style="width:0.9em;height:0.9em;vertical-align:-0.1em;margin-left:0.2em" />
              </span>
              <div class="step-copy">
                <strong>{{ step.title }}</strong>
                <span>{{ step.description }}</span>
              </div>
              <RouterLink class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" :to="step.to">
                {{ step.actionLabel }}
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Layout without suggestions: compact grid -->
    <template v-if="dashboard && !suggestedGroups.length">
      <div class="card">
        <div class="section-header">
          <div class="section-header__content">
            <h2 class="section-title">Suggested Groups</h2>
            <p class="muted tight">Matched to your courses, schedule, and reliability.</p>
          </div>
          <RouterLink class="button secondary" to="/groups">Browse All</RouterLink>
        </div>
        <p class="empty-state">No suggested groups yet — add courses and availability in your profile to get matched.</p>
      </div>

      <div class="grid grid-2">
        <!-- Reliability snapshot -->
        <div class="card">
          <div class="section-header__content">
            <h2 class="section-title">Your Reliability</h2>
            <p class="muted tight">Based on completed session attendance and peer ratings.</p>
          </div>
          <ReliabilityBadge :score="dashboard.reliability.score" />
          <div class="metric-grid" style="margin-top:0.75rem">
            <div class="metric-card">
              <strong>{{ Math.round((dashboard.reliability.attendanceRate ?? 0) * 100) }}%</strong>
              <span>Attendance rate</span>
            </div>
            <div class="metric-card">
              <strong>{{ dashboard.reliability.peerRatingAverage != null ? Number(dashboard.reliability.peerRatingAverage).toFixed(1) : '—' }}</strong>
              <span>Avg peer rating</span>
            </div>
            <div class="metric-card">
              <strong>{{ dashboard.reliability.noShowCount }}</strong>
              <span>No-shows</span>
            </div>
            <div class="metric-card">
              <strong>{{ dashboard.reliability.ratingCount }}</strong>
              <span>Ratings received</span>
            </div>
          </div>
          <p class="muted tight" style="font-size:0.92rem">{{ reliabilitySummary }}</p>
        </div>

        <!-- Your groups -->
        <div class="card">
          <div class="section-header">
            <div class="section-header__content">
              <h2 class="section-title">Your Groups <UserGroupIcon class="heading-icon heading-icon--sm" /> <span class="group-count-badge">{{ myGroups.length }}</span></h2>
            </div>
            <RouterLink v-if="myGroups.length >= 3" class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" to="/my-groups">See All</RouterLink>
          </div>

          <template v-if="ledGroups.length">
            <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.25rem;color:#1d4ed8">▾ Led by You <span style="opacity:0.7">(Leader)</span> <span style="opacity:0.55">· {{ ledGroups.length }}</span></p>
            <div class="table-like">
              <div v-for="group in ledGroups.slice(0, 3)" :key="group.id" class="table-row table-row--clickable" @click="router.push(`/groups/${group.id}`)" role="link" tabindex="0" @keydown.enter="router.push(`/groups/${group.id}`)">
                <div class="table-row__content">
                  <strong>{{ group.title }}</strong>
                  <span class="muted" style="font-size:0.88rem">{{ group.course_code }} &middot; {{ group.meeting_format }} &middot; {{ group.active_member_count ?? 0 }}/{{ group.capacity }} members</span>
                  <span v-if="group.location" class="muted" style="font-size:0.83rem;display:flex;align-items:center;gap:0.2rem"><MapPinIcon style="width:0.85em;height:0.85em;flex-shrink:0" />{{ group.location }}</span>
                </div>
                <RouterLink class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" :to="`/groups/${group.id}`">Go</RouterLink>
              </div>
            </div>
          </template>

          <template v-if="joinedGroups.length">
            <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-top:0.75rem;margin-bottom:0.25rem;color:#15803d">▾ Joined <span style="opacity:0.7">(Member)</span> <span style="opacity:0.55">· {{ joinedGroups.length }}</span></p>
            <div class="table-like">
              <div v-for="group in joinedGroups.slice(0, 3)" :key="group.id" class="table-row table-row--clickable" @click="router.push(`/groups/${group.id}`)" role="link" tabindex="0" @keydown.enter="router.push(`/groups/${group.id}`)">
                <div class="table-row__content">
                  <strong>{{ group.title }}</strong>
                  <span class="muted" style="font-size:0.88rem">{{ group.course_code }} &middot; {{ group.meeting_format }} &middot; {{ group.active_member_count ?? 0 }}/{{ group.capacity }} members</span>
                  <span v-if="group.location" class="muted" style="font-size:0.83rem;display:flex;align-items:center;gap:0.2rem"><MapPinIcon style="width:0.85em;height:0.85em;flex-shrink:0" />{{ group.location }}</span>
                </div>
                <RouterLink class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" :to="`/groups/${group.id}`">Go</RouterLink>
              </div>
            </div>
          </template>

          <p v-if="!myGroups.length" class="empty-state">You have not joined any groups yet.</p>
        </div>
      </div>

      <!-- Next steps full width -->
      <div ref="nextStepsRef" class="card">
        <div class="section-header__content">
          <h2 class="section-title"><ClipboardDocumentListIcon class="heading-icon heading-icon--sm" /> Next Steps</h2>
          <p class="muted tight">A short path to get fully set up.</p>
        </div>
        <div class="step-list">
          <div v-for="step in nextSteps" :key="step.id" class="step-item">
            <span class="step-index">{{ step.index }}</span>
            <span class="status-tag" :data-status="step.status === 'completed' ? 'completed' : step.status === 'in_progress' ? 'active' : 'scheduled'">
              {{ step.status === 'completed' ? 'Done' : step.status === 'in_progress' ? 'In progress' : 'To do' }}<CheckIcon v-if="step.status === 'completed'" style="width:0.9em;height:0.9em;vertical-align:-0.1em;margin-left:0.2em" />
            </span>
            <div class="step-copy">
              <strong>{{ step.title }}</strong>
              <span>{{ step.description }}</span>
            </div>
            <RouterLink class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" :to="step.to">
              {{ step.actionLabel }}
            </RouterLink>
          </div>
        </div>
      </div>
    </template>

    <p v-if="inviteMessage" class="feedback-banner feedback-banner--success">{{ inviteMessage }}</p>
    <p v-if="errorMessage" class="feedback-banner feedback-banner--error error-text">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { CalendarDaysIcon, CheckIcon, ClipboardDocumentListIcon, MapPinIcon, UserGroupIcon } from '@heroicons/vue/24/outline';
import GroupCard from '../components/GroupCard.vue';
import ReliabilityBadge from '../components/ReliabilityBadge.vue';
import { groupsApi, invitationsApi, sessionsApi, usersApi } from '../services/api';

const router = useRouter();

const dashboard = ref(null);
const suggestedGroups = ref([]);
const myGroups = ref([]);
const upcomingSessions = ref([]);
const pendingInvitations = ref([]);
const errorMessage = ref('');
const inviteMessage = ref('');
const nextStepsRef = ref(null);
const showOnboarding = ref(true);

const profileSignals = computed(() => {
  if (!dashboard.value) return [];
  return [
    Boolean(dashboard.value.profile.major),
    Boolean(dashboard.value.profile.studyStyle),
    Boolean(dashboard.value.profile.bio),
    dashboard.value.profile.courses.length > 0,
    dashboard.value.availability.length > 0
  ];
});

const profileStepProgress = computed(() => {
  if (!profileSignals.value.length) return 0;
  return profileSignals.value.filter(Boolean).length / profileSignals.value.length;
});

const ledGroups = computed(() => myGroups.value.filter(g => g.isLeader));
const joinedGroups = computed(() => myGroups.value.filter(g => !g.isLeader));

const hasCompletedProfile = computed(() => profileStepProgress.value === 1);
const hasJoinedGroup = computed(() => myGroups.value.length > 0);
const hasBuiltReliability = computed(() => {
  if (!dashboard.value) return false;
  return (
    dashboard.value.reliability.score !== null ||
    dashboard.value.reliability.ratingCount > 0 ||
    dashboard.value.reliability.noShowCount > 0
  );
});

const nextSteps = computed(() => [
  {
    id: 'profile',
    index: 1,
    title: 'Complete your profile and availability',
    description: 'Your major, courses, and schedule improve group suggestions.',
    to: '/profile',
    actionLabel: hasCompletedProfile.value ? 'Review' : 'Go',
    complete: hasCompletedProfile.value,
    status: hasCompletedProfile.value ? 'completed' : profileStepProgress.value > 0 ? 'in_progress' : 'pending'
  },
  {
    id: 'group',
    index: 2,
    title: 'Join or create a study group',
    description: 'Pick a group that matches your course, schedule, and study style.',
    to: '/groups',
    actionLabel: hasJoinedGroup.value ? 'View' : 'Go',
    complete: hasJoinedGroup.value,
    status: hasJoinedGroup.value ? 'completed' : 'pending'
  },
  {
    id: 'reliability',
    index: 3,
    title: 'Attend sessions and build reliability',
    description: 'Check in to active sessions and earn peer ratings.',
    to: hasJoinedGroup.value ? '/my-groups' : '/groups',
    actionLabel: hasBuiltReliability.value ? 'View' : 'Go',
    complete: hasBuiltReliability.value,
    status: hasBuiltReliability.value ? 'completed' : 'pending'
  }
]);

const onboardingProgress = computed(() => {
  const weighted = (
    profileStepProgress.value +
    (hasJoinedGroup.value ? 1 : 0) +
    (hasBuiltReliability.value ? 1 : 0)
  ) / 3;
  return Math.round(weighted * 100);
});

const onboardingLabel = computed(() => {
  if (onboardingProgress.value >= 100) return 'Setup complete';
  if (onboardingProgress.value >= 67) return 'Almost there';
  return 'A few steps left';
});

const onboardingMessage = computed(() => {
  const nextStep = nextSteps.value.find((s) => !s.complete);
  if (!nextStep) return 'Your profile, groups, and reliability are all set.';
  return `Next up: ${nextStep.title}.`;
});

const onboardingTone = computed(() => {
  if (onboardingProgress.value >= 100) return 'approved';
  if (onboardingProgress.value >= 67) return 'member';
  return 'pending';
});

const reliabilitySummary = computed(() => {
  if (!dashboard.value) return '';
  if (dashboard.value.reliability.score == null) {
    return 'No attendance history yet — new groups will see you as unproven until you complete a session.';
  }
  if (dashboard.value.reliability.noShowCount > 0) {
    return 'No-shows are the strongest negative signal. Keeping that number low matters most.';
  }
  if ((dashboard.value.reliability.attendanceRate ?? 0) >= 0.85) {
    return 'Your attendance history is a strong trust signal for other groups.';
  }
  return 'Attending sessions consistently and earning peer ratings will strengthen your score over time.';
});

const liveSessions = computed(() => upcomingSessions.value.filter(s => s.status === 'active'));
const scheduledSessions = computed(() => upcomingSessions.value.filter(s => s.status === 'scheduled').slice(0, 3));

function formatSessionDate(iso) {
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function scrollToNextSteps() {
  nextStepsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

onMounted(async () => {
  try {
    const [userResponse, groupsResponse, mineResponse, inviteResponse, sessionsResponse] = await Promise.all([
      usersApi.getMe(),
      groupsApi.list(),
      groupsApi.mine(),
      invitationsApi.getMyInvitations().catch(() => ({ data: { invitations: [] } })),
      sessionsApi.upcoming().catch(() => ({ data: { sessions: [] } }))
    ]);

    dashboard.value = userResponse.data;
    suggestedGroups.value = groupsResponse.data.groups.filter(g => !g.isMember).slice(0, 3);
    myGroups.value = mineResponse.data.groups;
    upcomingSessions.value = sessionsResponse.data.sessions;
    pendingInvitations.value = inviteResponse.data.invitations;

    // Hide onboarding banner + next steps after user has seen completion 3 times
    const userId = userResponse.data.user.id;
    const seenKey = `onboarding_seen_${userId}`;
    const hiddenKey = `onboarding_hidden_${userId}`;
    if (localStorage.getItem(hiddenKey)) {
      showOnboarding.value = false;
    } else if (onboardingProgress.value >= 100) {
      const seen = Number(localStorage.getItem(seenKey) || 0) + 1;
      localStorage.setItem(seenKey, seen);
      if (seen > 3) {
        localStorage.setItem(hiddenKey, '1');
        showOnboarding.value = false;
      }
    }
  } catch (error) {
    errorMessage.value = error.message;
  }
});

async function respondInvite(invitationId, accept) {
  try {
    const response = await invitationsApi.respond(invitationId, accept);
    inviteMessage.value = response.message;
    pendingInvitations.value = pendingInvitations.value.filter((i) => i.id !== invitationId);
    if (accept) {
      const mineResponse = await groupsApi.mine();
      myGroups.value = mineResponse.data.groups;
    }
    setTimeout(() => { inviteMessage.value = ''; }, 3500);
  } catch (error) {
    errorMessage.value = error.message;
  }
}
</script>
