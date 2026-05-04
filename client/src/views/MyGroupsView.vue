<template>
  <section class="card">
    <div class="page-header__content">
      <p class="eyebrow">Your Space</p>
      <h1 class="page-title">My Groups <UserGroupIcon class="heading-icon" /> <span class="group-count-badge">{{ groups.length }}</span></h1>
      <p class="muted tight">Quick access to the groups you lead or belong to.</p>
    </div>

    <template v-if="ledGroups.length">
      <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-top:1.25rem;margin-bottom:0.25rem;color:#1d4ed8">▾ Led by You <span style="opacity:0.7">(Leader)</span> <span style="opacity:0.55">· {{ ledGroups.length }}</span></p>
      <div class="table-like">
        <div v-for="group in ledGroups" :key="group.id" class="table-row table-row--clickable" @click="router.push(`/groups/${group.id}`)" role="link" tabindex="0" @keydown.enter="router.push(`/groups/${group.id}`)" >
          <div class="table-row__content">
            <RouterLink :to="`/groups/${group.id}`"><strong>{{ group.title }}</strong></RouterLink>
            <div class="muted" style="font-size:0.88rem">{{ group.course_code }} &middot; {{ group.meeting_format }} &middot; {{ group.active_member_count ?? 0 }}/{{ group.capacity }} members</div>
            <div v-if="group.location" class="muted" style="font-size:0.83rem;margin-top:0.1rem;display:flex;align-items:center;gap:0.2rem"><MapPinIcon style="width:0.85em;height:0.85em;flex-shrink:0" />{{ group.location }}</div>
          </div>
          <RouterLink class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" :to="`/groups/${group.id}`">Go</RouterLink>
        </div>
      </div>
    </template>

    <template v-if="joinedGroups.length">
      <p style="font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-top:1.25rem;margin-bottom:0.25rem;color:#15803d">▾ Joined <span style="opacity:0.7">(Member)</span> <span style="opacity:0.55">· {{ joinedGroups.length }}</span></p>
      <div class="table-like">
        <div v-for="group in joinedGroups" :key="group.id" class="table-row table-row--clickable" @click="router.push(`/groups/${group.id}`)" role="link" tabindex="0" @keydown.enter="router.push(`/groups/${group.id}`)" >
          <div class="table-row__content">
            <RouterLink :to="`/groups/${group.id}`"><strong>{{ group.title }}</strong></RouterLink>
            <div class="muted" style="font-size:0.88rem">{{ group.course_code }} &middot; {{ group.meeting_format }} &middot; {{ group.active_member_count ?? 0 }}/{{ group.capacity }} members</div>
            <div v-if="group.location" class="muted" style="font-size:0.83rem;margin-top:0.1rem;display:flex;align-items:center;gap:0.2rem"><MapPinIcon style="width:0.85em;height:0.85em;flex-shrink:0" />{{ group.location }}</div>
          </div>
          <RouterLink class="button secondary" style="font-size:0.88rem;min-height:2.2rem;padding:0.5rem 0.85rem" :to="`/groups/${group.id}`">Go</RouterLink>
        </div>
      </div>
    </template>

    <p v-if="!groups.length" class="empty-state">You have not joined any groups yet.</p>
    <p v-if="errorMessage" class="feedback-banner feedback-banner--error error-text">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { UserGroupIcon, MapPinIcon } from '@heroicons/vue/24/outline';
import { groupsApi } from '../services/api';

const router = useRouter();

const groups = ref([]);
const errorMessage = ref('');

const ledGroups = computed(() => groups.value.filter(g => g.isLeader));
const joinedGroups = computed(() => groups.value.filter(g => !g.isLeader));

onMounted(async () => {
  try {
    const response = await groupsApi.mine();
    groups.value = response.data.groups;
  } catch (error) {
    errorMessage.value = error.message;
  }
});
</script>
