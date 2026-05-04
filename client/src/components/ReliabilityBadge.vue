<template>
  <span class="pill reliability-pill" :title="`Reliability score: ${label}`" :data-tier="tier">
    <component :is="icon" class="reliability-pill__icon" />
    <strong>{{ label }}</strong>
    <span class="muted">({{ normalizedScore }})</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';
import {
  CheckBadgeIcon,
  HandThumbUpIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon
} from '@heroicons/vue/24/outline';

const props = defineProps({
  score: {
    type: Number,
    default: null
  }
});

const normalizedScore = computed(() => (props.score ?? 'New'));

const label = computed(() => {
  if (props.score === null || Number.isNaN(props.score)) return 'New';
  if (props.score >= 90) return 'Highly Reliable';
  if (props.score >= 75) return 'Reliable';
  if (props.score >= 50) return 'Mixed';
  return 'Low Reliability';
});

const tier = computed(() => {
  if (props.score === null || Number.isNaN(props.score)) return 'new';
  if (props.score >= 90) return 'high';
  if (props.score >= 75) return 'good';
  if (props.score >= 50) return 'mixed';
  return 'low';
});

const icon = computed(() => {
  switch (tier.value) {
    case 'high': return CheckBadgeIcon;
    case 'good': return HandThumbUpIcon;
    case 'mixed': return ExclamationCircleIcon;
    case 'low': return ExclamationTriangleIcon;
    default: return SparklesIcon;
  }
});
</script>
