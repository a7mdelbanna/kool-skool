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
      accounts: {
        Row: {
          account_number: string | null
          color: string
          created_at: string
          currency_id: string
          exclude_from_stats: boolean
          id: string
          is_archived: boolean
          name: string
          school_id: string
          type: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          color?: string
          created_at?: string
          currency_id: string
          exclude_from_stats?: boolean
          id?: string
          is_archived?: boolean
          name: string
          school_id: string
          type: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          color?: string
          created_at?: string
          currency_id?: string
          exclude_from_stats?: boolean
          id?: string
          is_archived?: boolean
          name?: string
          school_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "transaction_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_types: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          school_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          school_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          school_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          id: string
          lesson_type: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_type: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_type?: string
          name?: string
          school_id?: string
          updated_at?: string
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
      currencies: {
        Row: {
          code: string
          created_at: string
          exchange_rate: number
          id: string
          is_default: boolean
          name: string
          school_id: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          exchange_rate?: number
          id?: string
          is_default?: boolean
          name: string
          school_id: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          exchange_rate?: number
          id?: string
          is_default?: boolean
          name?: string
          school_id?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "currencies_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          category_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category: string
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          payment_method: string
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_sessions: {
        Row: {
          cost: number
          counts_toward_completion: boolean | null
          created_at: string
          duration_minutes: number | null
          id: string
          index_in_sub: number | null
          moved_from_session_id: string | null
          notes: string | null
          original_session_index: number | null
          payment_status: string
          scheduled_date: string
          status: string
          student_id: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          cost: number
          counts_toward_completion?: boolean | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          index_in_sub?: number | null
          moved_from_session_id?: string | null
          notes?: string | null
          original_session_index?: number | null
          payment_status?: string
          scheduled_date: string
          status?: string
          student_id: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          cost?: number
          counts_toward_completion?: boolean | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          index_in_sub?: number | null
          moved_from_session_id?: string | null
          notes?: string | null
          original_session_index?: number | null
          payment_status?: string
          scheduled_date?: string
          status?: string
          student_id?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_sessions_moved_from_session_id_fkey"
            columns: ["moved_from_session_id"]
            isOneToOne: false
            referencedRelation: "lesson_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_sessions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string
          duration_days: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          license_key: string
        }
        Insert: {
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          license_key: string
        }
        Update: {
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          license_key?: string
        }
        Relationships: []
      }
      payment_tags: {
        Row: {
          created_at: string
          id: string
          payment_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_tags_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "student_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "transaction_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          contact_info: Json | null
          created_at: string
          id: string
          license_id: string | null
          logo: string | null
          name: string
          updated_at: string
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string
          id?: string
          license_id?: string | null
          logo?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          contact_info?: Json | null
          created_at?: string
          id?: string
          license_id?: string | null
          logo?: string | null
          name?: string
          updated_at?: string
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
      student_payments: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age_group: string | null
          course_id: string | null
          created_at: string
          id: string
          level: string | null
          next_payment_amount: number | null
          next_payment_date: string | null
          phone: string | null
          school_id: string
          teacher_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_group?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          level?: string | null
          next_payment_amount?: number | null
          next_payment_date?: string | null
          phone?: string | null
          school_id: string
          teacher_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_group?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          level?: string | null
          next_payment_amount?: number | null
          next_payment_date?: string | null
          phone?: string | null
          school_id?: string
          teacher_id?: string | null
          updated_at?: string
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
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          currency: string
          duration_months: number
          end_date: string | null
          fixed_price: number | null
          id: string
          notes: string | null
          price_mode: string
          price_per_session: number | null
          schedule: Json
          session_count: number
          sessions_completed: number | null
          start_date: string
          status: string
          student_id: string
          total_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          duration_months: number
          end_date?: string | null
          fixed_price?: number | null
          id?: string
          notes?: string | null
          price_mode: string
          price_per_session?: number | null
          schedule: Json
          session_count: number
          sessions_completed?: number | null
          start_date: string
          status?: string
          student_id: string
          total_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          duration_months?: number
          end_date?: string | null
          fixed_price?: number | null
          id?: string
          notes?: string | null
          price_mode?: string
          price_per_session?: number | null
          schedule?: Json
          session_count?: number
          sessions_completed?: number | null
          start_date?: string
          status?: string
          student_id?: string
          total_price?: number
          updated_at?: string
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
      transaction_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          school_id: string
          type: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          school_id: string
          type: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          school_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_tags_junction: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_junction_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "transaction_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_junction_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          description: string
          from_account_id: string | null
          id: string
          is_recurring: boolean | null
          notes: string | null
          parent_transaction_id: string | null
          payment_method: string | null
          receipt_number: string | null
          receipt_url: string | null
          recurring_end_date: string | null
          recurring_frequency: string | null
          school_id: string
          status: string
          subscription_id: string | null
          tax_amount: number | null
          tax_rate: number | null
          to_account_id: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description: string
          from_account_id?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          school_id: string
          status?: string
          subscription_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          to_account_id?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          from_account_id?: string | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          parent_transaction_id?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          school_id?: string
          status?: string
          subscription_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          to_account_id?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          category_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          description: string
          from_account: string
          from_account_id: string | null
          id: string
          notes: string | null
          school_id: string
          status: string
          to_account: string
          to_account_id: string | null
          transfer_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description: string
          from_account: string
          from_account_id?: string | null
          id?: string
          notes?: string | null
          school_id: string
          status?: string
          to_account: string
          to_account_id?: string | null
          transfer_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          from_account?: string
          from_account_id?: string | null
          id?: string
          notes?: string | null
          school_id?: string
          status?: string
          to_account?: string
          to_account_id?: string | null
          transfer_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          password_hash: string | null
          phone: string | null
          role: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          password_hash?: string | null
          phone?: string | null
          role: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          password_hash?: string | null
          phone?: string | null
          role?: string
          school_id?: string | null
          updated_at?: string
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
      add_payment_tag: {
        Args: { p_payment_id: string; p_tag_id: string }
        Returns: Json
      }
      add_student_subscription: {
        Args:
          | {
              p_student_id: string
              p_session_count: number
              p_duration_months: number
              p_start_date: string
              p_schedule: Json
              p_price_mode: string
              p_price_per_session: number
              p_fixed_price: number
              p_total_price: number
              p_currency: string
              p_notes: string
              p_status: string
              p_current_user_id: string
              p_current_school_id: string
            }
          | {
              p_student_id: string
              p_session_count: number
              p_duration_months: number
              p_start_date: string
              p_schedule: Json
              p_price_mode: string
              p_price_per_session: number
              p_fixed_price: number
              p_total_price: number
              p_currency: string
              p_notes: string
              p_status: string
              p_current_user_id: string
              p_current_school_id: string
              p_initial_payment_amount?: number
              p_payment_method?: string
              p_payment_notes?: string
            }
        Returns: {
          id: string
          student_id: string
          session_count: number
          duration_months: number
          start_date: string
          schedule: Json
          price_mode: string
          price_per_session: number
          fixed_price: number
          total_price: number
          currency: string
          notes: string
          status: string
          created_at: string
        }[]
      }
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
      calculate_next_payment_info: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      create_default_categories: {
        Args: { p_school_id: string }
        Returns: undefined
      }
      create_student: {
        Args:
          | {
              student_email: string
              student_password: string
              student_first_name: string
              student_last_name: string
              teacher_id: string
              course_id: string
              age_group: string
              level: string
              phone?: string
            }
          | {
              student_email: string
              student_password: string
              student_first_name: string
              student_last_name: string
              teacher_id: string
              course_id: string
              age_group: string
              level: string
              phone?: string
              current_user_id?: string
            }
        Returns: Json
      }
      create_transaction: {
        Args: {
          p_school_id: string
          p_type: string
          p_amount: number
          p_currency: string
          p_transaction_date: string
          p_description: string
          p_notes?: string
          p_contact_id?: string
          p_category_id?: string
          p_from_account_id?: string
          p_to_account_id?: string
          p_payment_method?: string
          p_receipt_number?: string
          p_receipt_url?: string
          p_tax_amount?: number
          p_tax_rate?: number
          p_is_recurring?: boolean
          p_recurring_frequency?: string
          p_recurring_end_date?: string
          p_tag_ids?: string[]
        }
        Returns: string
      }
      delete_course: {
        Args: { p_course_id: string }
        Returns: undefined
      }
      delete_student_payment: {
        Args: {
          p_payment_id: string
          p_current_user_id: string
          p_current_school_id: string
        }
        Returns: Json
      }
      delete_student_subscription: {
        Args: { p_subscription_id: string }
        Returns: Json
      }
      get_category_path: {
        Args: { category_id: string }
        Returns: string
      }
      get_contact_with_tags: {
        Args: { p_contact_id: string }
        Returns: {
          id: string
          name: string
          type: string
          email: string
          phone: string
          notes: string
          created_at: string
          tags: Json
        }[]
      }
      get_current_user_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_school_id: string
          user_role: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_school_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_lesson_sessions: {
        Args: { p_student_id: string }
        Returns: {
          id: string
          subscription_id: string
          student_id: string
          scheduled_date: string
          duration_minutes: number
          status: string
          payment_status: string
          cost: number
          notes: string
          created_at: string
          index_in_sub: number
          counts_toward_completion: boolean
          original_session_index: number
          moved_from_session_id: string
        }[]
      }
      get_payment_with_tags: {
        Args: { p_payment_id: string }
        Returns: {
          id: string
          student_id: string
          amount: number
          currency: string
          payment_date: string
          payment_method: string
          status: string
          notes: string
          created_at: string
          tags: Json
        }[]
      }
      get_role_constraint_values: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_school_accounts: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          name: string
          type: string
          account_number: string
          color: string
          exclude_from_stats: boolean
          is_archived: boolean
          created_at: string
          currency_id: string
          currency_name: string
          currency_symbol: string
          currency_code: string
        }[]
      }
      get_school_categories: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          name: string
          type: string
          color: string
          parent_id: string
          is_active: boolean
          created_at: string
          full_path: string
          level: number
        }[]
      }
      get_school_contact_types: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          name: string
          color: string
          is_active: boolean
          created_at: string
        }[]
      }
      get_school_contacts: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          name: string
          type: string
          email: string
          phone: string
          notes: string
          created_at: string
          tag_count: number
        }[]
      }
      get_school_courses: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          school_id: string
          name: string
          lesson_type: string
          created_at: string
          updated_at: string
        }[]
      }
      get_school_currencies: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          name: string
          symbol: string
          code: string
          exchange_rate: number
          is_default: boolean
          created_at: string
        }[]
      }
      get_school_tags: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          name: string
          color: string
          created_at: string
          usage_count: number
        }[]
      }
      get_school_transactions: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          type: string
          amount: number
          currency: string
          transaction_date: string
          description: string
          notes: string
          status: string
          contact_name: string
          contact_type: string
          category_name: string
          category_full_path: string
          from_account_name: string
          to_account_name: string
          payment_method: string
          receipt_number: string
          receipt_url: string
          tax_amount: number
          tax_rate: number
          is_recurring: boolean
          recurring_frequency: string
          created_at: string
          tags: Json
        }[]
      }
      get_student_payments: {
        Args: { p_student_id: string }
        Returns: {
          id: string
          student_id: string
          amount: number
          currency: string
          payment_date: string
          payment_method: string
          status: string
          notes: string
          created_at: string
        }[]
      }
      get_student_subscriptions: {
        Args: { p_student_id: string }
        Returns: {
          id: string
          student_id: string
          session_count: number
          duration_months: number
          start_date: string
          schedule: Json
          price_mode: string
          price_per_session: number
          fixed_price: number
          total_price: number
          currency: string
          notes: string
          status: string
          created_at: string
        }[]
      }
      get_students_with_details: {
        Args: { p_school_id: string }
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
          teacher_first_name: string
          teacher_last_name: string
          teacher_email: string
          payment_status: string
          lessons_count: number
          next_session_date: string
          next_payment_date: string
          next_payment_amount: number
          subscription_progress: string
        }[]
      }
      get_subscription_payment_status: {
        Args: { p_subscription_id: string }
        Returns: {
          total_paid: number
          total_due: number
          payment_status: string
        }[]
      }
      get_team_members: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          first_name: string
          last_name: string
          email: string
          role: string
          created_at: string
        }[]
      }
      get_transactions_with_contacts: {
        Args: { p_school_id: string }
        Returns: {
          id: string
          type: string
          amount: number
          currency: string
          transaction_date: string
          description: string
          contact_name: string
          contact_type: string
          status: string
          created_at: string
        }[]
      }
      handle_session_action: {
        Args: {
          p_session_id: string
          p_action: string
          p_new_datetime?: string
        }
        Returns: Json
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      recalculate_subscription_progress: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
      remove_payment_tag: {
        Args: { p_payment_id: string; p_tag_id: string }
        Returns: Json
      }
      set_default_currency: {
        Args: { p_currency_id: string; p_school_id: string }
        Returns: Json
      }
      update_course: {
        Args: { p_course_id: string; p_name: string; p_lesson_type: string }
        Returns: undefined
      }
      user_login: {
        Args: { user_email: string; user_password: string }
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
    Enums: {},
  },
} as const
