import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'confirmation' | 'reminder' | 'cancellation' | 'update';
  appointment: {
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    observations?: string;
  };
  customer: {
    full_name: string;
    email: string;
  };
  technician: {
    full_name: string;
  };
  service: {
    name: string;
  };
}

const getEmailTemplate = (data: NotificationRequest) => {
  const { type, appointment, customer, technician, service } = data;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const templates = {
    confirmation: {
      subject: 'Agendamento Confirmado - Exclusive Piscinas',
      html: `
        <h2>Olá, ${customer.full_name}!</h2>
        <p>Seu agendamento foi confirmado com sucesso:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Detalhes do Agendamento</h3>
          <p><strong>Serviço:</strong> ${service.name}</p>
          <p><strong>Data e Horário:</strong> ${formatDate(appointment.start_time)}</p>
          <p><strong>Técnico:</strong> ${technician.full_name}</p>
          ${appointment.observations ? `<p><strong>Observações:</strong> ${appointment.observations}</p>` : ''}
        </div>
        <p>Em caso de dúvidas, entre em contato conosco.</p>
        <p>Atenciosamente,<br>Equipe Exclusive Piscinas</p>
      `
    },
    reminder: {
      subject: 'Lembrete: Agendamento Amanhã - Exclusive Piscinas',
      html: `
        <h2>Olá, ${customer.full_name}!</h2>
        <p>Este é um lembrete do seu agendamento para amanhã:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Detalhes do Agendamento</h3>
          <p><strong>Serviço:</strong> ${service.name}</p>
          <p><strong>Data e Horário:</strong> ${formatDate(appointment.start_time)}</p>
          <p><strong>Técnico:</strong> ${technician.full_name}</p>
        </div>
        <p>Por favor, certifique-se de que haverá alguém no local no horário marcado.</p>
        <p>Atenciosamente,<br>Equipe Exclusive Piscinas</p>
      `
    },
    cancellation: {
      subject: 'Agendamento Cancelado - Exclusive Piscinas',
      html: `
        <h2>Olá, ${customer.full_name}!</h2>
        <p>Informamos que o seguinte agendamento foi cancelado:</p>
        <div style="background: #fee; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Agendamento Cancelado</h3>
          <p><strong>Serviço:</strong> ${service.name}</p>
          <p><strong>Data e Horário:</strong> ${formatDate(appointment.start_time)}</p>
        </div>
        <p>Para reagendar, entre em contato conosco.</p>
        <p>Atenciosamente,<br>Equipe Exclusive Piscinas</p>
      `
    },
    update: {
      subject: 'Agendamento Atualizado - Exclusive Piscinas',
      html: `
        <h2>Olá, ${customer.full_name}!</h2>
        <p>Seu agendamento foi atualizado:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Novos Detalhes</h3>
          <p><strong>Serviço:</strong> ${service.name}</p>
          <p><strong>Data e Horário:</strong> ${formatDate(appointment.start_time)}</p>
          <p><strong>Técnico:</strong> ${technician.full_name}</p>
          ${appointment.observations ? `<p><strong>Observações:</strong> ${appointment.observations}</p>` : ''}
        </div>
        <p>Em caso de dúvidas, entre em contato conosco.</p>
        <p>Atenciosamente,<br>Equipe Exclusive Piscinas</p>
      `
    }
  };

  return templates[type];
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: NotificationRequest = await req.json();
    
    if (!data.customer.email) {
      throw new Error("Customer email is required");
    }

    const template = getEmailTemplate(data);
    
    const emailResponse = await resend.emails.send({
      from: "Exclusive Piscinas <agendamentos@exclusivepiscinas.com>",
      to: [data.customer.email],
      subject: template.subject,
      html: template.html,
    });

    console.log("Notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);