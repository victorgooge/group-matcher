<template>
  <section class="grid" style="gap: 1.5rem;">
    <section class="hero">
      <div>
        <p class="pill">Reliable teammates beat random invites</p>
        <h1>Find study groups that fit your course, schedule, and follow-through.</h1>
        <p class="muted">
          Study Group Matcher helps students join course-based groups, track attendance,
          and build a visible reliability score that makes future matching more dependable.
        </p>
      </div>

      <div class="hero-actions">
        <RouterLink class="button" to="/register">Create Account</RouterLink>
        <RouterLink class="button secondary" to="/groups">Browse Groups</RouterLink>
        <RouterLink class="button secondary" to="/login">Use Demo Accounts</RouterLink>
      </div>
    </section>

    <section class="grid grid-2">
      <article class="card">
        <h2 class="section-title">Core Demo Flow</h2>
        <div class="table-like">
          <div class="table-row"><span>1. Leader view</span><strong>Create a group and schedule a session</strong></div>
          <div class="table-row"><span>2. Student view</span><strong>Request to join and browse suggested groups</strong></div>
          <div class="table-row"><span>3. After a session</span><strong>Mark attendance and submit reliability ratings</strong></div>
        </div>
      </article>

      <article class="card">
        <h2 class="section-title">Seeded Demo Accounts</h2>
        <div class="table-like">
          <div class="table-row"><span>Leader</span><strong>leader1@example.com</strong></div>
          <div class="table-row"><span>Student</span><strong>student1@example.com</strong></div>
          <div class="table-row"><span>Second Student</span><strong>student2@example.com</strong></div>
          <div class="table-row"><span>Password</span><strong>Password123!</strong></div>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>
