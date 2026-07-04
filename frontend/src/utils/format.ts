export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function formatPhoneNumber(phone: string): string {
  // Simple format helper
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
}
