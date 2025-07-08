-- Fase 1: Expansão do Sistema de Roles e Permissões

-- 1. Expandir enum user_role para incluir todas as roles necessárias
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'financeiro';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'vendedor';

-- 2. Criar tabela de permissões granulares
CREATE TABLE public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL, -- 'customers', 'appointments', 'financial', 'users', 'system'
  action TEXT NOT NULL, -- 'view', 'create', 'edit', 'delete', 'manage', 'approve'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 3. Criar tabela de mapeamento role_permissions
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- 4. Criar tabela de auditoria
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'view_sensitive'
  table_name TEXT, -- tabela afetada (se aplicável)
  record_id UUID, -- ID do registro afetado (se aplicável)
  old_values JSONB, -- valores anteriores (para updates)
  new_values JSONB, -- novos valores (para creates/updates)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS nas novas tabelas
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Inserir permissões básicas do sistema
INSERT INTO public.permissions (name, description, module, action) VALUES
-- Módulo de Clientes
('view_customers', 'Visualizar clientes', 'customers', 'view'),
('create_customers', 'Criar novos clientes', 'customers', 'create'),
('edit_customers', 'Editar clientes existentes', 'customers', 'edit'),
('delete_customers', 'Excluir clientes', 'customers', 'delete'),
('manage_customers', 'Gestão completa de clientes', 'customers', 'manage'),

-- Módulo de Agendamentos
('view_appointments', 'Visualizar agendamentos', 'appointments', 'view'),
('create_appointments', 'Criar novos agendamentos', 'appointments', 'create'),
('edit_appointments', 'Editar agendamentos existentes', 'appointments', 'edit'),
('delete_appointments', 'Excluir agendamentos', 'appointments', 'delete'),
('assign_technicians', 'Atribuir técnicos aos agendamentos', 'appointments', 'assign'),
('manage_appointments', 'Gestão completa de agendamentos', 'appointments', 'manage'),

-- Módulo Financeiro
('view_invoices', 'Visualizar faturas', 'financial', 'view'),
('create_invoices', 'Criar novas faturas', 'financial', 'create'),
('edit_invoices', 'Editar faturas existentes', 'financial', 'edit'),
('delete_invoices', 'Excluir faturas', 'financial', 'delete'),
('manage_payments', 'Gerenciar pagamentos', 'financial', 'manage'),
('approve_invoices', 'Aprovar faturas', 'financial', 'approve'),
('view_financial_reports', 'Visualizar relatórios financeiros', 'financial', 'view'),
('manage_accounts_payable', 'Gerenciar contas a pagar', 'financial', 'manage'),
('manage_accounts_receivable', 'Gerenciar contas a receber', 'financial', 'manage'),
('view_cash_flow', 'Visualizar fluxo de caixa', 'financial', 'view'),

-- Módulo de Usuários
('view_users', 'Visualizar usuários', 'users', 'view'),
('create_users', 'Criar novos usuários', 'users', 'create'),
('edit_users', 'Editar usuários existentes', 'users', 'edit'),
('delete_users', 'Excluir usuários', 'users', 'delete'),
('assign_roles', 'Atribuir roles aos usuários', 'users', 'assign'),
('manage_users', 'Gestão completa de usuários', 'users', 'manage'),
('view_audit_logs', 'Visualizar logs de auditoria', 'users', 'view'),

-- Módulo de Sistema
('system_settings', 'Configurações do sistema', 'system', 'manage'),
('backup_data', 'Fazer backup dos dados', 'system', 'manage'),
('export_data', 'Exportar dados', 'system', 'manage'),
('view_system_logs', 'Visualizar logs do sistema', 'system', 'view');

-- 6. Definir permissões por role
-- ADMIN: Todas as permissões
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions;

-- GERENTE: Permissões de gestão operacional
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'gerente', id FROM public.permissions 
WHERE name IN (
  'view_customers', 'create_customers', 'edit_customers', 'manage_customers',
  'view_appointments', 'create_appointments', 'edit_appointments', 'assign_technicians', 'manage_appointments',
  'view_invoices', 'approve_invoices', 'view_financial_reports',
  'view_users', 'edit_users', 'view_audit_logs'
);

-- FINANCEIRO: Permissões do módulo financeiro
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'financeiro', id FROM public.permissions 
WHERE name IN (
  'view_customers', -- apenas para faturamento
  'view_invoices', 'create_invoices', 'edit_invoices', 'manage_payments', 'approve_invoices',
  'view_financial_reports', 'manage_accounts_payable', 'manage_accounts_receivable', 'view_cash_flow'
);

-- VENDEDOR: Permissões de vendas e seus próprios clientes
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'vendedor', id FROM public.permissions 
WHERE name IN (
  'view_customers', 'create_customers', 'edit_customers',
  'view_appointments', 'create_appointments',
  'view_invoices'
);

-- TECNICO: Permissões operacionais limitadas
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'tecnico', id FROM public.permissions 
WHERE name IN (
  'view_customers', -- apenas clientes dos seus agendamentos
  'view_appointments', 'edit_appointments' -- apenas seus próprios agendamentos
);

-- 7. Criar função para verificar permissões específicas
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

-- 8. Criar função para listar permissões de um usuário
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

-- 9. Criar função para log de auditoria
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

-- 10. Políticas RLS para as novas tabelas

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

-- 11. Trigger automático para auditoria em tabelas críticas
CREATE OR REPLACE FUNCTION public.trigger_audit_log()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- Log para operações de UPDATE
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_action(
      'update',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  
  -- Log para operações de INSERT
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_action(
      'create',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  
  -- Log para operações de DELETE
  IF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_action(
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Aplicar trigger de auditoria nas tabelas críticas
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

CREATE TRIGGER audit_appointments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

CREATE TRIGGER audit_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();