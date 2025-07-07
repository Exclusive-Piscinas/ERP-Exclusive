import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Users, 
  UserPlus, 
  Building2, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut,
  ChevronLeft,
  Menu
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Building2,
    role: null
  },
  {
    title: "Clientes",
    url: "/customers",
    icon: Users,
    role: null
  },
  {
    title: "Agendamentos",
    url: "/appointments",
    icon: Calendar,
    role: null
  },
  {
    title: "Usuários",
    url: "/users",
    icon: UserPlus,
    role: "admin",
    disabled: true,
    tooltip: "Em desenvolvimento"
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
    role: "admin",
    disabled: true,
    tooltip: "Em desenvolvimento"
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, profile, hasRole, signOut } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavClasses = (isActive: boolean, disabled?: boolean) => {
    if (disabled) {
      return "text-muted-foreground cursor-not-allowed opacity-50";
    }
    return isActive 
      ? "bg-primary/20 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors";
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const filteredNavigation = navigation.filter(item => {
    if (item.role && !hasRole(item.role as any)) {
      return false;
    }
    return true;
  });

  return (
    <Sidebar
      className={`transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } border-r border-sidebar-border bg-sidebar`}
      variant="inset"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          {!collapsed && (
            <>
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-semibold text-sidebar-foreground">
                  Exclusive Piscinas
                </h1>
                <p className="text-xs text-sidebar-foreground/60">
                  Sistema ERP
                </p>
              </div>
            </>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <SidebarContent className="flex-1">
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Navegação
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredNavigation.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild={!item.disabled}
                      className={getNavClasses(isActive(item.url), item.disabled)}
                      tooltip={item.disabled && collapsed ? item.tooltip : undefined}
                    >
                      {item.disabled ? (
                        <div className="flex items-center gap-3 px-3 py-2 cursor-not-allowed">
                          <item.icon className="w-4 h-4" />
                          {!collapsed && (
                            <div className="flex-1 flex items-center justify-between">
                              <span>{item.title}</span>
                              <span className="text-xs text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-full">
                                Em breve
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-4 h-4" />
                          {!collapsed && (
                            <span className="flex-1">{item.title}</span>
                          )}
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* User Profile & Logout */}
        <div className="border-t border-sidebar-border p-4">
          {!collapsed && (
            <div className="mb-3">
              <p className="text-sm font-medium text-sidebar-foreground">
                {profile?.full_name || user?.email}
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                {hasRole('admin') ? 'Administrador' : 
                 hasRole('gerente') ? 'Gerente' : 'Técnico'}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={handleSignOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </div>
    </Sidebar>
  );
}