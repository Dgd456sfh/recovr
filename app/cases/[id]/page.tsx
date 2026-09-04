"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type RecoveryEvent = {
  id: string;
  transactionId: string;
  eventType: string;
  action: string | null;
  message: string | null;
  createdAt: string;
};

type Transaction = {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  customerEmail: string | null;

  status: string;
  failureReason: string | null;
  recoverable: boolean;

  recovered: boolean;
  recoveredAmount?: number | null;
  recoveredAt?: string | null;

  recoveryStatus: string;
  recoveryAction: string | null;
  recommendation: string | null;
  confidence: number | null;
  reason: string | null;

  razorpayOrderId: string | null;
  razorpayPaymentId?: string | null;
  razorpayPaymentLinkId: string | null;

  createdAt: string;
  updatedAt?: string;

  recoveryEvents: RecoveryEvent[];
};

type CaseResponse = {
  success: boolean;
  transaction?: Transaction;
  cases?: Transaction[];
  error?: string;
};

type ExecuteResponse = {
  success: boolean;
  executed?: boolean;
  alreadyExists?: boolean;

  action?: string;

  paymentLinkCreated?: boolean;

  paymentLink?: {
    id: string;
    shortUrl: string | null;
    status?: string;
    amount?: number;
    currency?: string;
    expireBy?: number | null;
  };

  transaction?: Transaction;

  message?: string;
  error?: string;
};

type SyncResponse = {
  success: boolean;
  recovered?: boolean;

  paymentLink?: {
    id: string;
    status: string;
    amount: number;
    amountPaid: number;
    currency: string;
    shortUrl?: string;
  };

  transaction?: Transaction;

  message?: string;
  error?: string;
};

type OutcomeResponse = {
  success: boolean;
  recovered?: boolean;
  status?: string;
  message?: string;
  transaction?: Transaction;
  error?: string;
};

export default function RecoveryCasePage() {
  const params = useParams();

  const rawId = params?.id;

  const transactionId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
        ? rawId[0]
        : "";

  const [transaction, setTransaction] =
    useState<Transaction | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [outcomeLoading, setOutcomeLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [paymentLink, setPaymentLink] =
    useState<string | null>(null);

  /*
   * =========================================================
   * FORMATTERS
   * =========================================================
   */

  const formatMoney = useCallback(
    (amount: number, currency: string = "INR") => {
      if (currency === "INR") {
        return `₹${Number(amount || 0).toLocaleString(
          "en-IN"
        )}`;
      }

      return `${currency} ${Number(
        amount || 0
      ).toLocaleString("en-IN")}`;
    },
    []
  );

  const formatDate = useCallback(
    (date: string | null | undefined) => {
      if (!date) {
        return "—";
      }

      const parsed = new Date(date);

      if (Number.isNaN(parsed.getTime())) {
        return date;
      }

      return parsed.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    []
  );

  /*
   * =========================================================
   * LOAD CASE
   * =========================================================
   */

  const loadCase = useCallback(
    async (showLoader = true) => {
      if (!transactionId) {
        setError("Transaction ID is missing.");
        setLoading(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        const response = await fetch(
          `/api/recovery/cases?id=${encodeURIComponent(
            transactionId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const contentType =
          response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await response.text();

          console.error(
            "Recovery cases returned non-JSON:",
            text.slice(0, 500)
          );

          throw new Error(
            `Recovery API returned ${response.status} ${response.statusText}.`
          );
        }

        const result =
          (await response.json()) as CaseResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              "Unable to load recovery case."
          );
        }

        let foundTransaction: Transaction | undefined;

        /*
         * API directly returns transaction
         */
        if (result.transaction) {
          foundTransaction =
            result.transaction;
        }

        /*
         * API returns cases array
         */
        if (
          !foundTransaction &&
          result.cases
        ) {
          foundTransaction =
            result.cases.find(
              (item) =>
                item.id === transactionId ||
                item.paymentId === transactionId
            );
        }

        if (!foundTransaction) {
          throw new Error(
            "Recovery case data was not returned."
          );
        }

        setTransaction(foundTransaction);

        /*
         * Only replace the short URL when we
         * actually have one.
         *
         * Never replace it with the Razorpay
         * Payment Link ID.
         */
        if (
          !paymentLink &&
          foundTransaction.razorpayPaymentLinkId
        ) {
          /*
           * The database stores the ID.
           * The actual short URL comes from
           * the execute response.
           */
        }
      } catch (err) {
        console.error(
          "RECOVR case loading error:",
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : "Unable to load recovery case.";

        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [transactionId, paymentLink]
  );

  useEffect(() => {
    void loadCase(true);
  }, [loadCase]);

  /*
   * =========================================================
   * GENERATE PAYMENT LINK
   * =========================================================
   */

  const generatePaymentLink =
    async () => {
      if (!transaction) {
        return;
      }

      try {
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);

        const response = await fetch(
          "/api/recovery/execute",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              transactionId:
                transaction.id,

              action:
                "PAYMENT_LINK",
            }),
          }
        );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          !contentType.includes(
            "application/json"
          )
        ) {
          const text =
            await response.text();

          console.error(
            "Execute API returned non-JSON:",
            text.slice(0, 500)
          );

          throw new Error(
            `Recovery execution API returned ${response.status}.`
          );
        }

        const result =
          (await response.json()) as ExecuteResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Unable to generate Payment Link."
          );
        }

        /*
         * IMPORTANT:
         *
         * Store the real short URL.
         */
        if (
          result.paymentLink?.shortUrl
        ) {
          setPaymentLink(
            result.paymentLink.shortUrl
          );
        }

        /*
         * Use transaction returned by
         * execute endpoint immediately.
         */
        if (result.transaction) {
          setTransaction(
            result.transaction
          );
        }

        setSuccessMessage(
          result.message ||
            "Razorpay Test Mode Payment Link created successfully."
        );

        /*
         * Refresh database state.
         */
        await loadCase(false);
      } catch (err) {
        console.error(
          "Payment Link generation error:",
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : "Unable to generate Payment Link.";

        setError(message);
      } finally {
        setActionLoading(false);
      }
    };

  /*
   * =========================================================
   * EVALUATE PAYMENT LINK OUTCOME
   *
   * THIS IS THE IMPORTANT FIX.
   *
   * We directly call:
   *
   * POST /api/razorpay/sync-payment-link
   *
   * instead of first calling /api/recovery/cases.
   *
   * Your sync endpoint is already confirmed working.
   * =========================================================
   */

  const evaluatePaymentLinkOutcome =
    async () => {
      if (!transaction) {
        return;
      }

      try {
        setOutcomeLoading(true);
        setError(null);
        setSuccessMessage(null);

        const response = await fetch(
          "/api/razorpay/sync-payment-link",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              transactionId:
                transaction.id,
            }),
          }
        );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          !contentType.includes(
            "application/json"
          )
        ) {
          const text =
            await response.text();

          console.error(
            "Sync Payment Link API returned non-JSON:",
            text.slice(0, 500)
          );

          throw new Error(
            `Payment Link sync returned ${response.status}.`
          );
        }

        const result =
          (await response.json()) as SyncResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Unable to evaluate Payment Link."
          );
        }

        /*
         * Update the UI directly from the
         * successful sync response.
         */
        if (result.transaction) {
          setTransaction(
            result.transaction
          );
        }

        /*
         * Keep the real Razorpay short URL.
         */
        if (
          result.paymentLink?.shortUrl
        ) {
          setPaymentLink(
            result.paymentLink.shortUrl
          );
        }

        if (result.recovered) {
          setSuccessMessage(
            result.message ||
              "Payment successfully recovered through Razorpay Test Mode."
          );
        } else {
          setSuccessMessage(
            result.message ||
              "Payment Link checked successfully. Payment is not recovered yet."
          );
        }

        /*
         * Refresh case after sync.
         *
         * IMPORTANT:
         * Errors here should NOT erase the successful
         * sync result from the UI.
         */
        try {
          await loadCase(false);
        } catch {
          /*
           * Ignore refresh failure because the sync
           * response has already updated the UI.
           */
        }
      } catch (err) {
        console.error(
          "Payment Link outcome error:",
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : "Unable to evaluate Payment Link.";

        setError(message);
      } finally {
        setOutcomeLoading(false);
      }
    };

  /*
   * =========================================================
   * RETRY OUTCOME
   *
   * Controlled retry uses the existing outcome endpoint.
   * =========================================================
   */

  const evaluateRetryOutcome =
    async () => {
      if (!transaction) {
        return;
      }

      try {
        setOutcomeLoading(true);
        setError(null);
        setSuccessMessage(null);

        const response = await fetch(
          "/api/recovery/outcome",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              transactionId:
                transaction.id,
            }),
          }
        );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          !contentType.includes(
            "application/json"
          )
        ) {
          throw new Error(
            `Outcome API returned ${response.status}.`
          );
        }

        const result =
          (await response.json()) as OutcomeResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ||
              "Unable to evaluate retry outcome."
          );
        }

        if (result.transaction) {
          setTransaction(
            result.transaction
          );
        }

        setSuccessMessage(
          result.message ||
            "Retry outcome evaluated successfully."
        );

        await loadCase(false);
      } catch (err) {
        console.error(
          "Retry outcome error:",
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : "Unable to evaluate retry outcome.";

        setError(message);
      } finally {
        setOutcomeLoading(false);
      }
    };

  /*
   * =========================================================
   * STATE
   * =========================================================
   */

  const normalizedAction =
    normalizeAction(
      transaction?.recoveryAction ||
        transaction?.recommendation
    );

  const isRecovered =
    Boolean(
      transaction?.recovered
    ) ||
    transaction?.recoveryStatus ===
      "RECOVERED" ||
    transaction?.status ===
      "RECOVERED";

  const isPaymentLinkCase =
    normalizedAction ===
      "PAYMENT_LINK" ||
    Boolean(
      transaction?.razorpayPaymentLinkId
    );

  const isRetryCase =
    normalizedAction === "RETRY" ||
    normalizedAction ===
      "CONTROLLED_RETRY";

  const isNoActionCase =
    normalizedAction ===
      "NO_ACTION" ||
    normalizedAction ===
      "NOT_REQUIRED";

  const hasPaymentLink =
    Boolean(paymentLink) ||
    Boolean(
      transaction?.razorpayPaymentLinkId
    );

  const paymentLinkGenerated =
    transaction?.recoveryStatus ===
      "PAYMENT_LINK_GENERATED" ||
    Boolean(
      transaction?.razorpayPaymentLinkId
    );

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f4] px-6 py-10 text-black">
        <div className="mx-auto max-w-6xl">
          <div className="h-5 w-32 animate-pulse rounded bg-black/10" />

          <div className="mt-8 h-12 w-80 animate-pulse rounded bg-black/10" />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="h-36 animate-pulse rounded-3xl border border-black bg-white" />
            <div className="h-36 animate-pulse rounded-3xl border border-black bg-white" />
            <div className="h-36 animate-pulse rounded-3xl border border-black bg-white" />
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * ERROR WITHOUT TRANSACTION
   * =========================================================
   */

  if (error && !transaction) {
    return (
      <main className="min-h-screen bg-[#f7f7f4] px-6 py-10 text-black">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/cases"
            className="text-sm font-bold underline underline-offset-4"
          >
            ← BACK TO CASES
          </Link>

          <div className="mt-10 rounded-3xl border border-black bg-white p-8">
            <p className="text-sm font-bold uppercase tracking-widest text-red-600">
              Error
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Unable to load case
            </h1>

            <p className="mt-4 text-black/60">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadCase(true)
              }
              className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-bold text-white"
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!transaction) {
    return null;
  }

  /*
   * =========================================================
   * MAIN UI
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#f7f7f4] px-5 py-8 text-black md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="flex items-center justify-between">
          <Link
            href="/cases"
            className="text-sm font-bold underline underline-offset-4"
          >
            ← BACK TO CASES
          </Link>

          <div className="rounded-full border border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-wider">
            RECOVERY CASE
          </div>
        </div>

        {/* TITLE */}

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-black/50">
                Payment Recovery
              </p>

              <h1 className="mt-3 break-all text-4xl font-black tracking-tight md:text-6xl">
                {transaction.paymentId}
              </h1>
            </div>

            <StatusBadge
              recovered={isRecovered}
              status={
                transaction.recoveryStatus
              }
            />
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-black bg-[#e9e7ff] px-5 py-4 text-sm font-bold">
            {successMessage}
          </div>
        )}

        {/* TRANSACTION INFO */}

        <section className="mt-8 grid gap-4 md:grid-cols-3">

          <InfoCard
            label="AMOUNT"
            value={formatMoney(
              transaction.amount,
              transaction.currency
            )}
          />

          <InfoCard
            label="CUSTOMER"
            value={
              transaction.customerEmail ||
              "Unknown customer"
            }
          />

          <InfoCard
            label="PAYMENT ID"
            value={
              transaction.paymentId
            }
          />

        </section>

        {/* SECONDARY INFO */}

        <section className="mt-4 grid gap-4 md:grid-cols-3">

          <InfoCard
            label="CREATED"
            value={formatDate(
              transaction.createdAt
            )}
          />

          <InfoCard
            label="FAILURE SIGNAL"
            value={
              transaction.failureReason ||
              "Payment failed"
            }
          />

          <InfoCard
            label="RECOVERY STATUS"
            value={
              transaction.recoveryStatus ||
              "PENDING"
            }
          />

        </section>

        {/* RECOVERED RESULT */}

        {isRecovered && (
          <section className="mt-6 rounded-3xl border border-black bg-[#e9e7ff] p-6 md:p-8">

            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em]">
                  RECOVERY SUCCESS
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Payment recovered
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold text-black/60">
                  RECOVR successfully detected
                  the completed Razorpay Test
                  Mode payment and marked this
                  failed transaction as recovered.
                </p>
              </div>

              <div className="rounded-3xl border border-black bg-white px-6 py-5">
                <p className="text-xs font-black uppercase tracking-widest text-black/40">
                  RECOVERED AMOUNT
                </p>

                <p className="mt-2 text-3xl font-black">
                  {formatMoney(
                    transaction.recoveredAmount ??
                      transaction.amount,
                    transaction.currency
                  )}
                </p>
              </div>

            </div>

            {transaction.recoveredAt && (
              <p className="mt-5 text-xs font-bold text-black/50">
                RECOVERED AT{" "}
                {formatDate(
                  transaction.recoveredAt
                )}
              </p>
            )}

          </section>
        )}

        {/* MAIN GRID */}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

          {/* TIMELINE */}

          <div className="rounded-3xl border border-black bg-white p-6 md:p-8">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-black/40">
                  RECOVERY TIMELINE
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Recovery events
                </h2>
              </div>

              <div className="rounded-full border border-black px-3 py-1 text-xs font-bold">
                {transaction.recoveryEvents?.length ||
                  0}{" "}
                EVENTS
              </div>

            </div>

            {transaction.recoveryEvents?.length ? (

              <div className="mt-8 space-y-5">

                {transaction.recoveryEvents.map(
                  (event, index) => (

                    <div
                      key={event.id}
                      className="relative flex gap-4"
                    >

                      <div className="flex flex-col items-center">

                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black text-xs font-black ${
                            event.eventType.includes(
                              "RECOVER"
                            )
                              ? "bg-[#5f5cff] text-white"
                              : "bg-white"
                          }`}
                        >
                          {index + 1}
                        </div>

                        {index !==
                          transaction
                            .recoveryEvents
                            .length -
                            1 && (
                          <div className="mt-2 h-full min-h-10 w-px bg-black/20" />
                        )}

                      </div>

                      <div className="pb-5">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-full border border-black px-2.5 py-1 text-[10px] font-black uppercase">
                            {event.eventType}
                          </span>

                          {event.action && (
                            <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-black uppercase text-white">
                              {event.action}
                            </span>
                          )}

                        </div>

                        <p className="mt-2 text-sm font-semibold">
                          {event.message ||
                            "Recovery event recorded."}
                        </p>

                        <p className="mt-1 text-xs text-black/45">
                          {formatDate(
                            event.createdAt
                          )}
                        </p>

                      </div>

                    </div>

                  )
                )}

              </div>

            ) : (

              <div className="mt-8 rounded-2xl border border-dashed border-black/30 p-8 text-center">
                <p className="text-sm font-bold text-black/50">
                  No recovery events yet.
                </p>
              </div>

            )}

          </div>

          {/* INTELLIGENCE */}

          <div className="rounded-3xl border border-black bg-white p-6 md:p-8">

            <p className="text-xs font-black uppercase tracking-widest text-black/40">
              RECOVERY INTELLIGENCE
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Recommended action
            </h2>

            <div className="mt-6 rounded-2xl border border-black bg-[#f7f7f4] p-5">

              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                RECOMMENDED ACTION
              </p>

              <p className="mt-3 text-2xl font-black">
                {formatAction(
                  transaction.recommendation ||
                    transaction.recoveryAction
                )}
              </p>

              <div className="mt-5">

                <div className="flex items-center justify-between text-xs font-bold">
                  <span>
                    CONFIDENCE
                  </span>

                  <span>
                    {formatConfidence(
                      transaction.confidence
                    )}
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full border border-black bg-white">

                  <div
                    className="h-full bg-[#5f5cff]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          transaction.confidence ??
                            0
                        )
                      )}%`,
                    }}
                  />

                </div>

              </div>

            </div>

            <div className="mt-4 rounded-2xl border border-black p-5">

              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                REASON
              </p>

              <p className="mt-3 text-sm font-semibold leading-6">
                {transaction.reason ||
                  "RECOVR has analyzed this failed payment and selected a recovery strategy."}
              </p>

            </div>

          </div>

        </section>

        {/* PAYMENT LINK */}

        {hasPaymentLink && paymentLink && (
          <section className="mt-6 rounded-3xl border border-black bg-[#e9e7ff] p-6 md:p-8">

            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

              <div>

                <p className="text-xs font-black uppercase tracking-widest">
                  RAZORPAY TEST MODE
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Payment Link ready
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold text-black/60">
                  The recovery Payment Link
                  was created in Razorpay Test
                  Mode.
                </p>

              </div>

              <a
                href={paymentLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-black bg-black px-6 py-3 text-sm font-black text-white transition hover:-translate-y-[1px]"
              >
                OPEN PAYMENT LINK ↗
              </a>

            </div>

          </section>
        )}

        {/* ACTIONS */}

        <section className="mt-6 rounded-3xl border border-black bg-white p-6 md:p-8">

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                RECOVERY ACTION
              </p>

              <h2 className="mt-2 text-3xl font-black">

                {isRecovered
                  ? "Payment recovered"
                  : isNoActionCase
                    ? "No recovery action required"
                    : isRetryCase
                      ? "Controlled retry"
                      : paymentLinkGenerated
                        ? "Payment Link generated"
                        : "Generate Payment Link"}

              </h2>

              <p className="mt-2 max-w-2xl text-sm font-semibold text-black/55">

                {isRecovered
                  ? "This payment has already been successfully recovered."
                  : isNoActionCase
                    ? "RECOVR determined that no recovery action should be executed for this transaction."
                    : isRetryCase
                      ? "RECOVR approved a controlled retry using a new Razorpay checkout attempt."
                      : paymentLinkGenerated
                        ? "The Payment Link is ready. Complete the payment and then evaluate the recovery outcome."
                        : "RECOVR can create a real Razorpay Test Mode Payment Link for this failed transaction."}

              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              {/* GENERATE */}

              {!isRecovered &&
                !isNoActionCase &&
                !isRetryCase &&
                !paymentLinkGenerated && (

                  <button
                    type="button"
                    onClick={
                      generatePaymentLink
                    }
                    disabled={
                      actionLoading
                    }
                    className="rounded-full bg-[#5f5cff] px-7 py-4 text-sm font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading
                      ? "GENERATING..."
                      : "GENERATE PAYMENT LINK"}
                  </button>

                )}

              {/* EVALUATE PAYMENT LINK */}

              {!isRecovered &&
                isPaymentLinkCase &&
                paymentLinkGenerated && (

                  <button
                    type="button"
                    onClick={
                      evaluatePaymentLinkOutcome
                    }
                    disabled={
                      outcomeLoading
                    }
                    className="rounded-full bg-black px-7 py-4 text-sm font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {outcomeLoading
                      ? "CHECKING RAZORPAY..."
                      : "EVALUATE OUTCOME"}
                  </button>

                )}

              {/* RETRY */}

              {!isRecovered &&
                isRetryCase && (

                  <button
                    type="button"
                    onClick={
                      evaluateRetryOutcome
                    }
                    disabled={
                      outcomeLoading
                    }
                    className="rounded-full bg-black px-7 py-4 text-sm font-black text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {outcomeLoading
                      ? "CHECKING..."
                      : "CHECK RETRY OUTCOME"}
                  </button>

                )}

              {/* OPEN */}

              {paymentLink &&
                paymentLink.startsWith(
                  "http"
                ) &&
                !isRecovered && (

                  <a
                    href={paymentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-black px-7 py-4 text-sm font-black"
                  >
                    OPEN LINK ↗
                  </a>

                )}

            </div>

          </div>

        </section>

        {/* RAZORPAY REFERENCES */}

        {(transaction.razorpayOrderId ||
          transaction.razorpayPaymentId ||
          transaction.razorpayPaymentLinkId) && (

          <section className="mt-6 rounded-3xl border border-black bg-white p-6">

            <p className="text-xs font-black uppercase tracking-widest text-black/40">
              RAZORPAY REFERENCES
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">

              {transaction.razorpayOrderId && (
                <ReferenceRow
                  label="ORDER ID"
                  value={
                    transaction.razorpayOrderId
                  }
                />
              )}

              {transaction.razorpayPaymentId && (
                <ReferenceRow
                  label="PAYMENT ID"
                  value={
                    transaction.razorpayPaymentId
                  }
                />
              )}

              {transaction.razorpayPaymentLinkId && (
                <ReferenceRow
                  label="PAYMENT LINK ID"
                  value={
                    transaction
                      .razorpayPaymentLinkId
                  }
                />
              )}

            </div>

          </section>

        )}

        <div className="h-16" />

      </div>
    </main>
  );
}

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function normalizeAction(
  action: string | null | undefined
): string {
  if (!action) {
    return "PAYMENT_LINK";
  }

  return action
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function formatAction(
  action: string | null | undefined
): string {
  if (!action) {
    return "Generate Payment Link";
  }

  const normalized =
    normalizeAction(action);

  switch (normalized) {
    case "PAYMENT_LINK":
      return "Generate Payment Link";

    case "RETRY":
      return "Retry";

    case "CONTROLLED_RETRY":
      return "Controlled Retry";

    case "NO_ACTION":
      return "No Action";

    case "NOT_REQUIRED":
      return "Not Required";

    default:
      return normalized
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(
          /\b\w/g,
          (char) =>
            char.toUpperCase()
        );
  }
}

function formatConfidence(
  confidence: number | null
): string {
  if (
    confidence === null ||
    confidence === undefined
  ) {
    return "0%";
  }

  return `${Math.round(
    confidence
  )}%`;
}

/*
 * =========================================================
 * INFO CARD
 * =========================================================
 */

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-black bg-white p-6">

      <p className="text-xs font-black uppercase tracking-widest text-black/40">
        {label}
      </p>

      <p className="mt-3 break-words text-lg font-black">
        {value}
      </p>

    </div>
  );
}

/*
 * =========================================================
 * RAZORPAY REFERENCE
 * =========================================================
 */

function ReferenceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/15 bg-[#f7f7f4] p-4">

      <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
        {label}
      </p>

      <p className="mt-2 break-all font-mono text-xs font-bold">
        {value}
      </p>

    </div>
  );
}

/*
 * =========================================================
 * STATUS BADGE
 * =========================================================
 */

function StatusBadge({
  recovered,
  status,
}: {
  recovered: boolean;
  status: string;
}) {
  if (
    recovered ||
    status === "RECOVERED"
  ) {
    return (
      <div className="rounded-full border border-black bg-[#5f5cff] px-5 py-2 text-xs font-black uppercase text-white">
        Recovered
      </div>
    );
  }

  if (
    status ===
    "PAYMENT_LINK_GENERATED"
  ) {
    return (
      <div className="rounded-full border border-black bg-[#e9e7ff] px-5 py-2 text-xs font-black uppercase">
        Payment Link Ready
      </div>
    );
  }

  if (
    status ===
    "RETRY_SCHEDULED"
  ) {
    return (
      <div className="rounded-full border border-black bg-[#e9e7ff] px-5 py-2 text-xs font-black uppercase">
        Retry Scheduled
      </div>
    );
  }

  return (
    <div className="rounded-full border border-black bg-white px-5 py-2 text-xs font-black uppercase">
      Pending
    </div>
  );
}