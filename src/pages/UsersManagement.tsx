import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, Edit, Shield, Search, Filter } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  roles: string[];
  email?: string;
}

interface Role {
  role: string;
}

export function UsersManagement() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Buscar profiles dos usuários
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast.error('Erro ao carregar usuários');
        return;
      }

      // Buscar roles de cada usuário
      const usersWithRoles = await Promise.all(
        profilesData.map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          // Buscar email do usuário (se disponível)
          const { data: authData } = await supabase.auth.admin.getUserById(profile.user_id);

          return {
            ...profile,
            roles: rolesData?.map((r: Role) => r.role) || [],
            email: authData.user?.email
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('view_users')) {
      fetchUsers();
    }
  }, [hasPermission]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter);
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.is_active) ||
                         (statusFilter === "inactive" && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) {
        toast.error('Erro ao atualizar status do usuário');
        return;
      }

      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Erro ao atualizar status do usuário');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: "bg-red-100 text-red-800",
      gerente: "bg-blue-100 text-blue-800",
      financeiro: "bg-green-100 text-green-800",
      vendedor: "bg-purple-100 text-purple-800",
      tecnico: "bg-orange-100 text-orange-800",
    };
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (!hasPermission('view_users')) {
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
          <h1 className="text-3xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie usuários, permissões e status do sistema
          </p>
        </div>
        
        <PermissionGuard permission="create_users" hideIfNoAccess>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:bg-primary-hover">
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Adicione um novo usuário ao sistema
                </DialogDescription>
              </DialogHeader>
              {/* TODO: Implementar formulário de criação */}
              <div className="p-4 text-center text-muted-foreground">
                Formulário de criação em desenvolvimento...
              </div>
            </DialogContent>
          </Dialog>
        </PermissionGuard>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role-filter">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as roles</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuários ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando usuários...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className={getRoleBadgeColor(role)}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PermissionGuard permission="edit_users" hideIfNoAccess>
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => toggleUserStatus(user.user_id, user.is_active)}
                        />
                      </PermissionGuard>
                      <span className={`ml-2 text-sm ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <PermissionGuard permission="edit_users" hideIfNoAccess>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </PermissionGuard>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Modifique as informações e permissões do usuário
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome Completo</Label>
                  <Input
                    id="edit-name"
                    value={selectedUser.full_name}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      full_name: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    value={selectedUser.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.roles.map((role) => (
                    <Badge key={role} className={getRoleBadgeColor(role)}>
                      {role}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Gestão de roles em desenvolvimento...
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}