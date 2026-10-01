export function confidencePercent(confidence: number | null) {
  return Math.floor((confidence ?? 0) * 100);
}
