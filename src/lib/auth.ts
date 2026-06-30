// Phone-number + password auth built on Supabase's email/password provider.
//
// Supabase's *native* phone auth requires a paid SMS provider to send OTP codes.
// To keep this free for personal use, we treat the phone number as a username:
// it's normalised to digits and mapped to a synthetic internal email address.
// Users only ever see / type their phone number and a password.
const SYNTHETIC_DOMAIN = 'phone.qaza.app'

/** Strip everything except digits, so "+92 300 1234567" and "+923001234567" match. */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, '')
}

/** Map a phone number to the synthetic email used as the Supabase login id. */
export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@${SYNTHETIC_DOMAIN}`
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone)
  return digits.length >= 7 && digits.length <= 15
}

/** Best-effort display of the phone number stored at sign-up. */
export function phoneFromSession(meta: unknown, email: string | undefined): string {
  if (meta && typeof meta === 'object' && 'phone' in meta) {
    const p = (meta as Record<string, unknown>).phone
    if (typeof p === 'string' && p) return p
  }
  return email ? email.split('@')[0] : ''
}
