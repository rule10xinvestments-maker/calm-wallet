export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CategoryDirection = "expense" | "income" | "both";
export type OnboardingState = "pending" | "completed";
export type TransactionType = "expense" | "income";
export type TransactionSource = "manual" | "receipt_image" | "csv_import";
export type ReviewState = "reviewed" | "pending_review" | "needs_attention";
export type TransactionEventActorType = "user" | "ai" | "system";
export type TransactionEventType = "created" | "updated" | "recategorized" | "soft_deleted" | "restored";
export type PolicyOutcome = "allowed" | "denied" | "invalid";
export type ImportType = "receipt_image" | "csv_import";
export type ImportRecordStatus = "uploaded" | "parsing" | "parsed" | "failed" | "reviewed";
export type ParseQuality = "unknown" | "low" | "medium" | "high";
export type AcceptanceState = "pending" | "accepted" | "rejected";
export type UserCategorySignalType = "merchant" | "phrase" | "import_description";
export type RecurringFrequency = "weekly" | "monthly" | "yearly";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          locale: string;
          timezone: string;
          default_currency: string;
          onboarding_state: OnboardingState;
          notifications_opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          locale?: string;
          timezone?: string;
          default_currency?: string;
          onboarding_state?: OnboardingState;
          notifications_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          locale?: string;
          timezone?: string;
          default_currency?: string;
          onboarding_state?: OnboardingState;
          notifications_opt_in?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      fx_rates: {
        Row: {
          id: string;
          base_currency: string;
          quote_currency: string;
          rate: number;
          rate_date: string;
          source: string;
          fetched_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          base_currency: string;
          quote_currency: string;
          rate: number;
          rate_date: string;
          source: string;
          fetched_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          base_currency?: string;
          quote_currency?: string;
          rate?: number;
          rate_date?: string;
          source?: string;
          fetched_at?: string;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          label: string;
          direction: CategoryDirection;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          label: string;
          direction: CategoryDirection;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          label?: string;
          direction?: CategoryDirection;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      recurring_rules: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: TransactionType;
          amount_minor: number;
          currency: string;
          category_id: string | null;
          merchant: string | null;
          note: string | null;
          frequency: RecurringFrequency;
          start_date: string;
          end_date: string | null;
          next_occurrence_date: string;
          paused_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_type: TransactionType;
          amount_minor: number;
          currency: string;
          category_id?: string | null;
          merchant?: string | null;
          note?: string | null;
          frequency: RecurringFrequency;
          start_date: string;
          end_date?: string | null;
          next_occurrence_date: string;
          paused_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?: TransactionType;
          amount_minor?: number;
          currency?: string;
          category_id?: string | null;
          merchant?: string | null;
          note?: string | null;
          frequency?: RecurringFrequency;
          start_date?: string;
          end_date?: string | null;
          next_occurrence_date?: string;
          paused_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: TransactionType;
          amount_minor: number;
          currency: string;
          occurred_at: string;
          category_id: string | null;
          item_name: string | null;
          merchant: string | null;
          note: string | null;
          source: TransactionSource;
          review_state: ReviewState;
          uncertainty_reason: string | null;
          import_record_id: string | null;
          import_candidate_id: string | null;
          recurring_rule_id: string | null;
          recurring_occurrence_date: string | null;
          deleted_at: string | null;
          deleted_forever_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_type: TransactionType;
          amount_minor: number;
          currency: string;
          occurred_at: string;
          category_id?: string | null;
          item_name?: string | null;
          merchant?: string | null;
          note?: string | null;
          source: TransactionSource;
          review_state?: ReviewState;
          uncertainty_reason?: string | null;
          import_record_id?: string | null;
          import_candidate_id?: string | null;
          recurring_rule_id?: string | null;
          recurring_occurrence_date?: string | null;
          deleted_at?: string | null;
          deleted_forever_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?: TransactionType;
          amount_minor?: number;
          currency?: string;
          occurred_at?: string;
          category_id?: string | null;
          item_name?: string | null;
          merchant?: string | null;
          note?: string | null;
          source?: TransactionSource;
          review_state?: ReviewState;
          uncertainty_reason?: string | null;
          import_record_id?: string | null;
          import_candidate_id?: string | null;
          recurring_rule_id?: string | null;
          recurring_occurrence_date?: string | null;
          deleted_at?: string | null;
          deleted_forever_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transaction_events: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          actor_type: TransactionEventActorType;
          event_type: TransactionEventType;
          before_json: Json | null;
          after_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id: string;
          actor_type: TransactionEventActorType;
          event_type: TransactionEventType;
          before_json?: Json | null;
          after_json?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string;
          actor_type?: TransactionEventActorType;
          event_type?: TransactionEventType;
          before_json?: Json | null;
          after_json?: Json | null;
          created_at?: string;
        };
      };
      ai_action_logs: {
        Row: {
          id: string;
          user_id: string;
          tool_name: string;
          raw_payload: Json;
          validated_payload: Json | null;
          policy_outcome: PolicyOutcome;
          result_summary: string | null;
          error_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tool_name: string;
          raw_payload?: Json;
          validated_payload?: Json | null;
          policy_outcome: PolicyOutcome;
          result_summary?: string | null;
          error_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tool_name?: string;
          raw_payload?: Json;
          validated_payload?: Json | null;
          policy_outcome?: PolicyOutcome;
          result_summary?: string | null;
          error_code?: string | null;
          created_at?: string;
        };
      };
      import_records: {
        Row: {
          id: string;
          user_id: string;
          import_type: ImportType;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          status: ImportRecordStatus;
          parse_quality: ParseQuality;
          failure_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          import_type: ImportType;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          status?: ImportRecordStatus;
          parse_quality?: ParseQuality;
          failure_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          import_type?: ImportType;
          storage_path?: string;
          original_filename?: string;
          mime_type?: string;
          status?: ImportRecordStatus;
          parse_quality?: ParseQuality;
          failure_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      import_candidates: {
        Row: {
          id: string;
          user_id: string;
          import_record_id: string;
          transaction_type: TransactionType | null;
          amount_minor: number | null;
          currency: string | null;
          occurred_at: string | null;
          description: string | null;
          merchant_guess: string | null;
          category_id: string | null;
          confidence_score: number | null;
          review_state: ReviewState;
          acceptance_state: AcceptanceState;
          accepted_transaction_id: string | null;
          uncertainty_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          import_record_id: string;
          transaction_type?: TransactionType | null;
          amount_minor?: number | null;
          currency?: string | null;
          occurred_at?: string | null;
          description?: string | null;
          merchant_guess?: string | null;
          category_id?: string | null;
          confidence_score?: number | null;
          review_state?: ReviewState;
          acceptance_state?: AcceptanceState;
          accepted_transaction_id?: string | null;
          uncertainty_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          import_record_id?: string;
          transaction_type?: TransactionType | null;
          amount_minor?: number | null;
          currency?: string | null;
          occurred_at?: string | null;
          description?: string | null;
          merchant_guess?: string | null;
          category_id?: string | null;
          confidence_score?: number | null;
          review_state?: ReviewState;
          acceptance_state?: AcceptanceState;
          accepted_transaction_id?: string | null;
          uncertainty_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_category_memory: {
        Row: {
          id: string;
          user_id: string;
          signal_type: UserCategorySignalType;
          signal_value: string;
          preferred_transaction_type: TransactionType | null;
          preferred_category_id: string;
          strength: number;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          signal_type: UserCategorySignalType;
          signal_value: string;
          preferred_transaction_type?: TransactionType | null;
          preferred_category_id: string;
          strength?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          signal_type?: UserCategorySignalType;
          signal_value?: string;
          preferred_transaction_type?: TransactionType | null;
          preferred_category_id?: string;
          strength?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          month_start: string;
          category_id: string;
          amount_minor: number;
          currency: string;
          period: "weekly" | "monthly";
          repeats: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month_start: string;
          category_id: string;
          amount_minor: number;
          currency: string;
          period?: "weekly" | "monthly";
          repeats?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month_start?: string;
          category_id?: string;
          amount_minor?: number;
          currency?: string;
          period?: "weekly" | "monthly";
          repeats?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          user_id: string;
          daily_reminder_enabled: boolean;
          monthly_review_enabled: boolean;
          overspending_enabled: boolean;
          unusual_spending_enabled: boolean;
          savings_opportunities_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          daily_reminder_enabled?: boolean;
          monthly_review_enabled?: boolean;
          overspending_enabled?: boolean;
          unusual_spending_enabled?: boolean;
          savings_opportunities_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          daily_reminder_enabled?: boolean;
          monthly_review_enabled?: boolean;
          overspending_enabled?: boolean;
          unusual_spending_enabled?: boolean;
          savings_opportunities_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          disabled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          disabled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          disabled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
