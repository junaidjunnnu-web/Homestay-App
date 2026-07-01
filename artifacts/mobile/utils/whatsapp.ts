import { Linking } from "react-native";

export function normalizePhone(raw: string | number | undefined | null): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  return digits.startsWith("91") ? digits : `91${digits}`;
}

export function openWhatsApp(rawPhone: string | number | undefined | null, message: string): void {
  const mobile = normalizePhone(rawPhone);
  if (!mobile) return;
  Linking.openURL(`https://wa.me/${mobile}?text=${encodeURIComponent(message)}`).catch(() => {});
}
