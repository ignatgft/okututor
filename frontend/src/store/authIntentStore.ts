const KEY = "okututor:contactIntent";

export interface ContactIntent {
  tutorId: string;
  tutorSlug?: string;
  returnUrl: string;
  action: "OPEN_CHAT";
  source: string; // page where contact was clicked
  createdAt: number;
}

export function saveContactIntent(intent: ContactIntent): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(intent));
  } catch {}
}

export function getContactIntent(): ContactIntent | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContactIntent;
    // expire after 30 min
    if (Date.now() - parsed.createdAt > 30 * 60 * 1000) {
      clearContactIntent();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearContactIntent(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

export function navigateWithIntent(
  navigate: (to: string) => void,
  intent: Omit<ContactIntent, "createdAt">
): void {
  saveContactIntent({ ...intent, createdAt: Date.now() });
  navigate("/login");
}

export function restoreAuthIntent(navigate: (to: string) => void): ContactIntent | null {
  const intent = getContactIntent();
  if (!intent) return null;
  clearContactIntent();
  return intent;
}
