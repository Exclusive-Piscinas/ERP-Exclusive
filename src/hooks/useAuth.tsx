import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Permission } from './usePermissions';

type UserRole = 'admin' | 'gerente' | 'tecnico' | 'financeiro' | 'vendedor';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  userRoles: UserRole[];
  permissions: Permission[];
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setProfile(profileData);

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
      }

      setUserRoles(rolesData.map(r => r.role));

      // Fetch user permissions
      await fetchPermissions(userId);
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const fetchPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_permissions', {
        _user_id: userId
      });

      if (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      } else {
        setPermissions(data || []);
      }
    } catch (error) {
      console.error('Error in fetchPermissions:', error);
      setPermissions([]);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch to avoid recursive issues
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRoles([]);
          setPermissions([]);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: UserRole): boolean => {
    return userRoles.includes(role);
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.some(p => p.permission_name === permission);
  };

  const refreshPermissions = async () => {
    if (user) {
      await fetchPermissions(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error('Erro ao fazer login: ' + error.message);
      } else {
        toast.success('Login realizado com sucesso!');
      }
      
      return { error };
    } catch (error) {
      const errorMessage = 'Erro inesperado ao fazer login';
      toast.error(errorMessage);
      return { error: { message: errorMessage } };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });
      
      if (error) {
        toast.error('Erro ao criar conta: ' + error.message);
      } else {
        toast.success('Conta criada com sucesso! Verifique seu email.');
      }
      
      return { error };
    } catch (error) {
      const errorMessage = 'Erro inesperado ao criar conta';
      toast.error(errorMessage);
      return { error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Erro ao sair: ' + error.message);
      } else {
        toast.success('Logout realizado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro inesperado ao sair');
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    userRoles,
    permissions,
    hasRole,
    hasPermission,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshPermissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}