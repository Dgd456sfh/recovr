import { prisma } from "@/lib/db/prisma";

function calculateSeverity(
  failureCount: number,
  revenueAtRisk: number,
  confidence: number
): string {
  if (
    revenueAtRisk >= 100000 ||
    failureCount >= 50
  ) {
    return "CRITICAL";
  }

  if (
    revenueAtRisk >= 50000 ||
    failureCount >= 20
  ) {
    return "HIGH";
  }

  if (
    revenueAtRisk >= 10000 ||
    failureCount >= 5
  ) {
    return "MEDIUM";
  }

  if (confidence < 0.5) {
    return "LOW";
  }

  return "LOW";
}

function calculatePriority(
  severity: string,
  revenueAtRisk: number
): string {
  if (
    severity === "CRITICAL" ||
    revenueAtRisk >= 100000
  ) {
    return "P0";
  }

  if (
    severity === "HIGH" ||
    revenueAtRisk >= 50000
  ) {
    return "P1";
  }

  if (
    severity === "MEDIUM" ||
    revenueAtRisk >= 10000
  ) {
    return "P2";
  }

  return "P3";
}

function classifyIncidentType(
  channel: string | null,
  provider: string | null,
  failureCount: number
): string {
  if (provider && failureCount >= 5) {
    return "PROVIDER_DEGRADATION";
  }

  if (channel && failureCount >= 3) {
    return "CHANNEL_DEGRADATION";
  }

  return "UNKNOWN_ANOMALY";
}

export async function runTriage() {
  const incidents = await prisma.incident.findMany({
    where: {
      status: "DETECTED",
    },
    orderBy: {
      detectedAt: "asc",
    },
  });

  if (incidents.length === 0) {
    return {
      success: true,
      triaged: 0,
      message: "No new incidents require triage.",
    };
  }

  const results = [];

  for (const incident of incidents) {
    const confidence = incident.confidence ?? 0;

    const severity = calculateSeverity(
      incident.failureCount,
      incident.revenueAtRisk,
      confidence
    );

    const priority = calculatePriority(
      severity,
      incident.revenueAtRisk
    );

    const type = classifyIncidentType(
      incident.channel,
      incident.provider,
      incident.failureCount
    );

    const updatedIncident = await prisma.incident.update({
      where: {
        id: incident.id,
      },
      data: {
        severity,
        type,
        status: "INVESTIGATING",
      },
    });

    results.push({
      incidentId: updatedIncident.id,
      type,
      severity,
      priority,
      confidence,
      channel: updatedIncident.channel,
      provider: updatedIncident.provider,
      revenueAtRisk: updatedIncident.revenueAtRisk,
      status: updatedIncident.status,
    });
  }

  return {
    success: true,
    triaged: results.length,
    incidents: results,
  };
}