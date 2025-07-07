import { useState, useEffect } from "react";
import { Clock, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  default_tasks_jsonb: any;
  estimated_duration: number;
  service_type_id: string;
  service_types: {
    name: string;
  };
}

interface ServiceTemplateSelectorProps {
  serviceTypeId?: string;
  onTemplateSelect: (tasks: any[]) => void;
}

export function ServiceTemplateSelector({ serviceTypeId, onTemplateSelect }: ServiceTemplateSelectorProps) {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (serviceTypeId) {
      fetchTemplates();
    }
  }, [serviceTypeId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_templates')
        .select(`
          id,
          name,
          description,
          default_tasks_jsonb,
          estimated_duration,
          service_type_id,
          service_types (
            name
          )
        `)
        .eq('service_type_id', serviceTypeId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching service templates:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar templates de serviço",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      
      // Convert template tasks to component tasks format
      const templateTasks = Array.isArray(template.default_tasks_jsonb) ? template.default_tasks_jsonb : [];
      const tasks = templateTasks.map((task: any, index: number) => ({
        id: crypto.randomUUID(),
        description: task.description,
        estimated_minutes: task.estimated_minutes || 30,
        status: 'pending',
        order: task.order || index + 1,
      }));
      
      onTemplateSelect(tasks);
      
      toast({
        title: "Template aplicado",
        description: `${tasks.length} tarefas foram adicionadas do template "${template.name}"`,
      });
    }
  };

  if (!serviceTypeId) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>Selecione um tipo de serviço para ver os templates disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Plus className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p>Nenhum template encontrado para este tipo de serviço</p>
          <p className="text-sm">Você pode adicionar tarefas manualmente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Templates de Serviço
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um template para aplicar" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{template.name}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant="secondary">
                      {Array.isArray(template.default_tasks_jsonb) ? template.default_tasks_jsonb.length : 0} tarefas
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {template.estimated_duration}min
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {templates.map((template) => (
          <Card key={template.id} className="border-muted">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  Aplicar
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{Array.isArray(template.default_tasks_jsonb) ? template.default_tasks_jsonb.length : 0} tarefas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{template.estimated_duration} minutos</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  {Array.isArray(template.default_tasks_jsonb) && template.default_tasks_jsonb.slice(0, 3).map((task: any, index: number) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-4 h-4 bg-muted rounded-full flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      {task.description}
                    </div>
                  ))}
                  {Array.isArray(template.default_tasks_jsonb) && template.default_tasks_jsonb.length > 3 && (
                    <div className="text-xs text-muted-foreground ml-6">
                      +{template.default_tasks_jsonb.length - 3} mais tarefas...
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}