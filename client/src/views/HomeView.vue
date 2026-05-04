<template>
  <section class="stack-lg">
    <section class="hero">
      <div class="hero-body">
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
      </div>

      <div class="hero-image-wrap">
        <img
          class="hero-image"
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Students studying together"
        />
      </div>
    </section>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>
