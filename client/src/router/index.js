import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import DashboardView from '../views/DashboardView.vue';
import ProfileView from '../views/ProfileView.vue';
import GroupsView from '../views/GroupsView.vue';
import GroupDetailView from '../views/GroupDetailView.vue';
import CreateGroupView from '../views/CreateGroupView.vue';
import SessionDetailView from '../views/SessionDetailView.vue';
import MyGroupsView from '../views/MyGroupsView.vue';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/register', name: 'register', component: RegisterView },
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/groups', name: 'groups', component: GroupsView },
  { path: '/groups/new', name: 'group-create', component: CreateGroupView, meta: { requiresAuth: true } },
  { path: '/groups/:id/edit', name: 'group-edit', component: CreateGroupView, props: true, meta: { requiresAuth: true } },
  { path: '/groups/:id', name: 'group-detail', component: GroupDetailView, props: true },
  { path: '/groups/:id/sessions/:sessionId', name: 'session-detail', component: SessionDetailView, props: true, meta: { requiresAuth: true } },
  { path: '/my-groups', name: 'my-groups', component: MyGroupsView, meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.ready) {
    await auth.hydrate();
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }
  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
