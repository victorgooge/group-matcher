<template>
  <section class="card">
    <div class="page-header__content">
      <p class="eyebrow">Your Space</p>
      <h1 class="page-title">My Groups</h1>
      <p class="muted tight">Quick access to the groups you lead or belong to.</p>
    </div>

    <div class="table-like">
      <div v-for="group in groups" :key="group.id" class="table-row">
        <div class="table-row__content">
          <RouterLink :to="`/groups/${group.id}`"><strong>{{ group.title }}</strong></RouterLink>
          <div class="muted">{{ group.course_code }} | {{ group.meeting_format }}</div>
        </div>
        <span class="pill">{{ group.location || 'TBD' }}</span>
      </div>
      <p v-if="!groups.length" class="empty-state">You have not joined any groups yet.</p>
    </div>

    <p v-if="errorMessage" class="feedback-banner feedback-banner--error error-text">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { groupsApi } from '../services/api';

const groups = ref([]);
const errorMessage = ref('');

onMounted(async () => {
  try {
    const response = await groupsApi.mine();
    groups.value = response.data.groups;
  } catch (error) {
    errorMessage.value = error.message;
  }
});
</script>
