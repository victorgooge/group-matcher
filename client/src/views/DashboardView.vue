<template>
  <section class="grid" style="gap: 1.25rem;">
    <div class="card" v-if="dashboard">
      <h1 class="section-title">Dashboard</h1>
      <p class="muted">
        Profile completion is {{ profileCompletion }}%. You are currently labeled
        <strong>{{ dashboard.reliability.label }}</strong>.
      </p>
      <div class="chip-row" style="margin-top: 1rem;">
        <span class="pill">{{ dashboard.user.role }}</span>
        <span class="pill">{{ dashboard.profile.courses.length || 0 }} courses added</span>
        <span class="pill">{{ dashboard.availability.length || 0 }} availability blocks</span>
      </div>
    </div>

    <div class="grid grid-2" v-if="dashboard">
      <div class="card">
        <div style="display: flex; justify-content: space-between; gap: 1rem; align-items: center;">
          <h2 class="section-title">Suggested Groups</h2>
          <RouterLink class="button secondary" to="/groups">Browse All</RouterLink>
        </div>
        <div class="list">
          <GroupCard v-for="group in suggestedGroups" :key="group.id" :group="group" />
          <p v-if="!suggestedGroups.length" class="muted">No suggestions yet. Add courses and availability in your profile.</p>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Your Reliability Snapshot</h2>
        <ReliabilityBadge :score="dashboard.reliability.score" />
        <div class="table-like" style="margin-top: 1rem;">
          <div class="table-row"><span>Attendance Rate</span><strong>{{ Math.round(dashboard.reliability.attendanceRate * 100) }}%</strong></div>
          <div class="table-row"><span>Peer Rating Avg</span><strong>{{ dashboard.reliability.peerRatingAverage ?? 'Not enough ratings' }}</strong></div>
          <div class="table-row"><span>No-Shows</span><strong>{{ dashboard.reliability.noShowCount }}</strong></div>
          <div class="table-row"><span>Total Ratings</span><strong>{{ dashboard.reliability.ratingCount }}</strong></div>
        </div>
      </div>
    </div>

    <div class="grid grid-2" v-if="dashboard">
      <div class="card">
        <h2 class="section-title">Your Groups</h2>
        <div class="table-like">
          <div v-for="group in myGroups" :key="group.id" class="table-row">
            <RouterLink :to="`/groups/${group.id}`">{{ group.title }}</RouterLink>
            <span class="muted">{{ group.course_code }} - {{ group.meeting_format }}</span>
          </div>
          <p v-if="!myGroups.length" class="muted">You have not joined any groups yet.</p>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Next Steps</h2>
        <div class="table-like">
          <div class="table-row"><span>1.</span><strong>Complete your profile and availability</strong></div>
          <div class="table-row"><span>2.</span><strong>Join or create a study group</strong></div>
          <div class="table-row"><span>3.</span><strong>Attend sessions and build reliability</strong></div>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import GroupCard from '../components/GroupCard.vue';
import ReliabilityBadge from '../components/ReliabilityBadge.vue';
import { groupsApi, usersApi } from '../services/api';

const dashboard = ref(null);
const suggestedGroups = ref([]);
const myGroups = ref([]);
const errorMessage = ref('');

const profileCompletion = computed(() => {
  if (!dashboard.value) return 0;
  const checks = [
    dashboard.value.user.name,
    dashboard.value.profile.major,
    dashboard.value.profile.studyStyle,
    dashboard.value.profile.bio,
    dashboard.value.profile.courses.length > 0,
    dashboard.value.availability.length > 0
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
});

onMounted(async () => {
  try {
    const [userResponse, groupsResponse, mineResponse] = await Promise.all([
      usersApi.getMe(),
      groupsApi.list(),
      groupsApi.mine()
    ]);

    dashboard.value = userResponse.data;
    suggestedGroups.value = groupsResponse.data.groups.slice(0, 3);
    myGroups.value = mineResponse.data.groups;
  } catch (error) {
    errorMessage.value = error.message;
  }
});
</script>
