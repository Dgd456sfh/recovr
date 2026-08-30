import { prisma } from "@/lib/db/prisma";
import { calculateBaseline } from "@/lib/baseline";

export async function detectIncidents() {
  const baseline = await calculateBaseline();

  if (!baseline.anomaly) {
    return {
      success: true,
      incidentCreated: false,
      reason: baseline.reason,
      baseline,
    };
  }

  const failedEvents = await prisma.paymentEvent.findMany({
    where: {
      status: {
        not: "SUCCESS",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (failedEvents.length === 0) {
    return {
      success: true,
      incidentCreated: false,
      reason: "Anomaly detected but no failed events were found.",
      baseline,
    };
  }

  const channelCounts: Record<string, number> = {};
  const providerCounts: Record<string, number> = {};

  for (const event of failedEvents) {
    if (event.channel) {
      channelCounts[event.channel] =
        (channelCounts[event.channel] || 0) + 1;
    }

    if (event.provider) {
      providerCounts[event.provider] =
        (providerCounts[event.provider] || 0) + 1;
    }
  }

  const affectedChannel =
    Object.entries(channelCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || null;

  const affectedProvider =
    Object.entries(providerCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || null;

  const existingIncident = await prisma.incident.findFirst({
    where: {
      status: {
        in: [
          "DETECTED",
          "INVESTIGATING",
          "ACTION_REQUIRED",
          "RECOVERING",
          "MONITORING",
        ],
      },
      channel: affectedChannel,
      provider: affectedProvider,
    },
  });

  if (existingIncident) {
    return {
      success: true,
      incidentCreated: false,
      incidentId: existingIncident.id,
      reason: "An active incident already exists for this issue.",
      baseline,
    };
  }

  let severity = "MEDIUM";

  if (baseline.failureRate >= 30) {
    severity = "CRITICAL";
  } else if (baseline.failureRate >= 20) {
    severity = "HIGH";
  }

  const revenueAtRisk = failedEvents.reduce(
    (total, event) => total + event.amount,
    0
  );

  const recoverableRevenue = revenueAtRisk * 0.7;

  const incident = await prisma.incident.create({
    data: {
      status: "DETECTED",
      severity,

      type: affectedProvider
        ? "PROVIDER_DEGRADATION"
        : "PAYMENT_DEGRADATION",

      channel: affectedChannel,
      provider: affectedProvider,

      failureCount: failedEvents.length,

      revenueAtRisk,
      recoverableRevenue,

      diagnosis: "Payment failure rate exceeded configured baseline threshold.",

      confidence: Math.min(
        0.99,
        baseline.failureRate / 100 + 0.5
      ),

      recommendedAction: "INVESTIGATE",

      guardrailStatus: "PENDING",

      recoveryStatus: "PENDING",
    },
  });

  return {
    success: true,
    incidentCreated: true,
    incidentId: incident.id,
    baseline,
    incident,
  };
}