const STORAGE_KEY = "mrecw-search-history";
const MAX_ITEMS = 8;

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(ticket: string): string[] {
  const normalized = ticket.trim().toUpperCase();
  if (!normalized) return getSearchHistory();
  const next = [normalized, ...getSearchHistory().filter((t) => t !== normalized)].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearSearchHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
