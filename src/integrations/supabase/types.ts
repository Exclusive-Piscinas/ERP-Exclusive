export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          end_time: string
          id: string
          observations: string | null
          pool_id: string | null
          service_type_id: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          technician_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id: string
          end_time: string
          id?: string
          observations?: string | null
          pool_id?: string | null
          service_type_id: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          technician_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          end_time?: string
          id?: string
          observations?: string | null
          pool_id?: string | null
          service_type_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          created_at: string
          created_by: string
          document: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          observations: string | null
          person_type: Database["public"]["Enums"]["person_type"]
          phone: string
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          created_by: string
          document: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          observations?: string | null
          person_type: Database["public"]["Enums"]["person_type"]
          phone: string
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          created_at?: string
          created_by?: string
          document?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          observations?: string | null
          person_type?: Database["public"]["Enums"]["person_type"]
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      pools: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          depth: number | null
          filtration_system: string | null
          id: string
          is_active: boolean
          last_maintenance: string | null
          length: number | null
          observations: string | null
          type: Database["public"]["Enums"]["pool_type"]
          updated_at: string
          volume: number | null
          width: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id: string
          depth?: number | null
          filtration_system?: string | null
          id?: string
          is_active?: boolean
          last_maintenance?: string | null
          length?: number | null
          observations?: string | null
          type: Database["public"]["Enums"]["pool_type"]
          updated_at?: string
          volume?: number | null
          width?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          depth?: number | null
          filtration_system?: string | null
          id?: string
          is_active?: boolean
          last_maintenance?: string | null
          length?: number | null
          observations?: string | null
          type?: Database["public"]["Enums"]["pool_type"]
          updated_at?: string
          volume?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pools_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_types: {
        Row: {
          created_at: string
          estimated_duration: number
          id: string
          is_active: boolean
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_duration: number
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_duration?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      technicians: {
        Row: {
          availability: Json | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          specialties: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: Json | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          specialties?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: Json | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          specialties?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      appointment_status:
        | "agendado"
        | "confirmado"
        | "em_execucao"
        | "concluido"
        | "cancelado"
      person_type: "fisica" | "juridica"
      pool_type: "fibra" | "alvenaria" | "vinil"
      user_role: "admin" | "gerente" | "tecnico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "agendado",
        "confirmado",
        "em_execucao",
        "concluido",
        "cancelado",
      ],
      person_type: ["fisica", "juridica"],
      pool_type: ["fibra", "alvenaria", "vinil"],
      user_role: ["admin", "gerente", "tecnico"],
    },
  },
} as const
