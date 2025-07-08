-- Fase 1.2: Criar tabelas de permissões e auditoria

-- 1. Criar tabela de permissões granulares
CREATE TABLE public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL, -- 'customers', 'appointments', 'financial', 'users', 'system'
  action TEXT NOT NULL, -- 'view', 'create', 'edit', 'delete', 'manage', 'approve'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. Criar tabela de mapeamento role_permissions
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- 3. Criar tabela de auditoria
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

-- 4. Inserir permissões básicas do sistema
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

-- 5. Definir permissões por role
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