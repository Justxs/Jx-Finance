import { parseIso } from "@/lib/calendar";

const DAYS_PER_MONTH = 365.25 / 12;
const DAY_MS = 24 * 60 * 60 * 1000;

export function monthlyToReach(remaining: number, today: string, targetDate: string | null) {
  const now = parseIso(today);
  const target = targetDate ? parseIso(targetDate) : null;
  if (!now || !target || remaining <= 0 || target < now) {
    return null;
  }

  const days = Math.round((target.getTime() - now.getTime()) / DAY_MS);
  const months = Math.max(1, Math.round(days / DAYS_PER_MONTH));
  return Math.ceil((remaining / months) * 100) / 100;
}
