import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceDialog } from "@/components/financial/InvoiceDialog";
import { AccountsPayableDialog } from "@/components/financial/AccountsPayableDialog";
import { AccountsReceivableDialog } from "@/components/financial/AccountsReceivableDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Plus,
  Search,
  Filter,
  FileText,
  CreditCard,
  Wallet
} from "lucide-react";

export default function Financial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [payableDialogOpen, setPayableDialogOpen] = useState(false);
  const [receivableDialogOpen, setReceivableDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch financial data
  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers!invoices_customer_id_fkey(full_name),
          appointments(id)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: accountsPayable = [], refetch: refetchPayable } = useQuery({
    queryKey: ['accounts_payable'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts_payable')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: accountsReceivable = [], refetch: refetchReceivable } = useQuery({
    queryKey: ['accounts_receivable'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .select(`
          *,
          customers!accounts_receivable_customer_id_fkey(full_name)
        `)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Calculate KPIs
  const totalRevenue = invoices
    .filter(inv => inv.status === 'pago')
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);
  
  const pendingReceivables = accountsReceivable
    .filter(rec => rec.status === 'pendente')
    .reduce((sum, rec) => sum + parseFloat(rec.amount.toString()), 0);
  
  const pendingPayables = accountsPayable
    .filter(pay => pay.status === 'pendente')
    .reduce((sum, pay) => sum + parseFloat(pay.amount.toString()), 0);
  
  const overdueCount = [...accountsReceivable, ...accountsPayable]
    .filter(item => item.status === 'vencido' || new Date(item.due_date) < new Date()).length;

  const handlePaymentUpdate = async (id: string, table: 'invoices' | 'accounts_payable' | 'accounts_receivable', status: 'pago' | 'pendente' | 'vencido') => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ 
          status,
          ...(status === 'pago' ? { 
            paid_at: new Date().toISOString(),
            ...(table === 'accounts_receivable' ? { received_at: new Date().toISOString() } : {})
          } : {})
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "O status do pagamento foi atualizado com sucesso.",
      });

      // Refetch data based on table
      if (table === 'invoices') refetchInvoices();
      else if (table === 'accounts_payable') refetchPayable();
      else if (table === 'accounts_receivable') refetchReceivable();

    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do pagamento.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pendente': 'secondary',
      'pago': 'default',
      'vencido': 'destructive',
      'cancelado': 'outline'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão Financeira</h1>
          <p className="text-muted-foreground">
            Controle suas finanças, faturas e fluxo de caixa
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Faturas pagas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingReceivables)}
            </div>
            <p className="text-xs text-muted-foreground">Contas pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingPayables)}
            </div>
            <p className="text-xs text-muted-foreground">Contas pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Contas em atraso</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="receivable" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            A Receber
          </TabsTrigger>
          <TabsTrigger value="payable" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            A Pagar
          </TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Buscar faturas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setInvoiceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Fatura
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices
                  .filter(invoice => 
                    statusFilter === 'all' || invoice.status === statusFilter
                  )
                  .filter(invoice =>
                    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    invoice.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.customers?.full_name}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(invoice.total_amount.toString()))}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        {invoice.status === 'pendente' && (
                          <Button
                            size="sm"
                            onClick={() => handlePaymentUpdate(invoice.id, 'invoices', 'pago')}
                          >
                            Marcar como Pago
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Accounts Receivable Tab */}
        <TabsContent value="receivable" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Contas a Receber</h3>
            <Button onClick={() => setReceivableDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta a Receber
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsReceivable.map((receivable) => (
                  <TableRow key={receivable.id}>
                    <TableCell>{receivable.customers?.full_name}</TableCell>
                    <TableCell>{receivable.description}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(receivable.amount.toString()))}
                    </TableCell>
                    <TableCell>
                      {format(new Date(receivable.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(receivable.status)}</TableCell>
                    <TableCell>
                      {receivable.status === 'pendente' && (
                        <Button
                          size="sm"
                          onClick={() => handlePaymentUpdate(receivable.id, 'accounts_receivable', 'pago')}
                        >
                          Marcar como Recebido
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Accounts Payable Tab */}
        <TabsContent value="payable" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Contas a Pagar</h3>
            <Button onClick={() => setPayableDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta a Pagar
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsPayable.map((payable) => (
                  <TableRow key={payable.id}>
                    <TableCell>{payable.supplier_name}</TableCell>
                    <TableCell>{payable.description}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(payable.amount.toString()))}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payable.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(payable.status)}</TableCell>
                    <TableCell>
                      {payable.status === 'pendente' && (
                        <Button
                          size="sm"
                          onClick={() => handlePaymentUpdate(payable.id, 'accounts_payable', 'pago')}
                        >
                          Marcar como Pago
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        onSuccess={() => {
          refetchInvoices();
          setInvoiceDialogOpen(false);
        }}
      />
      
      <AccountsPayableDialog
        open={payableDialogOpen}
        onOpenChange={setPayableDialogOpen}
        onSuccess={() => {
          refetchPayable();
          setPayableDialogOpen(false);
        }}
      />
      
      <AccountsReceivableDialog
        open={receivableDialogOpen}
        onOpenChange={setReceivableDialogOpen}
        onSuccess={() => {
          refetchReceivable();
          setReceivableDialogOpen(false);
        }}
      />
    </div>
  );
}