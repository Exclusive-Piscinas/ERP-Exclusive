import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGuardProps {
  children: ReactNode;
  permission: string;
  fallback?: ReactNode;
  hideIfNoAccess?: boolean;
}

export function PermissionGuard({ 
  children, 
  permission, 
  fallback = null, 
  hideIfNoAccess = false 
}: PermissionGuardProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    if (hideIfNoAccess) {
      return null;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
  hideIfNoAccess?: boolean;
}

export function RoleGuard({ 
  children, 
  roles, 
  fallback = null, 
  hideIfNoAccess = false 
}: RoleGuardProps) {
  const { hasRole } = useAuth();

  const hasRequiredRole = roles.some(role => hasRole(role as any));

  if (!hasRequiredRole) {
    if (hideIfNoAccess) {
      return null;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}