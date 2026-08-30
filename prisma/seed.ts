import { prisma } from "../lib/db/prisma";

async function main() {
  await prisma.paymentEvent.deleteMany();
  await prisma.recoveryEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.incident.deleteMany();

  await prisma.transaction.createMany({
    data: [
      // ================================
      // HISTORICAL — NORMAL PAYMENTS
      // ================================

      {
        paymentId: "pay_hist_001",
        customerEmail: "customer1@example.com",
        amount: 2499,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },

      {
        paymentId: "pay_hist_002",
        customerEmail: "customer2@example.com",
        amount: 3999,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },

      {
        paymentId: "pay_hist_003",
        customerEmail: "customer3@example.com",
        amount: 1499,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },

      {
        paymentId: "pay_hist_004",
        customerEmail: "customer4@example.com",
        amount: 7999,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },

      {
        paymentId: "pay_hist_005",
        customerEmail: "customer5@example.com",
        amount: 2999,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },

      {
        paymentId: "pay_hist_006",
        customerEmail: "customer6@example.com",
        amount: 5999,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },

      {
        paymentId: "pay_hist_007",
        customerEmail: "customer7@example.com",
        amount: 1999,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },

      {
        paymentId: "pay_hist_008",
        customerEmail: "customer8@example.com",
        amount: 4499,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },

      {
        paymentId: "pay_hist_009",
        customerEmail: "customer9@example.com",
        amount: 3499,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },

      {
        paymentId: "pay_hist_010",
        customerEmail: "customer10@example.com",
        amount: 6999,
        currency: "INR",
        status: "FAILED",
        failureReason: "Temporary network error",
        recoverable: true,
        recoveryStatus: "PENDING",
        recommendation: "RETRY",
        confidence: 91,
        reason:
          "Temporary network failure. A controlled retry is recommended.",
      },

      // ================================
      // CURRENT — PAYMENT DEGRADATION
      // ================================

      {
        paymentId: "pay_current_001",
        customerEmail: "rahul@example.com",
        amount: 2499,
        currency: "INR",
        status: "FAILED",
        failureReason: "Insufficient funds",
        recoverable: true,
        recoveryStatus: "PENDING",
        recommendation: "PAYMENT_LINK",
        confidence: 87,
        reason:
          "Insufficient funds detected. A payment link gives the customer another opportunity to complete payment.",
      },

      {
        paymentId: "pay_current_002",
        customerEmail: "ananya@example.com",
        amount: 4999,
        currency: "INR",
        status: "FAILED",
        failureReason: "Bank timeout",
        recoverable: true,
        recoveryStatus: "PENDING",
        recommendation: "RETRY",
        confidence: 91,
        reason:
          "Bank timeout is typically transient. A controlled retry is recommended.",
      },

      {
        paymentId: "pay_current_003",
        customerEmail: "vikas@example.com",
        amount: 1299,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },

      {
        paymentId: "pay_current_004",
        customerEmail: "priya@example.com",
        amount: 7999,
        currency: "INR",
        status: "FAILED",
        failureReason: "Card declined",
        recoverable: true,
        recoveryStatus: "PENDING",
        recommendation: "PAYMENT_LINK",
        confidence: 84,
        reason:
          "The original payment method was declined. An alternative payment opportunity is recommended.",
      },

      {
        paymentId: "pay_current_005",
        customerEmail: "rohit@example.com",
        amount: 5499,
        currency: "INR",
        status: "FAILED",
        failureReason: "Bank timeout",
        recoverable: true,
        recoveryStatus: "PENDING",
        recommendation: "RETRY",
        confidence: 91,
        reason:
          "Bank timeout is typically transient. A controlled retry is recommended.",
      },

      {
        paymentId: "pay_current_006",
        customerEmail: "neha@example.com",
        amount: 3299,
        currency: "INR",
        status: "FAILED",
        failureReason: "Bank timeout",
        recoverable: true,
        recoveryStatus: "PENDING",
        recommendation: "RETRY",
        confidence: 91,
        reason:
          "Bank timeout is typically transient. A controlled retry is recommended.",
      },

      {
        paymentId: "pay_current_007",
        customerEmail: "amit@example.com",
        amount: 8999,
        currency: "INR",
        status: "FAILED",
        failureReason: "Card declined",
        recoverable: true,
        recoveryStatus: "PENDING",
        recommendation: "PAYMENT_LINK",
        confidence: 84,
        reason:
          "The original payment method was declined. An alternative payment opportunity is recommended.",
      },

      {
        paymentId: "pay_current_008",
        customerEmail: "simran@example.com",
        amount: 2799,
        currency: "INR",
        status: "SUCCESS",
        recoverable: false,
        recoveryStatus: "NOT_REQUIRED",
        recommendation: "NO_ACTION",
        confidence: 100,
        reason: "Payment completed successfully.",
      },
    ],
  });

  console.log("RECOVR demo dataset created successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });