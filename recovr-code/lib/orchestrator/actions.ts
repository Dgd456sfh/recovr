export type RecoveryAction =
  | "RETRY"
  | "PAYMENT_LINK"
  | "WAIT"
  | "REVIEW";

type OrchestratorInput = {
  transactionId: string;
  paymentId: string;
  action: RecoveryAction;
  recoveryProbability: number;
  confidence: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  reasoning: string;
};

type OrchestratorResult = {
  status:
    | "SCHEDULED"
    | "PAYMENT_LINK_SIMULATED"
    | "WAITING"
    | "REVIEW_REQUIRED";
  action: RecoveryAction;
  message: string;
  simulated: true;
};

export async function orchestrateRecovery(
  input: OrchestratorInput
): Promise<OrchestratorResult> {
  switch (input.action) {
    case "RETRY":
      return {
        status: "SCHEDULED",
        action: "RETRY",
        message:
          "Recovery retry scheduled in simulation mode. No real payment was attempted.",
        simulated: true,
      };

    case "PAYMENT_LINK":
      return {
        status: "PAYMENT_LINK_SIMULATED",
        action: "PAYMENT_LINK",
        message:
          "Payment link recovery simulated. No real payment link was created.",
        simulated: true,
      };

    case "WAIT":
      return {
        status: "WAITING",
        action: "WAIT",
        message:
          "Recovery paused while RECOVR waits for better recovery conditions.",
        simulated: true,
      };

    case "REVIEW":
    default:
      return {
        status: "REVIEW_REQUIRED",
        action: "REVIEW",
        message:
          "Recovery requires manual review before any action.",
        simulated: true,
      };
  }
}