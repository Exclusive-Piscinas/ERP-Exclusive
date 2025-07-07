import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Customer {
  id: string;
  full_name: string;
  person_type: 'fisica' | 'juridica';
  document: string;
  phone: string;
  email?: string;
  address_zip?: string;
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  observations?: string;
  is_active: boolean;
}

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onCustomerSaved: () => void;
}

export function CustomerDialog({ open, onOpenChange, customer, onCustomerSaved }: CustomerDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    person_type: 'fisica' as 'fisica' | 'juridica',
    document: '',
    phone: '',
    email: '',
    address_zip: '',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    observations: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        full_name: customer.full_name || '',
        person_type: customer.person_type || 'fisica',
        document: customer.document || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address_zip: customer.address_zip || '',
        address_street: customer.address_street || '',
        address_number: customer.address_number || '',
        address_neighborhood: customer.address_neighborhood || '',
        address_city: customer.address_city || '',
        address_state: customer.address_state || '',
        observations: customer.observations || '',
      });
    } else {
      setFormData({
        full_name: '',
        person_type: 'fisica',
        document: '',
        phone: '',
        email: '',
        address_zip: '',
        address_street: '',
        address_number: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        observations: '',
      });
    }
  }, [customer, open]);

  const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11;
  };

  const validateCNPJ = (cnpj: string): boolean => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    return cleanCNPJ.length === 14;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    // Validation
    if (!formData.full_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.document.trim()) {
      toast.error('Documento é obrigatório');
      return;
    }

    // Validate document format
    const cleanDocument = formData.document.replace(/\D/g, '');
    if (formData.person_type === 'fisica' && !validateCPF(formData.document)) {
      toast.error('CPF inválido');
      return;
    }

    if (formData.person_type === 'juridica' && !validateCNPJ(formData.document)) {
      toast.error('CNPJ inválido');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Telefone é obrigatório');
      return;
    }

    if (formData.email && !formData.email.includes('@')) {
      toast.error('Email inválido');
      return;
    }

    setLoading(true);

    try {
      const customerData = {
        ...formData,
        document: cleanDocument, // Store clean document
        email: formData.email || null,
        address_zip: formData.address_zip || null,
        address_street: formData.address_street || null,
        address_number: formData.address_number || null,
        address_neighborhood: formData.address_neighborhood || null,
        address_city: formData.address_city || null,
        address_state: formData.address_state || null,
        observations: formData.observations || null,
      };

      if (customer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customer.id);

        if (error) {
          toast.error('Erro ao atualizar cliente');
          return;
        }

        toast.success('Cliente atualizado com sucesso');
      } else {
        // Create new customer
        const { error } = await supabase
          .from('customers')
          .insert({
            ...customerData,
            created_by: user.id,
          });

        if (error) {
          toast.error('Erro ao criar cliente');
          return;
        }

        toast.success('Cliente criado com sucesso');
      }

      onCustomerSaved();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Erro ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentMask = (value: string) => {
    const clean = value.replace(/\D/g, '');
    
    if (formData.person_type === 'fisica') {
      // CPF mask
      return clean
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    } else {
      // CNPJ mask
      return clean
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
  };

  const handlePhoneMask = (value: string) => {
    const clean = value.replace(/\D/g, '');
    return clean
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4,5})(\d{4})$/, '$1-$2');
  };

  const handleZipMask = (value: string) => {
    const clean = value.replace(/\D/g, '');
    return clean.replace(/(\d{5})(\d{1,3})/, '$1-$2');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {customer 
              ? 'Atualize as informações do cliente' 
              : 'Preencha os dados do novo cliente'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Nome completo do cliente"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="person_type">Tipo de Pessoa *</Label>
                <Select
                  value={formData.person_type}
                  onValueChange={(value: 'fisica' | 'juridica') => 
                    setFormData(prev => ({ ...prev, person_type: value, document: '' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisica">Pessoa Física</SelectItem>
                    <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document">
                  {formData.person_type === 'fisica' ? 'CPF *' : 'CNPJ *'}
                </Label>
                <Input
                  id="document"
                  value={formData.document}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    document: handleDocumentMask(e.target.value) 
                  }))}
                  placeholder={formData.person_type === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    phone: handlePhoneMask(e.target.value) 
                  }))}
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Endereço</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_zip">CEP</Label>
                <Input
                  id="address_zip"
                  value={formData.address_zip}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address_zip: handleZipMask(e.target.value) 
                  }))}
                  placeholder="00000-000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_street">Rua</Label>
                <Input
                  id="address_street"
                  value={formData.address_street}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_street: e.target.value }))}
                  placeholder="Nome da rua"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_number">Número</Label>
                <Input
                  id="address_number"
                  value={formData.address_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_number: e.target.value }))}
                  placeholder="123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_neighborhood">Bairro</Label>
                <Input
                  id="address_neighborhood"
                  value={formData.address_neighborhood}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_neighborhood: e.target.value }))}
                  placeholder="Nome do bairro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_state">Estado</Label>
                <Input
                  id="address_state"
                  value={formData.address_state}
                  onChange={(e) => setFormData(prev => ({ ...prev, address_state: e.target.value }))}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_city">Cidade</Label>
              <Input
                id="address_city"
                value={formData.address_city}
                onChange={(e) => setFormData(prev => ({ ...prev, address_city: e.target.value }))}
                placeholder="Nome da cidade"
              />
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
              placeholder="Informações adicionais sobre o cliente..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                customer ? 'Atualizar' : 'Criar Cliente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}