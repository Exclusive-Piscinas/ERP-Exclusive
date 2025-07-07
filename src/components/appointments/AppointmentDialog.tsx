import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const appointmentSchema = z.object({
  customer_id: z.string().min(1, "Selecione um cliente"),
  pool_id: z.string().optional(),
  technician_id: z.string().min(1, "Selecione um técnico"),
  service_type_id: z.string().min(1, "Selecione um tipo de serviço"),
  date: z.date({
    required_error: "Selecione uma data",
  }),
  start_time: z.string().min(1, "Selecione um horário"),
  observations: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId?: string;
  onSuccess?: () => void;
}

interface Customer {
  id: string;
  full_name: string;
}

interface Pool {
  id: string;
  customer_id: string;
  type: string;
}

interface Technician {
  id: string;
  full_name: string;
}

interface ServiceType {
  id: string;
  name: string;
  estimated_duration: number;
  price: number;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  appointmentId,
  onSuccess,
}: AppointmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customer_id: "",
      pool_id: "",
      technician_id: "",
      service_type_id: "",
      start_time: "",
      observations: "",
    },
  });

  const selectedCustomer = form.watch("customer_id");

  useEffect(() => {
    if (open) {
      fetchFormData();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerPools(selectedCustomer);
    } else {
      setPools([]);
    }
  }, [selectedCustomer]);

  const fetchFormData = async () => {
    try {
      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');

      // Fetch technicians
      const { data: techniciansData } = await supabase
        .from('technicians')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');

      // Fetch service types
      const { data: serviceTypesData } = await supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setCustomers(customersData || []);
      setTechnicians(techniciansData || []);
      setServiceTypes(serviceTypesData || []);
    } catch (error) {
      console.error('Error fetching form data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do formulário",
        variant: "destructive",
      });
    }
  };

  const fetchCustomerPools = async (customerId: string) => {
    try {
      const { data: poolsData } = await supabase
        .from('pools')
        .select('id, customer_id, type')
        .eq('customer_id', customerId)
        .eq('is_active', true);

      setPools(poolsData || []);
    } catch (error) {
      console.error('Error fetching pools:', error);
    }
  };

  const onSubmit = async (data: AppointmentFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      // Find the selected service type to calculate end time
      const selectedServiceType = serviceTypes.find(st => st.id === data.service_type_id);
      if (!selectedServiceType) {
        throw new Error("Tipo de serviço não encontrado");
      }

      // Calculate start and end times
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const startDateTime = new Date(data.date);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + selectedServiceType.estimated_duration);

      const appointmentData = {
        customer_id: data.customer_id,
        pool_id: data.pool_id || null,
        technician_id: data.technician_id,
        service_type_id: data.service_type_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        observations: data.observations || null,
        created_by: user.id,
      };

      if (appointmentId) {
        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', appointmentId);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Agendamento atualizado com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('appointments')
          .insert([appointmentData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Agendamento criado com sucesso",
        });
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar agendamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {appointmentId ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo agendamento de serviço.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pool_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Piscina (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma piscina" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pools.map((pool) => (
                          <SelectItem key={pool.id} value={pool.id}>
                            Piscina de {pool.type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="technician_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um técnico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {technicians.map((technician) => (
                          <SelectItem key={technician.id} value={technician.id}>
                            {technician.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Serviço</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceTypes.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - {service.estimated_duration}min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          placeholder="08:00"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Instruções especiais ou observações sobre o serviço..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : appointmentId ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}