import { useState } from "react";
import { Plus, Clock, User, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface Task {
  id: string;
  description: string;
  estimated_minutes: number;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  completed_at?: string;
  notes?: string;
  order: number;
}

interface TaskListProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  technicians?: Array<{ id: string; full_name: string }>;
  readonly?: boolean;
}

const categoryColors = {
  preparation: "bg-blue-500",
  execution: "bg-orange-500", 
  cleanup: "bg-green-500",
  inspection: "bg-purple-500",
};

const statusLabels = {
  pending: "Pendente",
  in_progress: "Em Progresso",
  completed: "Concluída",
};

export function TaskList({ tasks, onTasksChange, technicians = [], readonly = false }: TaskListProps) {
  const [newTask, setNewTask] = useState({ description: "", estimated_minutes: 30 });
  const [isAddingTask, setIsAddingTask] = useState(false);

  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const progressPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const addTask = () => {
    if (!newTask.description.trim()) return;
    
    const task: Task = {
      id: crypto.randomUUID(),
      description: newTask.description,
      estimated_minutes: newTask.estimated_minutes,
      status: 'pending',
      order: tasks.length + 1,
    };
    
    onTasksChange([...tasks, task]);
    setNewTask({ description: "", estimated_minutes: 30 });
    setIsAddingTask(false);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            ...updates,
            completed_at: updates.status === 'completed' ? new Date().toISOString() : undefined
          }
        : task
    );
    onTasksChange(updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    onTasksChange(updatedTasks);
  };

  const toggleTaskStatus = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTask(taskId, { status: newStatus });
  };

  const totalEstimatedTime = tasks.reduce((sum, task) => sum + task.estimated_minutes, 0);
  const completedTime = tasks
    .filter(task => task.status === 'completed')
    .reduce((sum, task) => sum + task.estimated_minutes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Lista de Tarefas
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {completedTasks}/{tasks.length} concluídas
            </div>
            {!readonly && (
              <Button
                size="sm"
                onClick={() => setIsAddingTask(true)}
                disabled={isAddingTask}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Tarefa
              </Button>
            )}
          </div>
        </div>
        
        {tasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progresso geral</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tempo estimado: {totalEstimatedTime}min</span>
              <span>Concluído: {completedTime}min</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {isAddingTask && (
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Descrição da tarefa..."
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Tempo (min)"
                  value={newTask.estimated_minutes}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimated_minutes: parseInt(e.target.value) || 30 }))}
                  className="w-32"
                />
                <Button onClick={addTask} size="sm">
                  Adicionar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingTask(false)}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhuma tarefa adicionada ainda</p>
            {!readonly && (
              <p className="text-sm">Clique em "Adicionar Tarefa" para começar</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks
              .sort((a, b) => a.order - b.order)
              .map((task, index) => (
                <Card key={task.id} className={`${task.status === 'completed' ? 'bg-muted/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => !readonly && toggleTaskStatus(task.id, task.status)}
                        disabled={readonly}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.description}
                          </p>
                          {!readonly && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteTask(task.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{task.estimated_minutes}min</span>
                          </div>
                          
                          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                            {statusLabels[task.status]}
                          </Badge>
                          
                          {task.completed_at && (
                            <span className="text-xs">
                              Concluída em {new Date(task.completed_at).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>

                        {technicians.length > 0 && !readonly && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <Select
                              value={task.assigned_to || ""}
                              onValueChange={(value) => updateTask(task.id, { assigned_to: value })}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Atribuir técnico" />
                              </SelectTrigger>
                              <SelectContent>
                                {technicians.map((tech) => (
                                  <SelectItem key={tech.id} value={tech.id}>
                                    {tech.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {task.assigned_to && technicians.length > 0 && readonly && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span>
                              Atribuída para: {technicians.find(t => t.id === task.assigned_to)?.full_name}
                            </span>
                          </div>
                        )}

                        {!readonly && (
                          <Textarea
                            placeholder="Notas adicionais..."
                            value={task.notes || ""}
                            onChange={(e) => updateTask(task.id, { notes: e.target.value })}
                            className="text-sm"
                            rows={2}
                          />
                        )}

                        {task.notes && readonly && (
                          <div className="text-sm bg-muted p-2 rounded">
                            <strong>Notas:</strong> {task.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}