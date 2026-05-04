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

      <div class="status-banner" :data-status="onboardingTone">
        <strong>{{ onboardingLabel }}</strong>
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
          <strong>{{ formatRoleLabel(dashboard.user.role) }}</strong>
          <span>Account role</span>
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

    <div class="grid grid-2" v-if="dashboard">
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
          <p v-if="!suggestedGroups.length" class="empty-state">
            Add courses and availability in your profile to get suggestions.
          </p>
        </div>
      </div>

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
    </div>

    <div class="grid grid-2" v-if="dashboard">
      <!-- Your groups -->
      <div class="card">
        <div class="section-header__content">
          <h2 class="section-title">Your Groups</h2>
          <p class="muted tight">Groups you lead or belong to.</p>
        </div>
        <div class="table-like">
          <div v-for="group in myGroups" :key="group.id" class="table-row">
            <div class="table-row__content">
              <RouterLink :to="`/groups/${group.id}`">
                <strong>{{ group.title }}</strong>
              </RouterLink>
              <span class="muted" style="font-size:0.88rem">{{ group.course_code }} &middot; {{ group.meeting_format }}</span>
            </div>
          </div>
          <p v-if="!myGroups.length" class="empty-state">You have not joined any groups yet.</p>
        </div>
      </div>

      <!-- Next steps -->
      <div ref="nextStepsRef" class="card">
        <div class="section-header__content">
          <h2 class="section-title">Next Steps</h2>
          <p class="muted tight">A short path to get fully set up.</p>
        </div>
        <div class="step-list">
          <div v-for="step in nextSteps" :key="step.id" class="step-item">
            <span class="step-index">{{ step.index }}</span>
            <span class="status-tag" :data-status="step.status === 'completed' ? 'completed' : step.status === 'in_progress' ? 'active' : 'scheduled'">
              {{ step.status === 'completed' ? 'Done' : step.status === 'in_progress' ? 'In progress' : 'To do' }}
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

    <p v-if="inviteMessage" class="feedback-banner feedback-banner--success">{{ inviteMessage }}</p>
    <p v-if="errorMessage" class="feedback-banner feedback-banner--error error-text">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import GroupCard from '../components/GroupCard.vue';
import ReliabilityBadge from '../components/ReliabilityBadge.vue';
import { groupsApi, invitationsApi, usersApi } from '../services/api';

const dashboard = ref(null);
const suggestedGroups = ref([]);
const myGroups = ref([]);
const pendingInvitations = ref([]);
const errorMessage = ref('');
const inviteMessage = ref('');
const nextStepsRef = ref(null);

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

function formatRoleLabel(role) {
  if (!role) return 'Member';
  return String(role).charAt(0).toUpperCase() + String(role).slice(1);
}

function scrollToNextSteps() {
  nextStepsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

onMounted(async () => {
  try {
    const [userResponse, groupsResponse, mineResponse, inviteResponse] = await Promise.all([
      usersApi.getMe(),
      groupsApi.list(),
      groupsApi.mine(),
      invitationsApi.getMyInvitations().catch(() => ({ data: { invitations: [] } }))
    ]);

    dashboard.value = userResponse.data;
    suggestedGroups.value = groupsResponse.data.groups.slice(0, 3);
    myGroups.value = mineResponse.data.groups;
    pendingInvitations.value = inviteResponse.data.invitations;
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
