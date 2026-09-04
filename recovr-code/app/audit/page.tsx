"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  FileSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

type RecoveryEvent = {
  id: string;
  transactionId: string;
  eventType: string;
  action: string | null;
  message: string | null;
  createdAt: string;
};

type AuditTransaction = {
  id: string;
  paymentId: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: string;
  failureReason: string | null;
  recoverable: boolean;
  recoveryStatus: string;
  createdAt: string;
  updatedAt: string;
  recoveryEvents: RecoveryEvent[];
};

export default function AuditPage() {
  const [transactions, setTransactions] = useState<AuditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);

      const response = await fetch("/api/transactions", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load audit events");
      }

      const data = await response.json();

      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Audit log error:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  const allEvents = useMemo(() => {
    return transactions
      .flatMap((transaction) =>
        transaction.recoveryEvents.map((event) => ({
          ...event,
          paymentId: transaction.paymentId,
          customerEmail: transaction.customerEmail,
          amount: transaction.amount,
          currency: transaction.currency,
          transactionStatus: transaction.status,
          recoverable: transaction.recoverable,
        }))
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [transactions]);

  const filteredEvents = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return allEvents;

    return allEvents.filter((event) => {
      return (
        event.paymentId.toLowerCase().includes(query) ||
        event.customerEmail.toLowerCase().includes(query) ||
        event.eventType.toLowerCase().includes(query) ||
        (event.action ?? "").toLowerCase().includes(query) ||
        (event.message ?? "").toLowerCase().includes(query) ||
        event.transactionStatus.toLowerCase().includes(query)
      );
    });
  }, [allEvents, search]);

  const recoveryActions = allEvents.filter(
    (event) =>
      event.action === "RETRY" ||
      event.action === "PAYMENT_LINK"
  ).length;

  const recoveredEvents = allEvents.filter(
    (event) => event.eventType === "PAYMENT_RECOVERED"
  ).length;

  const reviewEvents = allEvents.filter(
    (event) => event.eventType === "RECOVERY_REVIEW_REQUIRED"
  ).length;

  function formatINR(amount: number) {
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  function formatEventType(eventType: string) {
    switch (eventType) {
      case "TRANSACTION_CREATED":
        return "Transaction Created";

      case "RECOVERY_DECISION":
        return "Recovery Decision";

      case "RECOVERY_ACTION":
        return "Recovery Action";

      case "PAYMENT_RECOVERED":
        return "Payment Recovered";

      case "RETRY_SCHEDULED":
        return "Retry Scheduled";

      case "PAYMENT_LINK_GENERATED":
        return "Payment Link Generated";

      case "RECOVERY_REVIEW_REQUIRED":
        return "Review Required";

      default:
        return eventType.replaceAll("_", " ");
    }
  }

  function formatAction(action: string | null) {
    if (!action) return "System";

    switch (action) {
      case "RETRY":
        return "Retry";

      case "PAYMENT_LINK":
        return "Payment Link";

      case "MARK_RECOVERED":
        return "Mark Recovered";

      case "NO_ACTION":
        return "No Action";

      case "REVIEW":
        return "Manual Review";

      default:
        return action.replaceAll("_", " ");
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getEventStyle(eventType: string) {
    switch (eventType) {
      case "PAYMENT_RECOVERED":
        return {
          container: "border-[#72d89b]/30 bg-[#72d89b]/10",
          badge: "bg-[#72d89b] text-[#111]",
          icon: "text-[#177245]",
        };

      case "RECOVERY_ACTION":
      case "RETRY_SCHEDULED":
      case "PAYMENT_LINK_GENERATED":
        return {
          container: "border-[#5f5cff]/20 bg-[#5f5cff]/5",
          badge: "bg-[#5f5cff] text-white",
          icon: "text-[#5f5cff]",
        };

      case "RECOVERY_DECISION":
      case "RECOVERY_REVIEW_REQUIRED":
        return {
          container: "border-[#111]/15 bg-[#f5f5f0]",
          badge: "bg-[#111] text-white",
          icon: "text-[#111]",
        };

      default:
        return {
          container: "border-black/10 bg-white",
          badge: "bg-[#111] text-white",
          icon: "text-[#111]",
        };
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] text-[#111]">

      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f5f5f0]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 md:px-8">

          <a
            href="/"
            className="text-[21px] font-black tracking-[-0.08em]"
          >
            RECO
            <span className="text-[#5f5cff]">VR</span>
          </a>

          <nav className="hidden items-center gap-8 text-[10px] font-black md:flex">

            <a
              href="/dashboard"
              className="transition hover:text-[#5f5cff]"
            >
              OVERVIEW
            </a>

            <a
              href="/cases"
              className="transition hover:text-[#5f5cff]"
            >
              CASES
            </a>

            <a
              href="/analytics"
              className="transition hover:text-[#5f5cff]"
            >
              ANALYTICS
            </a>

            <span className="text-[#5f5cff]">
              AUDIT LOG
            </span>

          </nav>

          <div className="flex items-center gap-3">

            <div className="hidden text-right md:block">
              <div className="text-[10px] font-black">
                Demo Merchant
              </div>

              <div className="mt-0.5 text-[8px] font-bold text-[#111]">
                RAZORPAY TEST MODE
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111] text-[10px] font-black text-white">
              DM
            </div>

          </div>
        </div>
      </header>

      {/* MAIN */}

      <div className="mx-auto max-w-[1500px] px-5 py-10 md:px-8 md:py-14">

        {/* TOP */}

        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">

          <div>

            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#5f5cff]" />

              <span className="text-[9px] font-black tracking-[0.22em] text-[#5f5cff]">
                RECOVERY AUDIT
              </span>
            </div>

            <h1 className="mt-5 text-[52px] font-black leading-[0.92] tracking-[-0.07em] md:text-[76px]">
              Audit
              <br />
              <span className="text-[#5f5cff]">
                Log.
              </span>
            </h1>

            <p className="mt-6 max-w-[620px] text-[12px] font-medium leading-6 text-[#111] md:text-[13px]">
              Every recovery decision, action and transaction state change —
              recorded in one transparent timeline.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <a
              href="/command-center"
              className="group flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-3 text-[10px] font-black transition hover:border-[#5f5cff] hover:text-[#5f5cff]"
            >
              <ArrowLeft size={13} />
              BACK TO COMMAND CENTER
            </a>

            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="group flex items-center gap-2 rounded-full bg-[#111] px-5 py-3 text-[10px] font-black text-white transition hover:bg-[#5f5cff] disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={loading ? "animate-spin" : ""}
              />
              REFRESH AUDIT
            </button>

          </div>

        </div>

        {/* STATUS STRIP */}

        <div className="mt-10 flex flex-wrap items-center gap-3">

          <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-[#72d89b]" />
            <span className="text-[8px] font-black tracking-[0.12em]">
              AUDIT SYSTEM ONLINE
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[#111] px-4 py-2 text-white">
            <ShieldCheck size={11} />
            <span className="text-[8px] font-black tracking-[0.12em]">
              FULL AUDIT TRAIL
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[#5f5cff] px-4 py-2 text-white">
            <Sparkles size={11} />
            <span className="text-[8px] font-black tracking-[0.12em]">
              RECOVERY INTELLIGENCE
            </span>
          </div>

        </div>

        {/* STATS */}

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            label="AUDIT EVENTS"
            value={loading ? "—" : String(allEvents.length)}
            icon={<FileSearch size={17} />}
          />

          <StatCard
            label="RECOVERY ACTIONS"
            value={loading ? "—" : String(recoveryActions)}
            icon={<Zap size={17} />}
            purple
          />

          <StatCard
            label="PAYMENTS RECOVERED"
            value={loading ? "—" : String(recoveredEvents)}
            icon={<Check size={17} />}
            success
          />

          <StatCard
            label="REVIEW REQUIRED"
            value={loading ? "—" : String(reviewEvents)}
            icon={<ShieldCheck size={17} />}
          />

        </div>

        {/* AUDIT PANEL */}

        <section className="mt-6 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_25px_80px_rgba(0,0,0,0.06)]">

          {/* PANEL HEADER */}

          <div className="border-b border-black/10 p-6 md:p-8">

            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">

              <div>

                <div className="text-[8px] font-black tracking-[0.2em] text-[#5f5cff]">
                  EVENT HISTORY
                </div>

                <div className="mt-2 text-[24px] font-black tracking-[-0.04em]">
                  Recovery activity
                </div>

                <p className="mt-1 text-[10px] font-medium text-[#111]">
                  Immutable record of what Recovr detected, decided and executed.
                </p>

              </div>

              <div className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-[#f5f5f0] px-4 py-3.5 lg:w-[330px]">

                <Search
                  size={15}
                  className="shrink-0 text-[#111]"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search payment, customer, event..."
                  className="w-full bg-transparent text-[10px] font-bold text-[#111] outline-none placeholder:text-[#111]"
                />

              </div>

            </div>

          </div>

          {/* LOADING */}

          {loading && (
            <div className="flex flex-col items-center justify-center px-6 py-20">

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5f5cff]/10">
                <RefreshCw
                  size={19}
                  className="animate-spin text-[#5f5cff]"
                />
              </div>

              <div className="mt-5 text-[13px] font-black">
                Loading audit events
              </div>

              <div className="mt-1 text-[9px] font-bold text-[#111]">
                Reading recovery activity...
              </div>

            </div>
          )}

          {/* EMPTY */}

          {!loading && filteredEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111] text-white">
                <Search size={19} />
              </div>

              <div className="mt-5 text-[14px] font-black">
                No audit events found
              </div>

              <div className="mt-2 max-w-[400px] text-[10px] font-medium leading-5 text-[#111]">
                {search
                  ? "Try a different payment ID, customer, action or event."
                  : "Recovery activity will appear here when transactions are processed."}
              </div>

            </div>
          )}

          {/* EVENTS */}

          {!loading && filteredEvents.length > 0 && (
            <div>

              {/* DESKTOP HEAD */}

              <div className="hidden grid-cols-[1fr_1.2fr_0.8fr_1.2fr_1fr] gap-4 border-b border-black/10 bg-[#111] px-7 py-3 text-[8px] font-black tracking-[0.16em] text-white md:grid">

                <span>PAYMENT</span>
                <span>CUSTOMER</span>
                <span>AMOUNT</span>
                <span>EVENT</span>
                <span>TIME</span>

              </div>

              {filteredEvents.map((event) => {

                const style = getEventStyle(
                  event.eventType
                );

                return (
                  <div
                    key={event.id}
                    className="border-b border-black/10 p-5 transition hover:bg-[#f5f5f0] md:px-7 md:py-6"
                  >

                    <div className="grid gap-5 md:grid-cols-[1fr_1.2fr_0.8fr_1.2fr_1fr] md:items-center">

                      {/* PAYMENT */}

                      <div>

                        <div className="text-[7px] font-black tracking-[0.15em] text-[#111] md:hidden">
                          PAYMENT
                        </div>

                        <div className="mt-1 text-[11px] font-black">
                          {event.paymentId}
                        </div>

                      </div>

                      {/* CUSTOMER */}

                      <div>

                        <div className="text-[7px] font-black tracking-[0.15em] text-[#111] md:hidden">
                          CUSTOMER
                        </div>

                        <div className="mt-1 break-all text-[10px] font-bold">
                          {event.customerEmail}
                        </div>

                      </div>

                      {/* AMOUNT */}

                      <div>

                        <div className="text-[7px] font-black tracking-[0.15em] text-[#111] md:hidden">
                          AMOUNT
                        </div>

                        <div className="mt-1 text-[18px] font-black tracking-[-0.04em]">
                          {formatINR(event.amount)}
                        </div>

                      </div>

                      {/* EVENT */}

                      <div>

                        <div className="text-[7px] font-black tracking-[0.15em] text-[#111] md:hidden">
                          EVENT
                        </div>

                        <div className="mt-1">

                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[8px] font-black ${style.badge}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${style.badge.includes(
                                "bg-[#5f5cff]"
                              )
                                ? "bg-white"
                                : "bg-current"
                              }`}
                            />

                            {formatEventType(
                              event.eventType
                            )}
                          </span>

                        </div>

                      </div>

                      {/* TIME */}

                      <div>

                        <div className="text-[7px] font-black tracking-[0.15em] text-[#111] md:hidden">
                          TIME
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-[9px] font-bold">
                          <Clock3 size={12} />
                          {formatDate(event.createdAt)}
                        </div>

                      </div>

                    </div>

                    {/* EVENT DETAIL */}

                    <div
                      className={`mt-5 rounded-2xl border p-4 ${style.container}`}
                    >

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[9px] font-bold">

                          <span>
                            ACTION:
                          </span>

                          <span className="font-black text-[#5f5cff]">
                            {formatAction(event.action)}
                          </span>

                          {event.message && (
                            <>
                              <span className="hidden text-[#111]/30 sm:inline">
                                •
                              </span>

                              <span className="font-medium">
                                {event.message}
                              </span>
                            </>
                          )}

                        </div>

                        <div className="flex flex-wrap gap-2">

                          <MiniTag
                            label="STATUS"
                            value={event.transactionStatus}
                          />

                          <MiniTag
                            label="RECOVERABLE"
                            value={
                              event.recoverable
                                ? "YES"
                                : "NO"
                            }
                            success={
                              event.recoverable
                            }
                          />

                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </section>

        {/* FOOTER STATUS */}

        <div className="mt-8 flex flex-col justify-between gap-4 rounded-[22px] bg-[#111] px-6 py-5 text-white md:flex-row md:items-center">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5f5cff]">
              <ShieldCheck size={15} />
            </div>

            <div>
              <div className="text-[9px] font-black tracking-[0.15em]">
                AUDIT INTEGRITY
              </div>

              <div className="mt-1 text-[8px] font-medium text-white/60">
                Recovery actions are recorded for full traceability.
              </div>
            </div>

          </div>

          <div className="text-[8px] font-black tracking-[0.12em] text-white/50">
            RECOVR · RAZORPAY TEST MODE · DEMO ENVIRONMENT
          </div>

        </div>

      </div>
    </main>
  );
}

/* ---------------------------------- */
/* STAT CARD */
/* ---------------------------------- */

function StatCard({
  label,
  value,
  icon,
  purple = false,
  success = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  purple?: boolean;
  success?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${
        purple
          ? "border-[#5f5cff]/20 bg-[#5f5cff]/5"
          : success
            ? "border-[#72d89b]/30 bg-white"
            : "border-black/10 bg-white"
      }`}
    >

      <div className="flex items-center justify-between">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            purple
              ? "bg-[#5f5cff] text-white"
              : success
                ? "bg-[#72d89b] text-[#111]"
                : "bg-[#111] text-white"
          }`}
        >
          {icon}
        </div>

        {success && (
          <div className="rounded-full bg-[#72d89b]/20 px-2 py-1 text-[7px] font-black text-[#177245]">
            LIVE
          </div>
        )}

      </div>

      <div className="mt-7 text-[8px] font-black tracking-[0.17em] text-[#111]">
        {label}
      </div>

      <div className="mt-2 text-[34px] font-black tracking-[-0.06em]">
        {value}
      </div>

    </div>
  );
}

/* ---------------------------------- */
/* MINI TAG */
/* ---------------------------------- */

function MiniTag({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div
      className={`rounded-full px-3 py-1.5 text-[7px] font-black ${
        success
          ? "bg-[#72d89b] text-[#111]"
          : "bg-[#111] text-white"
      }`}
    >
      {label}: {value}
    </div>
  );
}