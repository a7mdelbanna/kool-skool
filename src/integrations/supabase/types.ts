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
      courses: {
        Row: {
          id: string
          lesson_type: string
          name: string
          school_id: string
        }
        Insert: {
          id?: string
          lesson_type: string
          name: string
          school_id: string
        }
        Update: {
          id?: string
          lesson_type?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string | null
          duration_days: number | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          license_key: string
          starts_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          license_key: string
          starts_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          license_key?: string
          starts_at?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          contact_info: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          license_id: string | null
          logo: string | null
          name: string
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          license_id?: string | null
          logo?: string | null
          name: string
        }
        Update: {
          contact_info?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          license_id?: string | null
          logo?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: true
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_date: string | null
          id: string
          original_date: string
          reschedule_mode: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          actual_date?: string | null
          id?: string
          original_date: string
          reschedule_mode?: string | null
          status: string
          subscription_id: string
        }
        Update: {
          actual_date?: string | null
          id?: string
          original_date?: string
          reschedule_mode?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age_group: string
          course_id: string
          created_at: string | null
          id: string
          level: string
          phone: string | null
          school_id: string
          teacher_id: string
          user_id: string
        }
        Insert: {
          age_group: string
          course_id: string
          created_at?: string | null
          id?: string
          level: string
          phone?: string | null
          school_id: string
          teacher_id: string
          user_id: string
        }
        Update: {
          age_group?: string
          course_id?: string
          created_at?: string | null
          id?: string
          level?: string
          phone?: string | null
          school_id?: string
          teacher_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          days_of_week: string[]
          duration_minutes: number
          end_date: string
          id: string
          price_per_session: number
          session_time: string
          start_date: string
          status: string
          student_id: string
        }
        Insert: {
          days_of_week: string[]
          duration_minutes: number
          end_date: string
          id?: string
          price_per_session: number
          session_time: string
          start_date: string
          status: string
          student_id: string
        }
        Update: {
          days_of_week?: string[]
          duration_minutes?: number
          end_date?: string
          id?: string
          price_per_session?: number
          session_time?: string
          start_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          password_hash: string
          role: string | null
          school_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          password_hash: string
          role?: string | null
          school_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          password_hash?: string
          role?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_team_member: {
        Args: {
          member_first_name: string
          member_last_name: string
          member_email: string
          member_role: string
          member_password: string
        }
        Returns: Json
      }
      create_course: {
        Args: {
          school_id: string
          course_name: string
          lesson_type: string
        }
        Returns: Json
      }
      create_student: {
        Args: {
          student_email: string
          student_password: string
          first_name: string
          last_name: string
          teacher_id: string
          course_id: string
          age_group: string
          level: string
          phone: string
        }
        Returns: Json
      }
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_role_constraint_values: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_students_with_details: {
        Args: {
          p_school_id: string
        }
        Returns: {
          id: string
          school_id: string
          user_id: string
          teacher_id: string
          course_id: string
          age_group: string
          level: string
          phone: string
          created_at: string
          first_name: string
          last_name: string
          email: string
          course_name: string
          lesson_type: string
        }[]
      }
      get_user_license_id: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      get_user_school_id: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      hash_password: {
        Args: {
          password: string
        }
        Returns: string
      }
      reschedule_session: {
        Args: {
          session_id: string
          new_date: string
          reschedule_mode?: string
        }
        Returns: Json
      }
      update_subscription_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_login: {
        Args: {
          user_email: string
          user_password: string
        }
        Returns: Json
      }
      verify_license_and_create_school: {
        Args: {
          license_key: string
          school_name: string
          admin_first_name: string
          admin_last_name: string
          admin_email: string
          admin_password: string
        }
        Returns: Json
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
