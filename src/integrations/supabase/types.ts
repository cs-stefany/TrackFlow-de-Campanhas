export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      copywriters: {
        Row: {
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      criativos: {
        Row: {
          archived_at: string | null
          copy_responsavel: string
          created_at: string | null
          created_by: string | null
          fonte: string
          id: string
          id_unico: string
          observacoes: string | null
          oferta_id: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          url: string | null
        }
        Insert: {
          archived_at?: string | null
          copy_responsavel: string
          created_at?: string | null
          created_by?: string | null
          fonte: string
          id?: string
          id_unico: string
          observacoes?: string | null
          oferta_id?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          archived_at?: string | null
          copy_responsavel?: string
          created_at?: string | null
          created_by?: string | null
          fonte?: string
          id?: string
          id_unico?: string
          observacoes?: string | null
          oferta_id?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "criativos_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas_diarias: {
        Row: {
          cliques: number | null
          conversoes: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          created_by: string | null
          criativo_id: string | null
          ctr: number | null
          data: string
          faturado: number | null
          fonte_dados: string | null
          ic: number | null
          id: string
          impressoes: number | null
          roas: number | null
          spend: number | null
          updated_at: string | null
        }
        Insert: {
          cliques?: number | null
          conversoes?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          created_by?: string | null
          criativo_id?: string | null
          ctr?: number | null
          data: string
          faturado?: number | null
          fonte_dados?: string | null
          ic?: number | null
          id?: string
          impressoes?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Update: {
          cliques?: number | null
          conversoes?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          created_by?: string | null
          criativo_id?: string | null
          ctr?: number | null
          data?: string
          faturado?: number | null
          fonte_dados?: string | null
          ic?: number | null
          id?: string
          impressoes?: number | null
          roas?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metricas_diarias_criativo_id_fkey"
            columns: ["criativo_id"]
            isOneToOne: false
            referencedRelation: "criativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metricas_diarias_criativo_id_fkey"
            columns: ["criativo_id"]
            isOneToOne: false
            referencedRelation: "criativos_com_medias"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas_diarias_oferta: {
        Row: {
          cliques: number | null
          conversoes: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          data: string
          faturado: number | null
          fonte_dados: string | null
          ic: number | null
          id: string
          impressoes: number | null
          lucro: number | null
          mc: number | null
          oferta_id: string | null
          roas: number | null
          spend: number | null
          thresholds_snapshot: Json
          updated_at: string | null
        }
        Insert: {
          cliques?: number | null
          conversoes?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          data: string
          faturado?: number | null
          fonte_dados?: string | null
          ic?: number | null
          id?: string
          impressoes?: number | null
          lucro?: number | null
          mc?: number | null
          oferta_id?: string | null
          roas?: number | null
          spend?: number | null
          thresholds_snapshot?: Json
          updated_at?: string | null
        }
        Update: {
          cliques?: number | null
          conversoes?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          data?: string
          faturado?: number | null
          fonte_dados?: string | null
          ic?: number | null
          id?: string
          impressoes?: number | null
          lucro?: number | null
          mc?: number | null
          oferta_id?: string | null
          roas?: number | null
          spend?: number | null
          thresholds_snapshot?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metricas_diarias_oferta_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      nichos: {
        Row: {
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      ofertas: {
        Row: {
          archived_at: string | null
          created_at: string | null
          data: string
          id: string
          nicho: string
          nome: string
          pais: string
          status: string | null
          thresholds: Json | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          data: string
          id?: string
          nicho: string
          nome: string
          pais: string
          status?: string | null
          thresholds?: Json | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          data?: string
          id?: string
          nicho?: string
          nome?: string
          pais?: string
          status?: string | null
          thresholds?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      paises: {
        Row: {
          codigo: string | null
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          codigo?: string | null
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      criativos_com_medias: {
        Row: {
          cpc_3d: number | null
          cpc_7d: number | null
          cpc_hoje: number | null
          faturado_3d: number | null
          faturado_7d: number | null
          faturado_hoje: number | null
          fonte: string | null
          ic_3d: number | null
          ic_7d: number | null
          ic_hoje: number | null
          id: string | null
          id_unico: string | null
          oferta_id: string | null
          roas_3d: number | null
          roas_7d: number | null
          roas_hoje: number | null
          spend_3d: number | null
          spend_7d: number | null
          spend_hoje: number | null
          status: string | null
          tendencia_roas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "criativos_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fnc_recalcular_metricas_oferta_dia: {
        Args: { p_data: string; p_oferta_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
