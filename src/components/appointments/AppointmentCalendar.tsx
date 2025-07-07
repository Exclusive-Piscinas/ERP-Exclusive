import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, User, MapPin, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  observations?: string;
  tasks_jsonb?: any;
  customers: {
    full_name: string;
    address_city?: string;
  };
  technicians: {
    full_name: string;
  };
  service_types: {
    name: string;
  };
}

interface AppointmentCalendarProps {
  onRefresh?: () => void;
}

const statusColors = {
  agendado: "bg-blue-500",
  confirmado: "bg-green-500", 
  em_execucao: "bg-yellow-500",
  concluido: "bg-emerald-500",
  cancelado: "bg-red-500",
};

const statusLabels = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_execucao: "Em Execução", 
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export function AppointmentCalendar({ onRefresh }: AppointmentCalendarProps) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetchAppointments();
  }, [currentDate]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          observations,
          tasks_jsonb,
          customers (
            full_name,
            address_city
          ),
          technicians (
            full_name
          ),
          service_types (
            name
          )
        `)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString())
        .order('start_time');

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar agendamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(appointment => 
      isSameDay(new Date(appointment.start_time), day)
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((day, index) => {
          const dayAppointments = getAppointmentsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={index}
              className={`min-h-[100px] ${isToday ? 'ring-2 ring-primary' : ''}`}
            >
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    isToday ? 'text-primary' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {dayAppointments.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {dayAppointments.length}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment) => (
                    <HoverCard key={appointment.id}>
                      <HoverCardTrigger asChild>
                        <div className="cursor-pointer">
                          <div
                            className={`w-full h-6 rounded text-xs text-white p-1 truncate ${
                              statusColors[appointment.status as keyof typeof statusColors]
                            }`}
                          >
                            {format(new Date(appointment.start_time), 'HH:mm')} - {appointment.service_types.name}
                          </div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{appointment.service_types.name}</h4>
                            <Badge variant="secondary">
                              {statusLabels[appointment.status as keyof typeof statusLabels]}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>
                                {format(new Date(appointment.start_time), 'HH:mm')} - {' '}
                                {format(new Date(appointment.end_time), 'HH:mm')}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>Cliente: {appointment.customers.full_name}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>Técnico: {appointment.technicians.full_name}</span>
                            </div>
                            
                            {appointment.customers.address_city && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{appointment.customers.address_city}</span>
                              </div>
                            )}
                          </div>
                          
                          {appointment.observations && (
                            <div className="pt-2 border-t">
                              <p className="text-sm">{appointment.observations}</p>
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                  
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayAppointments.length - 3} mais
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="text-sm text-muted-foreground">Carregando agendamentos...</div>
        </div>
      )}
    </div>
  );
}