-- Create enums for financial management
CREATE TYPE public.invoice_status AS ENUM ('pendente', 'pago', 'vencido', 'cancelado');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'parcial', 'vencido');
CREATE TYPE public.cash_flow_type AS ENUM ('entrada', 'saida');

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'pendente',
  description TEXT,
  payment_method TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create accounts_payable table
CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status payment_status NOT NULL DEFAULT 'pendente',
  category TEXT,
  document_number TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create accounts_receivable table
CREATE TABLE public.accounts_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status payment_status NOT NULL DEFAULT 'pendente',
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create cash_flow_entries table
CREATE TABLE public.cash_flow_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type cash_flow_type NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Authenticated users can view invoices"
ON public.invoices FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoices"
ON public.invoices FOR INSERT
TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update invoices"
ON public.invoices FOR UPDATE
TO authenticated USING (true);

-- RLS Policies for invoice_items
CREATE POLICY "Authenticated users can view invoice items"
ON public.invoice_items FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert invoice items"
ON public.invoice_items FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoice items"
ON public.invoice_items FOR UPDATE
TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete invoice items"
ON public.invoice_items FOR DELETE
TO authenticated USING (true);

-- RLS Policies for accounts_payable
CREATE POLICY "Authenticated users can view accounts payable"
ON public.accounts_payable FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert accounts payable"
ON public.accounts_payable FOR INSERT
TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update accounts payable"
ON public.accounts_payable FOR UPDATE
TO authenticated USING (true);

-- RLS Policies for accounts_receivable
CREATE POLICY "Authenticated users can view accounts receivable"
ON public.accounts_receivable FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert accounts receivable"
ON public.accounts_receivable FOR INSERT
TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update accounts receivable"
ON public.accounts_receivable FOR UPDATE
TO authenticated USING (true);

-- RLS Policies for cash_flow_entries
CREATE POLICY "Authenticated users can view cash flow entries"
ON public.cash_flow_entries FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert cash flow entries"
ON public.cash_flow_entries FOR INSERT
TO authenticated WITH CHECK (auth.uid() = created_by);

-- Create triggers for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at
  BEFORE UPDATE ON public.accounts_payable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at
  BEFORE UPDATE ON public.accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  -- Get the next number based on current year and existing invoices
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE EXTRACT(YEAR FROM CURRENT_DATE) || '-%';
  
  -- Format: YYYY-NNNN (e.g., 2025-0001)
  invoice_number := EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update cash flow automatically
CREATE OR REPLACE FUNCTION public.update_cash_flow_from_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- If invoice status changed to 'pago', create cash flow entry
  IF NEW.status = 'pago' AND OLD.status != 'pago' THEN
    INSERT INTO public.cash_flow_entries (type, category, description, amount, entry_date, reference_id, reference_type, created_by)
    VALUES ('entrada', 'Faturamento', 'Pagamento da fatura ' || NEW.invoice_number, NEW.total_amount, COALESCE(NEW.paid_at::DATE, CURRENT_DATE), NEW.id, 'invoice', NEW.created_by);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic cash flow updates
CREATE TRIGGER update_cash_flow_on_invoice_payment
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_cash_flow_from_invoice();