<template>
  <section class="stack-lg">
    <section class="hero">
      <div class="hero-copy">
        <p class="pill">Reliable teammates beat random invites</p>
        <h1>Find study groups that fit your course, schedule, and follow-through.</h1>
        <p class="muted">
          StudySync helps students join course-based groups, track attendance,
          and build a visible reliability score that makes future matching more dependable.
        </p>
      </div>

      <div class="hero-actions">
        <RouterLink class="button" to="/register">Create Account</RouterLink>
        <RouterLink class="button secondary" to="/groups">Browse Groups</RouterLink>
      </div>
    </section>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>
