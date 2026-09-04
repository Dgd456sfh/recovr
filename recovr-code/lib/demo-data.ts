export const recoveryCases = [
  {
    id: "RCV-2847",
    customer: "Ananya Sharma",
    amount: 12499,
    type: "Payment Failure",
    probability: 87,
    status: "Retry Scheduled",
  },
  {
    id: "RCV-1842",
    customer: "Acme Technologies",
    amount: 8750,
    type: "Checkout Abandoned",
    probability: 72,
    status: "Payment Link",
  },
  {
    id: "RCV-7312",
    customer: "Nova Retail",
    amount: 24200,
    type: "Subscription Failure",
    probability: 91,
    status: "Retry After 6H",
  },
  {
    id: "RCV-4921",
    customer: "Orbit Labs",
    amount: 6480,
    type: "Hard Decline",
    probability: 18,
    status: "Stopped",
  },
];

export const dashboardMetrics = {
  revenueAtRisk: 582000,
  recovered: 214000,
  recoveryRate: 36.9,
  activeCases: 83,
};