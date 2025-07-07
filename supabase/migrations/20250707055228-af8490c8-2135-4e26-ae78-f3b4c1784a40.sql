-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('agendado', 'confirmado', 'em_execucao', 'concluido', 'cancelado');

-- Create enum for pool types
CREATE TYPE public.pool_type AS ENUM ('fibra', 'alvenaria', 'vinil');

-- Create service_types table
CREATE TABLE public.service_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  estimated_duration INTEGER NOT NULL, -- duration in minutes
  price DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pools table
CREATE TABLE public.pools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type pool_type NOT NULL,
  length DECIMAL(5,2), -- in meters
  width DECIMAL(5,2), -- in meters
  depth DECIMAL(4,2), -- in meters
  volume DECIMAL(8,2), -- in liters
  filtration_system TEXT,
  last_maintenance DATE,
  observations TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create technicians table
CREATE TABLE public.technicians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialties JSONB DEFAULT '[]'::jsonb, -- array of specialties
  availability JSONB DEFAULT '{}'::jsonb, -- working hours and availability
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES public.pools(id) ON DELETE SET NULL,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE RESTRICT,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE RESTRICT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status appointment_status NOT NULL DEFAULT 'agendado',
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_types
CREATE POLICY "Authenticated users can view service types"
ON public.service_types FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins can manage service types"
ON public.service_types FOR ALL
TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for pools
CREATE POLICY "Authenticated users can view pools"
ON public.pools FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pools"
ON public.pools FOR INSERT
TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update pools"
ON public.pools FOR UPDATE
TO authenticated USING (true);

-- RLS Policies for technicians
CREATE POLICY "Authenticated users can view technicians"
ON public.technicians FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins can manage technicians"
ON public.technicians FOR ALL
TO authenticated USING (public.is_admin(auth.uid()));

-- RLS Policies for appointments
CREATE POLICY "Authenticated users can view appointments"
ON public.appointments FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert appointments"
ON public.appointments FOR INSERT
TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update appointments"
ON public.appointments FOR UPDATE
TO authenticated USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_service_types_updated_at
  BEFORE UPDATE ON public.service_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pools_updated_at
  BEFORE UPDATE ON public.pools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technicians_updated_at
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial service types
INSERT INTO public.service_types (name, estimated_duration, price) VALUES
('Limpeza Básica', 60, 80.00),
('Limpeza Completa', 120, 150.00),
('Manutenção Preventiva', 90, 120.00),
('Troca de Filtro', 30, 50.00),
('Tratamento Químico', 45, 70.00);