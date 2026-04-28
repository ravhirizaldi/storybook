import { create } from 'zustand';
import type { AuthUser } from '../lib/api/types';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
};

const TOKEN_KEY = 'story_ai_token';
const USER_KEY = 'story_ai_user';

function loadUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.id || !parsed.username) return null;
    return {
      id: parsed.id,
      username: parsed.username,
      isAdmin: Boolean(parsed.isAdmin),
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: loadUser(),
  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
}));

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}
