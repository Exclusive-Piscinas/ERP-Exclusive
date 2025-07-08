-- Fase 1.3: Funções auxiliares e políticas RLS

-- 1. Criar função para verificar permissões específicas
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.name = _permission_name
      AND p.is_active = true
  )
$$;

-- 2. Criar função para listar permissões de um usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE(permission_name TEXT, permission_description TEXT, module TEXT, action TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT p.name, p.description, p.module, p.action
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role = rp.role
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = _user_id
    AND p.is_active = true
  ORDER BY p.module, p.action;
$$;

-- 3. Criar função para log de auditoria
CREATE OR REPLACE FUNCTION public.log_audit_action(
  _action TEXT,
  _table_name TEXT DEFAULT NULL,
  _record_id UUID DEFAULT NULL,
  _old_values JSONB DEFAULT NULL,
  _new_values JSONB DEFAULT NULL,
  _ip_address INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id, action, table_name, record_id, 
    old_values, new_values, ip_address, user_agent
  )
  VALUES (
    auth.uid(), _action, _table_name, _record_id,
    _old_values, _new_values, _ip_address, _user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 4. Políticas RLS para as novas tabelas

-- Permissions: apenas admins podem gerenciar
CREATE POLICY "Admins can manage permissions"
ON public.permissions FOR ALL
TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view permissions"
ON public.permissions FOR SELECT
TO authenticated USING (true);

-- Role Permissions: apenas admins podem gerenciar
CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions FOR ALL
TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view role permissions"
ON public.role_permissions FOR SELECT
TO authenticated USING (true);

-- Audit Logs: apenas admins e usuários podem ver seus próprios logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated WITH CHECK (true);