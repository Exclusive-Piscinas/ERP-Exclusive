import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, Search, Filter, Clock, User, Database } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name?: string;
}

export function AuditLogs() {
  const { hasPermission, user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Buscar logs de auditoria
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      // Se não é admin, mostrar apenas logs próprios
      if (!hasPermission('view_audit_logs')) {
        query = query.eq('user_id', user?.id);
      }

      const { data: auditData, error: auditError } = await query;

      if (auditError) {
        console.error('Error fetching audit logs:', auditError);
        toast.error('Erro ao carregar logs de auditoria');
        return;
      }

      if (!auditData) {
        setLogs([]);
        return;
      }

      // Buscar nomes dos usuários
      const userIds = [...new Set(auditData.map(log => log.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p.full_name]) || []
      );

      const logsWithUserNames: AuditLog[] = auditData.map(log => ({
        ...log,
        ip_address: log.ip_address as string | null,
        user_agent: log.user_agent as string | null,
        user_name: profilesMap.get(log.user_id) || 'Usuário Desconhecido'
      }));

      setLogs(logsWithUserNames);
    } catch (error) {
      console.error('Error in fetchAuditLogs:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [hasPermission, user]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.table_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesTable = tableFilter === "all" || log.table_name === tableFilter;
    const matchesUser = userFilter === "all" || log.user_id === userFilter;
    
    return matchesSearch && matchesAction && matchesTable && matchesUser;
  });

  const getActionBadgeColor = (action: string) => {
    const colors = {
      create: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      delete: "bg-red-100 text-red-800",
      login: "bg-purple-100 text-purple-800",
      logout: "bg-gray-100 text-gray-800",
      view_sensitive: "bg-orange-100 text-orange-800",
    };
    return colors[action as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getActionLabel = (action: string) => {
    const labels = {
      create: "Criação",
      update: "Atualização",
      delete: "Exclusão",
      login: "Login",
      logout: "Logout",
      view_sensitive: "Visualização Sensível",
    };
    return labels[action as keyof typeof labels] || action;
  };

  const formatJsonPreview = (data: any) => {
    if (!data) return '-';
    
    const str = JSON.stringify(data);
    if (str.length > 100) {
      return str.substring(0, 100) + '...';
    }
    return str;
  };

  const uniqueTables = [...new Set(logs.map(log => log.table_name).filter(Boolean))];
  const uniqueUsers = [...new Set(logs.map(log => ({ id: log.user_id, name: log.user_name })))];

  if (!hasPermission('view_audit_logs') && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para visualizar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs de Auditoria</h1>
          <p className="text-muted-foreground">
            {hasPermission('view_audit_logs') 
              ? 'Monitore todas as atividades do sistema'
              : 'Visualize suas atividades no sistema'
            }
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Usuário, ação, tabela..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="action-filter">Ação</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="create">Criação</SelectItem>
                  <SelectItem value="update">Atualização</SelectItem>
                  <SelectItem value="delete">Exclusão</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="view_sensitive">Visualização Sensível</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="table-filter">Tabela</Label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as tabelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
                  {uniqueTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasPermission('view_audit_logs') && (
              <div className="space-y-2">
                <Label htmlFor="user-filter">Usuário</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {uniqueUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Atividades ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando logs...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  {hasPermission('view_audit_logs') && <TableHead>Usuário</TableHead>}
                  <TableHead>Ação</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Registro ID</TableHead>
                  <TableHead>Dados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {new Date(log.created_at).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {hasPermission('view_audit_logs') && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{log.user_name}</span>
                        </div>
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <Badge className={getActionBadgeColor(log.action)}>
                        {getActionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {log.table_name ? (
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-muted-foreground" />
                          <span>{log.table_name}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {log.record_id ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.record_id.substring(0, 8)}...
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-xs">
                        {log.old_values && (
                          <div className="mb-1">
                            <span className="text-xs text-red-600">Anterior: </span>
                            <code className="text-xs bg-red-50 text-red-700 px-1 rounded">
                              {formatJsonPreview(log.old_values)}
                            </code>
                          </div>
                        )}
                        {log.new_values && (
                          <div>
                            <span className="text-xs text-green-600">Novo: </span>
                            <code className="text-xs bg-green-50 text-green-700 px-1 rounded">
                              {formatJsonPreview(log.new_values)}
                            </code>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}