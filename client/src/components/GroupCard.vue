<template>
  <article class="card group-card">
    <div style="display: flex; justify-content: space-between; gap: 1rem; align-items: start; flex-wrap: wrap;">
      <div>
        <h3 style="margin: 0 0 0.35rem;">{{ group.title }}</h3>
        <p class="muted" style="margin: 0;">
          {{ group.courseCode }} - {{ group.meetingFormat }} - {{ group.activeMemberCount ?? 0 }}/{{ group.capacity }} members
        </p>
      </div>
      <ReliabilityBadge :score="group.matchScore ?? null" />
    </div>

    <p style="margin: 1rem 0;">{{ group.description }}</p>

    <div v-if="group.matchReasons?.length" class="chip-row" style="margin-bottom: 1rem;">
      <span v-for="reason in group.matchReasons" :key="reason" class="pill">{{ reason }}</span>
    </div>

    <div style="display: flex; justify-content: space-between; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <div class="pill">{{ group.location || group.meetingLink || 'Location shared after approval' }}</div>
      <RouterLink class="button secondary" :to="`/groups/${group.id}`">View Group</RouterLink>
    </div>
  </article>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import ReliabilityBadge from './ReliabilityBadge.vue';

defineProps({
  group: {
    type: Object,
    required: true
  }
});
</script>
