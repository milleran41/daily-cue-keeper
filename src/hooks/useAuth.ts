import { createElement, createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { NotificationSound } from '@/types/task';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  notification_sound: NotificationSound;
}

type AuthState = {
  user: User | null;
  profile: Profile | null;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const useAuthInternal = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const profileLoadSeq = useRef(0);

  const loadProfile = async (userId: string, sessionUser: User | null, requestId: number) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const localSound = localStorage.getItem(`notification_sound_${userId}`) as NotificationSound;
      
      if (error) {
        console.error('Error selecting profile:', error);
        if (profileLoadSeq.current !== requestId) return;
        setProfile({
          id: userId,
          display_name: sessionUser?.user_metadata?.full_name || sessionUser?.email || null,
          avatar_url: sessionUser?.user_metadata?.avatar_url || null,
          notification_sound: localSound || 'bell'
        });
        return;
      }

      if (data) {
        if (profileLoadSeq.current !== requestId) return;
        setProfile({
          id: data.id,
          display_name: data.display_name,
          avatar_url: data.avatar_url,
          notification_sound: (data as any).notification_sound || localSound || 'bell'
        });
        
        // Sync to local storage if DB has it
        if ((data as any).notification_sound) {
          localStorage.setItem(`notification_sound_${userId}`, (data as any).notification_sound);
        }
      } else {
        // If profile doesn't exist yet, create one
        // Try without notification_sound first if the column is missing
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId })
          .select()
          .single();
        
        if (newProfile) {
          if (profileLoadSeq.current !== requestId) return;
          setProfile({
            id: newProfile.id,
            display_name: newProfile.display_name,
            avatar_url: newProfile.avatar_url,
            notification_sound: (newProfile as any).notification_sound || localSound || 'bell'
          });
        }
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    
    // Save to local storage as fallback/cache
    if (updates.notification_sound) {
      localStorage.setItem(`notification_sound_${user.id}`, updates.notification_sound);
    }
    
    const dbUpdates: any = {};
    if (updates.notification_sound) dbUpdates.notification_sound = updates.notification_sound;
    if (updates.display_name !== undefined) dbUpdates.display_name = updates.display_name;
    
    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', user.id);
      
    if (error) {
      console.error('Error updating profile:', error);
      // If notification_sound is missing, try updating only display_name
      if (dbUpdates.notification_sound) {
        delete dbUpdates.notification_sound;
        await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
      }
    }
    
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  useEffect(() => {
    console.log("Auth hook initialized");
    
    // Safety timeout: force end loading after a while no matter what
    const safetyTimer = setTimeout(() => {
      if (loading) {
        console.warn("Auth loading safety timeout reached");
        setLoading(false);
      }
    }, 20000);

    let initialSessionHandled = false;

    // Set up listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        console.log("Auth state change:", event);
        if (event === 'INITIAL_SESSION') {
          initialSessionHandled = true;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        
        if (nextSession?.user) {
          const reqId = ++profileLoadSeq.current;
          void loadProfile(nextSession.user.id, nextSession.user, reqId);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    );

    const fallbackTimer = setTimeout(async () => {
      if (initialSessionHandled) return;
      try {
        console.log("Fetching initial session...");
        const { data: { session: fallbackSession } } = await supabase.auth.getSession();
        console.log("Initial session fetched:", fallbackSession ? "Session exists" : "No session");
        
        setSession(fallbackSession);
        setUser(fallbackSession?.user ?? null);
        if (fallbackSession?.user) {
          const reqId = ++profileLoadSeq.current;
          void loadProfile(fallbackSession.user.id, fallbackSession.user, reqId);
        }
      } catch (err) {
        console.error("Initial session error:", err);
      } finally {
        console.log("Auth initialization complete");
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    }, 1000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, profile, updateProfile, session, loading, signOut };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useAuthInternal();
  return createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
