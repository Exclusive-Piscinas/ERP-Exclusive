import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LogAuditActionParams {
  action: string;
  tableName?: string;
  recordId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

export function useAuditLog() {
  const logAction = useCallback(async ({
    action,
    tableName,
    recordId,
    oldValues,
    newValues,
    ipAddress,
    userAgent
  }: LogAuditActionParams) => {
    try {
      const { data, error } = await supabase.rpc('log_audit_action', {
        _action: action,
        _table_name: tableName || null,
        _record_id: recordId || null,
        _old_values: oldValues ? JSON.stringify(oldValues) : null,
        _new_values: newValues ? JSON.stringify(newValues) : null,
        _ip_address: ipAddress || null,
        _user_agent: userAgent || navigator.userAgent
      });

      if (error) {
        console.error('Error logging audit action:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in audit log:', error);
      return null;
    }
  }, []);

  const logLogin = useCallback(async () => {
    return await logAction({
      action: 'login',
      userAgent: navigator.userAgent
    });
  }, [logAction]);

  const logLogout = useCallback(async () => {
    return await logAction({
      action: 'logout',
      userAgent: navigator.userAgent
    });
  }, [logAction]);

  const logViewSensitive = useCallback(async (tableName: string, recordId?: string) => {
    return await logAction({
      action: 'view_sensitive',
      tableName,
      recordId,
      userAgent: navigator.userAgent
    });
  }, [logAction]);

  return {
    logAction,
    logLogin,
    logLogout,
    logViewSensitive,
  };
}