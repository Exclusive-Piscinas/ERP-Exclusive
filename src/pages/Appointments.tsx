import { useState, useEffect } from "react";
import { Calendar, Clock, Users, Plus, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentDialog } from "@/components/appointments/AppointmentDialog";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AppointmentStats {
  today: number;
  pending: number;
  completed: number;
  cancelled: number;
}

export default function Appointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<AppointmentStats>({
    today: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);

  useEffect(() => {
    fetchAppointmentStats();
  }, []);

  const fetchAppointmentStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's appointments
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`);

      // Fetch pending appointments
      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['agendado', 'confirmado']);

      // Fetch completed appointments
      const { count: completedCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'concluido');

      // Fetch cancelled appointments
      const { count: cancelledCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelado');

      setStats({
        today: todayCount || 0,
        pending: pendingCount || 0,
        completed: completedCount || 0,
        cancelled: cancelledCount || 0,
      });
    } catch (error) {
      console.error('Error fetching appointment stats:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estatísticas de agendamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Agendamentos Hoje",
      value: stats.today,
      icon: Calendar,
      description: "Serviços programados para hoje",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pendentes",
      value: stats.pending,
      icon: Clock,
      description: "Agendamentos pendentes",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Concluídos",
      value: stats.completed,
      icon: Users,
      description: "Serviços finalizados",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os agendamentos de serviços
          </p>
        </div>
        <Button onClick={() => setShowAppointmentDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {statsCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="shadow-card hover:shadow-elevated transition-all duration-300"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  stat.value.toLocaleString()
                )}
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Calendário de Agendamentos
              </CardTitle>
              <CardDescription>
                Visualize e gerencie os agendamentos do mês
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AppointmentCalendar onRefresh={fetchAppointmentStats} />
        </CardContent>
      </Card>

      {/* Appointment Dialog */}
      <AppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        onSuccess={fetchAppointmentStats}
      />
    </div>
  );
}