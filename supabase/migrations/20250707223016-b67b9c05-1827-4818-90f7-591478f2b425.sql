-- Fase 1: Aprimoramento do Módulo de Agendamentos

-- 1. Adicionar campo tasks_jsonb na tabela appointments
ALTER TABLE public.appointments 
ADD COLUMN tasks_jsonb JSONB DEFAULT '[]'::jsonb;

-- 2. Criar tabela service_templates para modelos de serviço
CREATE TABLE public.service_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_tasks_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_duration INTEGER NOT NULL DEFAULT 60, -- duration in minutes
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- 3. Expandir tabela technicians (já existe, vamos adicionar campos úteis)
ALTER TABLE public.technicians 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS work_radius_km INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2);

-- 4. Criar tabela task_templates para tarefas reutilizáveis
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  estimated_minutes INTEGER NOT NULL DEFAULT 30,
  category TEXT, -- 'preparation', 'execution', 'cleanup', 'inspection'
  requires_materials BOOLEAN DEFAULT false,
  safety_requirements TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_templates
CREATE POLICY "Authenticated users can view service templates"
ON public.service_templates FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins can manage service templates"
ON public.service_templates FOR ALL
TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for task_templates  
CREATE POLICY "Authenticated users can view task templates"
ON public.task_templates FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins can manage task templates"
ON public.task_templates FOR ALL
TO authenticated USING (public.is_admin(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_service_templates_updated_at
  BEFORE UPDATE ON public.service_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default task templates
INSERT INTO public.task_templates (name, description, estimated_minutes, category, requires_materials) VALUES
('Inspeção Visual Inicial', 'Verificação geral do estado da piscina e equipamentos', 15, 'preparation', false),
('Teste de pH e Cloro', 'Medição dos níveis químicos da água', 10, 'preparation', true),
('Limpeza de Superfície', 'Remoção de folhas e detritos da superfície', 20, 'execution', true),
('Aspiração do Fundo', 'Limpeza completa do fundo da piscina', 30, 'execution', true),
('Limpeza das Bordas', 'Escovação e limpeza das bordas da piscina', 25, 'execution', true),
('Limpeza do Skimmer', 'Esvaziamento e limpeza dos skimmers', 15, 'execution', false),
('Verificação do Sistema de Filtração', 'Inspeção da bomba e filtros', 20, 'execution', false),
('Adição de Produtos Químicos', 'Aplicação de cloro, pH+ ou pH- conforme necessário', 10, 'execution', true),
('Limpeza dos Equipamentos', 'Lavagem e organização dos equipamentos utilizados', 15, 'cleanup', false),
('Relatório Final', 'Documentação do serviço realizado e recomendações', 10, 'cleanup', false);

-- Insert some default service templates
INSERT INTO public.service_templates (service_type_id, name, description, default_tasks_jsonb, estimated_duration, created_by)
SELECT 
  st.id,
  'Template para ' || st.name,
  'Template padrão para ' || st.name,
  CASE 
    WHEN st.name = 'Limpeza Básica' THEN 
      '[
        {"task_template_id": "' || tt1.id || '", "description": "Inspeção Visual Inicial", "estimated_minutes": 15, "order": 1},
        {"task_template_id": "' || tt2.id || '", "description": "Teste de pH e Cloro", "estimated_minutes": 10, "order": 2},
        {"task_template_id": "' || tt3.id || '", "description": "Limpeza de Superfície", "estimated_minutes": 20, "order": 3},
        {"task_template_id": "' || tt4.id || '", "description": "Aspiração do Fundo", "estimated_minutes": 30, "order": 4},
        {"task_template_id": "' || tt9.id || '", "description": "Limpeza dos Equipamentos", "estimated_minutes": 15, "order": 5}
      ]'::jsonb
    WHEN st.name = 'Limpeza Completa' THEN 
      '[
        {"task_template_id": "' || tt1.id || '", "description": "Inspeção Visual Inicial", "estimated_minutes": 15, "order": 1},
        {"task_template_id": "' || tt2.id || '", "description": "Teste de pH e Cloro", "estimated_minutes": 10, "order": 2},
        {"task_template_id": "' || tt3.id || '", "description": "Limpeza de Superfície", "estimated_minutes": 20, "order": 3},
        {"task_template_id": "' || tt4.id || '", "description": "Aspiração do Fundo", "estimated_minutes": 30, "order": 4},
        {"task_template_id": "' || tt5.id || '", "description": "Limpeza das Bordas", "estimated_minutes": 25, "order": 5},
        {"task_template_id": "' || tt6.id || '", "description": "Limpeza do Skimmer", "estimated_minutes": 15, "order": 6},
        {"task_template_id": "' || tt7.id || '", "description": "Verificação do Sistema de Filtração", "estimated_minutes": 20, "order": 7},
        {"task_template_id": "' || tt8.id || '", "description": "Adição de Produtos Químicos", "estimated_minutes": 10, "order": 8},
        {"task_template_id": "' || tt9.id || '", "description": "Limpeza dos Equipamentos", "estimated_minutes": 15, "order": 9},
        {"task_template_id": "' || tt10.id || '", "description": "Relatório Final", "estimated_minutes": 10, "order": 10}
      ]'::jsonb
    ELSE '[]'::jsonb
  END,
  st.estimated_duration,
  (SELECT id FROM auth.users LIMIT 1)
FROM public.service_types st
CROSS JOIN (SELECT id FROM public.task_templates WHERE name = 'Inspeção Visual Inicial' LIMIT 1) tt1
CROSS JOIN (SELECT id FROM public.task_templates WHERE name = 'Teste de pH e Cloro' LIMIT 1) tt2  
CROSS JOIN (SELECT id FROM public.task_templates WHERE name = 'Limpeza de Superfície' LIMIT 1) tt3
CROSS JOIN (SELECT id FROM public.task_templates WHERE name = 'Aspiração do Fundo' LIMIT 1) tt4
CROSS JOIN (SELECT id FROM public.task_templates WHERE name = 'Limpeza das Bordas' LIMIT 1) tt5
CROSS JOIN (SELECT id FROM public.task_templates WHERE name = 'Limpeza do Skimmer' LIMIT 1) tt6
CROSS JOIN (SELECT id FROM public.task_templates WHERE name = 'Verificação do Sistema de Filtração' LIMIT 1) tt7
CROSS JOIN (SELECT id FROM public.task_templates WHERE name = 'Adição de Produtos Químicos' LIMIT 1) tt8
CROSS JOIN (SELECT id FROM public.task_templates WHERE name = 'Limpeza dos Equipamentos' LIMIT 1) tt9
CROSS JOIN (SELECT id FROM public.task_templates WHERE name = 'Relatório Final' LIMIT 1) tt10
WHERE st.name IN ('Limpeza Básica', 'Limpeza Completa');