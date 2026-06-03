export type AccountHintUser = {
  email?: string | null;
  id?: string | null;
};

export function getAccountHint(user: AccountHintUser | null | undefined) {
  const email = typeof user?.email === "string" ? user.email.trim() : "";

  if (email) {
    return email;
  }

  const id = typeof user?.id === "string" ? user.id.trim() : "";

  if (id) {
    return `account ${id.slice(0, 8)}`;
  }

  return "account unknown";
}
