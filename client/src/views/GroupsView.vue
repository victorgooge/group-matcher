<template>
  <section class="grid">
    <div class="card">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; align-items: center;">
        <div>
          <h1 class="section-title">Browse Study Groups</h1>
          <p class="muted">Sorts with course fit, schedule overlap, study style, and reliability bonus.</p>
        </div>
        <RouterLink v-if="auth.user?.role === 'leader' || auth.user?.role === 'admin'" class="button" to="/groups/new">Create Group</RouterLink>
      </div>

      <div class="grid grid-2" style="margin-top: 1rem;">
        <label>
          Search
          <input v-model="filters.search" type="text" placeholder="CSC 4370 or Data Structures" />
        </label>

        <label>
          Meeting Format
          <select v-model="filters.meetingFormat">
            <option value="">Any</option>
            <option value="In-Person">In-Person</option>
            <option value="Online">Online</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </label>
      </div>

      <div style="margin-top: 1rem;">
        <button class="button secondary" type="button" @click="loadGroups">Apply Filters</button>
      </div>
    </div>

    <div class="list">
      <GroupCard v-for="group in groups" :key="group.id" :group="group" />
      <p v-if="!groups.length && !loading" class="card muted">No groups matched those filters.</p>
    </div>

    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import GroupCard from '../components/GroupCard.vue';
import { useAuthStore } from '../stores/auth';
import { groupsApi } from '../services/api';

const auth = useAuthStore();
const loading = ref(false);
const groups = ref([]);
const errorMessage = ref('');

const filters = reactive({
  search: '',
  meetingFormat: ''
});

async function loadGroups() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await groupsApi.list(filters);
    groups.value = response.data.groups;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadGroups);
</script>
