import type { TransactionMutationState } from "@/lib/server/transaction-mutations";

export const initialTransactionMutationState: TransactionMutationState = {
  status: "idle",
  message: null,
};
