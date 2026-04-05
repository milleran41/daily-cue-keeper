import { createElement, createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const localSound = localStorage.getItem(`notification_sound_${userId}`) as NotificationSound;
      
      if (error) {
        console.error('Error selecting profile:', error);
        setProfile({
          id: userId,
          display_name: user?.user_metadata?.full_name || user?.email || null,
          avatar_url: user?.user_metadata?.avatar_url || null,
          notification_sound: localSound || 'bell'
        });
        return;
      }

      if (data) {
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

    // Set up listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);

        // Create profile on first sign in
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            try {
              const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();

              if (!existing) {
                await supabase.from('profiles').insert({
                  id: session.user.id,
                  display_name: session.user.user_metadata?.full_name || session.user.email,
                  avatar_url: session.user.user_metadata?.avatar_url || null,
                });
                await loadProfile(session.user.id);
              }
            } catch (e) {
              console.error('Profile auto-creation error:', e);
            }
          }, 0);
        }
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log("Fetching initial session...");
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Initial session fetched:", session ? "Session exists" : "No session");
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
      } catch (err) {
        console.error("Initial session error:", err);
      } finally {
        console.log("Auth initialization complete");
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
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
