-- Fase 1.4: Sistema de auditoria automática

-- 1. Trigger automático para auditoria em tabelas críticas
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

-- 2. Aplicar trigger de auditoria nas tabelas críticas
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