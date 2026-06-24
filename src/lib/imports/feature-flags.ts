export function areImportsEnabled() {
  return process.env.NEXT_PUBLIC_IMPORTS_ENABLED === "true" || process.env.IMPORTS_ENABLED === "true";
}
