export type EloHistoryPoint = {
  at: string;
  rating: number;
  ratingDisplay: number;
};

const INITIAL_RATING = 1000;

/**
 * Build a chronological Elo curve, starting one second before the first event.
 * Avoids using profile.createdAt, which can be later than imported match dates.
 */
export function buildEloHistoryPoints(
  pEvents: Array<{
    processedAt: string;
    ratingAfter: number;
    ratingDisplay: number;
  }>,
): EloHistoryPoint[] {
  const points = pEvents
    .map((pEvent) => ({
      at: pEvent.processedAt,
      rating: pEvent.ratingAfter,
      ratingDisplay: pEvent.ratingDisplay,
    }))
    .sort((pLeft, pRight) => pLeft.at.localeCompare(pRight.at));

  if (points.length === 0) {
    return [];
  }

  const firstAtMs = new Date(points[0]!.at).getTime();
  if (Number.isNaN(firstAtMs)) {
    return points;
  }

  return [
    {
      at: new Date(firstAtMs - 1_000).toISOString(),
      rating: INITIAL_RATING,
      ratingDisplay: INITIAL_RATING,
    },
    ...points,
  ];
}
