'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserProfile } from '@/lib/firebase/auth';
import type { UserProfile } from '@/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  refreshProfile: () => Promise<void>;
}

const mockDemoProfile: UserProfile = {
  uid: 'demo-user-123',
  email: 'learner@monetstudy.com',
  name: 'Alex Rivera',
  plan: 'scholar',
  subjectLimit: 10,
  theme: 'sepia',
  createdAt: Date.now() - 86400000 * 7,
  updatedAt: Date.now(),
  onboarded: true,
};

const mockDemoUser: any = {
  uid: 'demo-user-123',
  email: 'learner@monetstudy.com',
  displayName: 'Alex Rivera',
  emailVerified: true,
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  isDemo: false,
  enterDemoMode: () => {},
  exitDemoMode: () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const enterDemoMode = () => {
    setIsDemo(true);
    setUser(mockDemoUser);
    setProfile(mockDemoProfile);
    try { localStorage.setItem('monet_demo_mode', 'true'); } catch {}
  };

  const exitDemoMode = () => {
    setIsDemo(false);
    try { localStorage.removeItem('monet_demo_mode'); } catch {}
    if (auth.currentUser) {
      setUser(auth.currentUser);
      getUserProfile(auth.currentUser.uid).then(p => setProfile(p));
    } else {
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (isDemo) {
      setProfile(mockDemoProfile);
      return;
    }
    if (user) {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    try {
      const unsub = onAuthStateChanged(auth, async (u) => {
        if (u) {
          // Real authenticated user detected — clear demo mode
          try { localStorage.removeItem('monet_demo_mode'); } catch {}
          setIsDemo(false);
          setUser(u);
          let p = null;
          for (let i = 0; i < 5; i++) {
            p = await getUserProfile(u.uid);
            if (p) break;
            await new Promise(r => setTimeout(r, 400));
          }
          setProfile(p);
          setLoading(false);
        } else {
          // No active Firebase auth session
          let checkDemo = false;
          try { checkDemo = localStorage.getItem('monet_demo_mode') === 'true'; } catch {}

          if (checkDemo) {
            setIsDemo(true);
            setUser(mockDemoUser);
            setProfile(mockDemoProfile);
          } else {
            setIsDemo(false);
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      });
      return unsub;
    } catch {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isDemo, enterDemoMode, exitDemoMode, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

