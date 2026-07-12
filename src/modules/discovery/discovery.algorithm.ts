export function calculateHomepageScore(
  event: {
    views: number;

    wishlistCount: number;

    shareCount: number;

    soldTickets: number;

    startsInDays: number;
  },
) {
  const recencyBonus =
    Math.max(
      0,
      30 - event.startsInDays,
    ) * 5;

  return (
    event.views * 0.25 +

    event.wishlistCount * 0.20 +

    event.shareCount * 0.10 +

    event.soldTickets * 0.45 +

    recencyBonus
  );
}