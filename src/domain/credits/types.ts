export type CreditReason =
  | "welcome_grant"
  | "entry_created"
  | "recurring_entry_created"
  | "rewarded_message"
  | "credit_pack_purchase"
  | "unlimited_started"
  | "unlimited_renewed"
  | "admin_adjustment"
  | "refund_adjustment";

export type CreditAccount = {
  userId: string;
  creditBalance: number;
  recurringGraceDebt: number;
  unlimitedUntil: string | null;
  lowBalanceNotice10ShownAt: string | null;
  lowBalanceNotice3ShownAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreditChargeFailureCode = "insufficient_credits" | "credit_account_unavailable" | "entry_save_failed";

export class CreditChargeError extends Error {
  code: CreditChargeFailureCode;

  constructor(code: CreditChargeFailureCode, message: string) {
    super(message);
    this.name = "CreditChargeError";
    this.code = code;
  }
}
