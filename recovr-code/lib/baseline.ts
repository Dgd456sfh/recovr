import { prisma } from "@/lib/db/prisma";

const FAILURE_RATE_THRESHOLD = 10;
const MINIMUM_EVENTS_FOR_ANOMALY = 3;

export async function calculateBaseline() {
  const events = await prisma.paymentEvent.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (events.length === 0) {
    return {
      status: "INSUFFICIENT_DATA",
      totalEvents: 0,
      historicalEvents: 0,
      currentEvents: 0,
      successRate: 0,
      failureRate: 0,
      baselineFailureRate: 0,
      deviationPercent: 0,
      anomaly: false,
      reason: "No payment events available.",
    };
  }

  /*
   * For the MVP we split the dataset into:
   *
   * historical period = older events
   * current period    = latest events
   *
   * This gives RECOVR a comparison point instead
   * of comparing the current failure rate against itself.
   */

  const splitIndex = Math.max(
    1,
    Math.floor(events.length * 0.5)
  );

  const historicalEvents = events.slice(0, splitIndex);
  const currentEvents = events.slice(splitIndex);

  const historicalFailed = historicalEvents.filter(
    (event) => event.status !== "SUCCESS"
  ).length;

  const currentFailed = currentEvents.filter(
    (event) => event.status !== "SUCCESS"
  ).length;

  const baselineFailureRate =
    historicalEvents.length > 0
      ? (historicalFailed / historicalEvents.length) * 100
      : 0;

  const currentFailureRate =
    currentEvents.length > 0
      ? (currentFailed / currentEvents.length) * 100
      : 0;

  const successful = currentEvents.filter(
    (event) => event.status === "SUCCESS"
  ).length;

  const failed = currentEvents.filter(
    (event) => event.status !== "SUCCESS"
  ).length;

  const deviationPercent =
    baselineFailureRate > 0
      ? ((currentFailureRate - baselineFailureRate) /
          baselineFailureRate) *
        100
      : currentFailureRate > 0
        ? 100
        : 0;

  let anomaly = false;
  let reason = "Payment behavior is within baseline.";

  if (currentEvents.length >= MINIMUM_EVENTS_FOR_ANOMALY) {
    if (
      currentFailureRate >= FAILURE_RATE_THRESHOLD &&
      currentFailureRate > baselineFailureRate
    ) {
      anomaly = true;

      reason =
        `Current failure rate ${currentFailureRate.toFixed(
          2
        )}% exceeded historical baseline of ${baselineFailureRate.toFixed(
          2
        )}%.`;
    }
  }

  return {
    status: anomaly ? "ANOMALY" : "NORMAL",

    totalEvents: events.length,

    historicalEvents: historicalEvents.length,

    currentEvents: currentEvents.length,

    successfulEvents: successful,

    failedEvents: failed,

    successRate:
      currentEvents.length > 0
        ? (successful / currentEvents.length) * 100
        : 0,

    failureRate: currentFailureRate,

    baselineFailureRate,

    deviationPercent,

    anomaly,

    reason,
  };
}