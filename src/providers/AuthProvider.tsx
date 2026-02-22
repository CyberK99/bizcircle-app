import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@src/lib/supabase';
import type { Profile, Business } from '@src/types/database';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  business: Business | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  refreshProfile: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  business: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  refreshProfile: async () => {},
  refreshBusiness: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setProfile(null);
          setBusiness(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);

      // Load business
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*, industry:industries(*), county:counties(*)')
        .eq('owner_id', userId)
        .single();

      setBusiness(businessData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshProfile() {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) setProfile(data);
  }

  async function refreshBusiness() {
    if (!session?.user) return;
    const { data } = await supabase
      .from('businesses')
      .select('*, industry:industries(*), county:counties(*)')
      .eq('owner_id', session.user.id)
      .single();
    if (data) setBusiness(data);
  }

  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    profile,
    business,
    isLoading,
    isAuthenticated: !!session,
    hasCompletedOnboarding: !!business,
    refreshProfile,
    refreshBusiness,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
