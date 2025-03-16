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
      licenses: {
        Row: {
          created_at: string | null
          duration_days: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          license_number: string
          school_name: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          duration_days: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          license_number: string
          school_name?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string
          school_name?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          instagram: string | null
          last_name: string | null
          phone: string | null
          profile_picture: string | null
          role: string
          school_id: string | null
          telegram: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          instagram?: string | null
          last_name?: string | null
          phone?: string | null
          profile_picture?: string | null
          role: string
          school_id?: string | null
          telegram?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          instagram?: string | null
          last_name?: string | null
          phone?: string | null
          profile_picture?: string | null
          role?: string
          school_id?: string | null
          telegram?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_schools"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          instagram: string | null
          license_id: string | null
          logo: string | null
          name: string
          phone: string | null
          telegram: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          instagram?: string | null
          license_id?: string | null
          logo?: string | null
          name: string
          phone?: string | null
          telegram?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          instagram?: string | null
          license_id?: string | null
          logo?: string | null
          name?: string
          phone?: string | null
          telegram?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_school_and_update_profile_rpc: {
        Args: {
          school_name: string
          license_number: string
        }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      get_user_school_id: {
        Args: {
          user_id_param: string
        }
        Returns: {
          school_id: string
        }[]
      }
      handle_license_signup: {
        Args: {
          license_number: string
        }
        Returns: {
          valid: boolean
          message: string
          license_id: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_in_school: {
        Args: {
          user_id_param: string
        }
        Returns: boolean
      }
      save_school_details: {
        Args: {
          user_id_param: string
          school_name_param: string
          school_logo_param: string
          school_phone_param: string
          school_telegram_param: string
          school_whatsapp_param: string
          school_instagram_param: string
        }
        Returns: string
      }
      update_user_profile: {
        Args: {
          user_id: string
          first_name_param: string
          last_name_param: string
          phone_param: string
          profile_picture_param: string
          telegram_param: string
          whatsapp_param: string
          instagram_param: string
        }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
