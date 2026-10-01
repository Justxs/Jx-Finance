import type { NetWorthSnapshotItem } from "@/api/generated/model";
import { daysBetween, parseIso, toIso } from "@/lib/calendar";

const PACE_WINDOW_MONTHS = 12;
const PACE_MIN_DAYS = 90;
const PACE_HORIZON_DAYS = 365;
const MILESTONE_YEARS = 50;
export const MAX_MILESTONES = 5;

const DAYS_PER_MONTH = 365.25 / 12;

export interface Pace {
  from: string;
  to: string;
  latest: number;
  perMonth: number;
  days: number;
  steps: number;
}

export type MilestoneReach =
  | { state: "reached" }
  | { state: "on"; date: string }
  | { state: "never" }
  | { state: "beyond" };

function shifted(isoDate: string, months: number, days: number) {
  const date = parseIso(isoDate);
  return date
    ? toIso(
        new Date(date.getFullYear(), date.getMonth() + months, date.getDate() + Math.round(days)),
      )
    : isoDate;
}

export function trailingPace(items: readonly NetWorthSnapshotItem[]): Pace | null {
  const last = items.at(-1);
  if (!last) {
    return null;
  }
  const windowStart = shifted(last.date, -PACE_WINDOW_MONTHS, 0);
  const baseIndex = Math.max(
    0,
    items.findLastIndex((item) => item.date <= windowStart),
  );
  const base = items[baseIndex] ?? last;
  const days = daysBetween(base.date, last.date) ?? 0;
  if (days < PACE_MIN_DAYS) {
    return null;
  }
  const latest = Number(last.netWorth);
  return {
    from: base.date,
    to: last.date,
    latest,
    perMonth: (latest - Number(base.netWorth)) / (days / DAYS_PER_MONTH),
    days,
    steps: items.length - 1 - baseIndex,
  };
}

export function paceLine(pace: Pace): { date: string; value: number }[] {
  const horizon = Math.min(pace.days, PACE_HORIZON_DAYS);
  const count = Math.max(1, Math.round((pace.steps * horizon) / pace.days));
  return Array.from({ length: count + 1 }, (_, step) => {
    const offset = (horizon * step) / count;
    return {
      date: shifted(pace.to, 0, offset),
      value: pace.latest + (pace.perMonth * offset) / DAYS_PER_MONTH,
    };
  });
}

export function milestoneReach(pace: Pace, target: number): MilestoneReach {
  if (pace.latest >= target) {
    return { state: "reached" };
  }
  if (pace.perMonth <= 0) {
    return { state: "never" };
  }
  const months = (target - pace.latest) / pace.perMonth;
  if (months > MILESTONE_YEARS * 12) {
    return { state: "beyond" };
  }
  return { state: "on", date: shifted(pace.to, 0, months * DAYS_PER_MONTH) };
}

function roundAbove(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  return (
    [1, 2, 5, 10].map((step) => step * magnitude).find((round) => round > value) ?? 10 * magnitude
  );
}

export function suggestedMilestones(latest: number): number[] {
  if (latest < 0) {
    return [0, roundAbove(-latest)];
  }
  const first = roundAbove(latest);
  return [first, roundAbove(first)];
}

export function withMilestone(milestones: readonly number[], target: number): number[] {
  return [...new Set([...milestones, target])].toSorted((a, b) => a - b);
}
