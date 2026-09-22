import type { CommandEntry } from "./command-entries";

export function foldText(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const EXACT = 0;
const PREFIX = 1;
const WORD_PREFIX = 2;
const SUBSTRING = 3;
const SUBSEQUENCE = 4;
const KEYWORD_PENALTY = 10;

function isSubsequence(folded: string, wanted: string) {
  let index = 0;
  for (const letter of folded) {
    if (letter === wanted[index]) {
      index += 1;
      if (index === wanted.length) {
        return true;
      }
    }
  }
  return false;
}

export function matchScore(text: string, query: string): number | null {
  const folded = foldText(text);
  const wanted = foldText(query);

  if (wanted.length === 0 || folded === wanted) {
    return EXACT;
  }
  if (folded.startsWith(wanted)) {
    return PREFIX;
  }
  if (folded.split(/[^\p{Letter}\p{Number}]+/u).some((word) => word.startsWith(wanted))) {
    return WORD_PREFIX;
  }
  if (folded.includes(wanted)) {
    return SUBSTRING;
  }
  return isSubsequence(folded, wanted) ? SUBSEQUENCE : null;
}

function entryScore(entry: CommandEntry, query: string): number | null {
  const label = matchScore(entry.label, query);
  if (label !== null) {
    return label;
  }
  if (entry.keywords === "") {
    return null;
  }
  const keyword = matchScore(entry.keywords, query);
  return keyword === null ? null : keyword + KEYWORD_PENALTY;
}

interface Ranked {
  entry: CommandEntry;
  score: number;
  recent: number;
  order: number;
}

function compareRanked(left: Ranked, right: Ranked) {
  return left.score - right.score || left.recent - right.recent || left.order - right.order;
}

export function filterCommandEntries(
  entries: readonly CommandEntry[],
  query: string,
  recents: readonly string[] = [],
): CommandEntry[] {
  const trimmed = query.trim();
  const ranked: Ranked[] = [];

  for (const [order, entry] of entries.entries()) {
    const score = entryScore(entry, trimmed);
    if (score !== null) {
      const recent = recents.indexOf(entry.id);
      ranked.push({ entry, score, recent: recent === -1 ? recents.length : recent, order });
    }
  }

  return ranked.toSorted(compareRanked).map((row) => row.entry);
}
