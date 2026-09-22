/** Masks all but the last 3 digits of a phone number for safe logging. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 3) return "***";
  return `***${digits.slice(-3)}`;
}
