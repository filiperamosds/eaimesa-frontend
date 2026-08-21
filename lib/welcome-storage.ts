export const WELCOME_KEY = "eaimesa_welcome";

export type WelcomeData = {
  slug: string;
  pin: string | null;
  tableLabel: string;
};

export function readWelcomePin(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WELCOME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WelcomeData;
    if (parsed.slug !== slug || !parsed.pin || !/^\d{4}$/.test(parsed.pin)) return null;
    return parsed.pin;
  } catch {
    return null;
  }
}
