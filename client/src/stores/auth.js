import { defineStore } from 'pinia';
import { authApi } from '../services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || '',
    ready: false
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token)
  },
  actions: {
    setSession(payload) {
      this.user = payload.user;
      this.token = payload.token;
      localStorage.setItem('token', payload.token);
    },
    async hydrate() {
      if (!this.token) {
        this.ready = true;
        return;
      }

      try {
        const response = await authApi.me();
        this.user = response.data.user;
      } catch {
        this.clearSession();
      } finally {
        this.ready = true;
      }
    },
    async login(credentials) {
      const response = await authApi.login(credentials);
      this.setSession(response.data);
      this.ready = true;
      return response;
    },
    async register(payload) {
      const response = await authApi.register(payload);
      this.setSession(response.data);
      this.ready = true;
      return response;
    },
    async logout() {
      try {
        await authApi.logout();
      } finally {
        this.clearSession();
      }
    },
    clearSession() {
      this.user = null;
      this.token = '';
      localStorage.removeItem('token');
    }
  }
});
