import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Calendar, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalCustomers: number;
  totalUsers: number;
  activeAppointments: number;
  pendingOrders: number;
}

export default function Dashboard() {
  const { profile, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalUsers: 0,
    activeAppointments: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch users count (only for admins)
      let usersCount = 0;
      if (hasRole('admin')) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        usersCount = count || 0;
      }

      setStats({
        totalCustomers: customersCount || 0,
        totalUsers: usersCount,
        activeAppointments: 0, // To be implemented
        pendingOrders: 0, // To be implemented
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Total de Clientes",
      value: stats.totalCustomers,
      icon: Users,
      description: "Clientes ativos no sistema",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    ...(hasRole('admin') ? [{
      title: "Usuários do Sistema",
      value: stats.totalUsers,
      icon: Building2,
      description: "Usuários cadastrados",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    }] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Olá, {profile?.full_name || 'Usuário'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo ao sistema ERP da Exclusive Piscinas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {statsCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="shadow-card hover:shadow-elevated transition-all duration-300 hover:scale-105"
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

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse as funcionalidades mais utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-left">
                <Users className="w-5 h-5" />
                <div>
                  <p className="font-medium">Gerenciar Clientes</p>
                  <p className="text-sm text-muted-foreground">Adicionar e editar clientes</p>
                </div>
              </button>
              {hasRole('admin') && (
                <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-left">
                  <Building2 className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Gerenciar Usuários</p>
                    <p className="text-sm text-muted-foreground">Administrar usuários do sistema</p>
                  </div>
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-dashed border-muted-foreground/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              Próximas Funcionalidades
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                Em breve
              </span>
            </CardTitle>
            <CardDescription>
              Funcionalidades planejadas para as próximas versões
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-muted-foreground">Sistema de Agendamentos</p>
                  <p className="text-sm text-muted-foreground/70">Agendar visitas e serviços</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-muted-foreground">Ordens de Serviço</p>
                  <p className="text-sm text-muted-foreground/70">Controlar execução de serviços</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}