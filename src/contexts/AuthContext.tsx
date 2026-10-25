import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { accountRequest, getAccessToken, setAccessToken } from '@/integrations/supabase/client';
import { disablePush } from '@/lib/push';

interface AuthContextType {
  configured: boolean; user: User | null; loading: boolean; recovering: boolean;
  signUp: (email: string, password: string, name: string, next?: string) => Promise<{error: Error | null}>;
  signIn: (email: string, password: string) => Promise<{error: Error | null}>;
  signOut: () => Promise<void>; finishRecovery: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const configured = import.meta.env.VITE_ENABLE_ACCOUNTS === 'true';
export function AuthProvider({ children }: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const refreshBusy = useRef(false);
  const sessionVersion = useRef(0);
  function accept(data: {access_token?: string; user?: User}) {
    setAccessToken(data.access_token || null); setUser(data.user || null);
  }
  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    let active = true;
    const refresh = async (initial = false) => {
      if (refreshBusy.current) return;
      refreshBusy.current = true;
      const version = sessionVersion.current;
      try {
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const token = initial ? fragment.get('refresh_token') : null;
        if (token) {
          setRecovering(fragment.get('type') === 'recovery');
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
        const data = await accountRequest(token ? 'exchange' : 'session', token ? {refresh_token: token} : {});
        if (active && version === sessionVersion.current) accept(data);
      } catch { /* Guest features remain available offline. */ }
      finally { refreshBusy.current = false; if (active) setLoading(false); }
    };
    refresh(true);
    const interval = window.setInterval(() => refresh(), 4 * 60 * 1000);
    const online = () => refresh(); window.addEventListener('online', online);
    return () => { active = false; clearInterval(interval); window.removeEventListener('online', online); };
  }, []);
  async function submit(action: string, data: Record<string, unknown>) {
    sessionVersion.current++;
    try { const response = await accountRequest(action, data); if (action === 'signin') accept(response); return {error: null}; }
    catch (error) { return {error: error instanceof Error ? error : new Error('auth_failed')}; }
  }
  async function signOut() {
    sessionVersion.current++;
    if (user) await disablePush(user.id).catch(() => {});
    await accountRequest('signout', {access_token: getAccessToken()});
    if (user) localStorage.removeItem(`alusathi-field-diary-v1-${user.id}`);
    accept({}); setRecovering(false);
  }
  return <AuthContext.Provider value={{configured, user, loading, recovering, finishRecovery: () => setRecovering(false),
    signIn: (email, password) => submit('signin', {email, password}),
    signUp: (email, password, name, next) => submit('signup', {email, password, name, next}), signOut}}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
