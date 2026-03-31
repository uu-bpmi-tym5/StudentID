export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      attendance_logs: {
        Row: {
          card_uid: string
          created_at: string
          event_id: string | null
          id: string
          profile_id: string | null
          scanned_at: string
          tapper_id: string
        }
        Insert: {
          card_uid: string
          created_at?: string
          event_id?: string | null
          id?: string
          profile_id?: string | null
          scanned_at: string
          tapper_id: string
        }
        Update: {
          card_uid?: string
          created_at?: string
          event_id?: string | null
          id?: string
          profile_id?: string | null
          scanned_at?: string
          tapper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_attendance_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "attendance_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_enrollments: {
        Row: {
          event_id: string
          id: string
          profile_id: string
        }
        Insert: {
          event_id: string
          id?: string
          profile_id: string
        }
        Update: {
          event_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_enrollments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_attendance_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_enrollments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_enrollments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          id: string
          is_active: boolean
          starts_at: string
          tapper_id: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ends_at: string
          id?: string
          is_active?: boolean
          starts_at: string
          tapper_id: string
          title: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean
          starts_at?: string
          tapper_id?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tapper_id_fkey"
            columns: ["tapper_id"]
            isOneToOne: false
            referencedRelation: "tappers"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_cards: {
        Row: {
          card_uid: string
          id: string
          is_active: boolean
          label: string | null
          profile_id: string
          registered_at: string
        }
        Insert: {
          card_uid: string
          id?: string
          is_active?: boolean
          label?: string | null
          profile_id: string
          registered_at?: string
        }
        Update: {
          card_uid?: string
          id?: string
          is_active?: boolean
          label?: string | null
          profile_id?: string
          registered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfc_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          student_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          student_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          student_id?: string | null
        }
        Relationships: []
      }
      tappers: {
        Row: {
          id: string
          is_online: boolean
          last_seen_at: string | null
          location: string | null
          name: string
        }
        Insert: {
          id: string
          is_online?: boolean
          last_seen_at?: string | null
          location?: string | null
          name: string
        }
        Update: {
          id?: string
          is_online?: boolean
          last_seen_at?: string | null
          location?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      event_attendance_summary: {
        Row: {
          attendance_pct: number | null
          attended_count: number | null
          ends_at: string | null
          enrolled_count: number | null
          event_id: string | null
          starts_at: string | null
          tapper_id: string | null
          title: string | null
          type: Database["public"]["Enums"]["event_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tapper_id_fkey"
            columns: ["tapper_id"]
            isOneToOne: false
            referencedRelation: "tappers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      event_type: "exam" | "lecture" | "lab" | "other"
      user_role: "admin" | "teacher" | "student"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      event_type: ["exam", "lecture", "lab", "other"],
      user_role: ["admin", "teacher", "student"],
    },
  },
} as const

// ─── Convenience type aliases ───────────────────────────────────────────────
export type UserRole = Database["public"]["Enums"]["user_role"];
export type EventType = Database["public"]["Enums"]["event_type"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type NfcCard = Database["public"]["Tables"]["nfc_cards"]["Row"];
export type Tapper = Database["public"]["Tables"]["tappers"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventEnrollment = Database["public"]["Tables"]["event_enrollments"]["Row"];
export type AttendanceLog = Database["public"]["Tables"]["attendance_logs"]["Row"];
