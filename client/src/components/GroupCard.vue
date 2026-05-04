<template>
  <article class="card group-card" :class="{ 'group-card--member': group.isMember }">
    <div class="section-header">
      <div class="section-header__content">
        <p class="eyebrow">{{ group.courseCode }}</p>
        <h3 class="section-title">{{ group.title }}</h3>
        <p class="muted tight">
          {{ group.meetingFormat }} | {{ group.activeMemberCount ?? 0 }}/{{ group.capacity }} members
        </p>
        <div class="chip-row" v-if="groupStateLabel || fitLabel">
          <span
            v-if="groupStateLabel"
            class="pill pill--status"
            :data-status="groupStateTone"
          >
            {{ groupStateLabel }}
          </span>
          <span
            v-if="fitLabel && !group.isMember"
            class="pill pill--status"
            :data-status="fitTone"
          >
            {{ fitLabel }}
          </span>
        </div>
      </div>
      <ReliabilityBadge v-if="!group.isMember" :score="group.matchScore ?? null" />
    </div>

    <div v-if="fitSummary && !group.isMember" class="status-banner" :data-status="fitTone">
      <strong>{{ fitTitle }}</strong>
      <span>{{ fitSummary }}</span>
    </div>

    <p class="muted">{{ group.description }}</p>

    <div v-if="group.matchReasons?.length && !group.isMember" class="chip-row">
      <span v-for="reason in group.matchReasons" :key="reason" class="pill">{{ reason }}</span>
    </div>

    <div class="section-header">
      <div class="group-card__meta">
        <div class="pill">
          <MapPinIcon style="width:0.85em;height:0.85em;vertical-align:-0.1em;margin-right:0.25em;display:inline-block" />{{ group.location || group.meetingLink || 'Location shared after approval' }}
        </div>
      </div>
      <RouterLink class="button secondary" :to="`/groups/${group.id}`">View Group</RouterLink>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { MapPinIcon } from '@heroicons/vue/24/outline';
import ReliabilityBadge from './ReliabilityBadge.vue';

const props = defineProps({
  group: {
    type: Object,
    required: true
  }
});

const groupStateLabel = computed(() => {
  if (props.group.isMember) return 'You are a member';
  if (props.group.joinRequestStatus === 'pending') return 'Request pending';
  if (props.group.joinRequestStatus === 'approved') return 'Approved';
  if (props.group.joinRequestStatus === 'rejected') return 'Request declined';
  return '';
});

const groupStateTone = computed(() => {
  if (props.group.isMember) return 'member';
  if (props.group.joinRequestStatus === 'pending') return 'pending';
  if (props.group.joinRequestStatus === 'approved') return 'approved';
  if (props.group.joinRequestStatus === 'rejected') return 'rejected';
  return 'neutral';
});

const fitLabel = computed(() => {
  if (props.group.matchScore == null) return '';
  if (props.group.matchScore >= 70) return 'Strong fit';
  if (props.group.matchScore >= 40) return 'Good fit';
  if (props.group.matchScore > 0) return 'Possible fit';
  return 'New fit';
});

const fitTone = computed(() => {
  if (props.group.matchScore == null) return 'neutral';
  if (props.group.matchScore >= 70) return 'approved';
  if (props.group.matchScore >= 40) return 'member';
  if (props.group.matchScore > 0) return 'pending';
  return 'neutral';
});

const fitTitle = computed(() => {
  if (!fitLabel.value) return '';
  return fitLabel.value;
});

const fitSummary = computed(() => {
  if (props.group.matchScore == null) return '';
  if (props.group.matchReasons?.length) {
    return props.group.matchReasons.join(' • ');
  }
  return 'Open the group to review details and decide whether it matches your goals.';
});

const fillPercent = computed(() => {
  const capacity = Number(props.group.capacity || 0);
  const active = Number(props.group.activeMemberCount || 0);
  if (!capacity) return 0;
  return Math.max(0, Math.min(100, Math.round((active / capacity) * 100)));
});
</script>
