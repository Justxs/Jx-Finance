import { daysBetween } from "@/lib/calendar";

const DAYS_PER_MONTH = 365.25 / 12;

export function monthlyToReach(remaining: number, today: string, targetDate: string | null) {
  const days = targetDate ? daysBetween(today, targetDate) : null;
  if (days === null || remaining <= 0 || days < 0) {
    return null;
  }

  const months = Math.max(1, Math.round(days / DAYS_PER_MONTH));
  return Math.ceil((remaining / months) * 100) / 100;
}
