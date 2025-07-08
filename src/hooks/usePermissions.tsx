import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Permission {
  permission_name: string;
  permission_description: string;
  module: string;
  action: string;
}

interface UsePermissionsReturn {
  permissions: Permission[];
  loading: boolean;
  hasPermission: (permissionName: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Usar a função get_user_permissions do Supabase
      const { data, error } = await supabase.rpc('get_user_permissions', {
        _user_id: user.id
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
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permissionName: string): boolean => {
    return permissions.some(p => p.permission_name === permissionName);
  }, [permissions]);

  const refreshPermissions = useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    loading,
    hasPermission,
    refreshPermissions,
  };
}