-- Fase 1.1: Expandir enum user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'financeiro';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'vendedor';