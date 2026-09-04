"use client";

import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";

const fadeUp = {
  initial: {
    opacity: 0,
    y: 28,
  },
  whileInView: {
    opacity: 1,
    y: 0,
  },
  viewport: {
    once: true,
    amount: 0.2,
  },
  transition: {
    duration: 0.65,
    ease: "easeOut" as const,
  },
};

const stagger = {
  initial: {
    opacity: 0,
    y: 20,
  },
  whileInView: {
    opacity: 1,
    y: 0,
  },
  viewport: {
    once: true,
    amount: 0.15,
  },
  transition: {
    duration: 0.55,
    ease: "easeOut" as const,
  },
};

const challenges = [
  {
    number: "01",
    title: "Payment Failures",
    description:
      "Temporary failures, issuer declines and technical errors can turn successful transactions into revenue at risk.",
    icon: CreditCard,
    metric: "₹2.10L",
    metricLabel: "revenue at risk",
  },
  {
    number: "02",
    title: "Checkout Drop-offs",
    description:
      "Customers can disappear before completing a purchase, leaving recoverable revenue sitting outside the payment flow.",
    icon: WalletCards,
    metric: "18.4%",
    metricLabel: "drop-off detected",
  },
  {
    number: "03",
    title: "Recurring Failures",
    description:
      "Subscription and recurring-payment failures can quietly create revenue leakage month after month.",
    icon: Clock3,
    metric: "₹1.30L",
    metricLabel: "monthly exposure",
  },
  {
    number: "04",
    title: "Payment Degradation",
    description:
      "A sudden failure spike can indicate a wider payment-method, bank or gateway problem rather than individual customer failures.",
    icon: TrendingUp,
    metric: "34%",
    metricLabel: "failure spike",
  },
];

const recoverySteps = [
  {
    number: "01",
    title: "Detect",
    text: "Identify abnormal payment behaviour and revenue leakage across transaction patterns.",
  },
  {
    number: "02",
    title: "Diagnose",
    text: "Understand why revenue is at risk using payment context, history and failure signals.",
  },
  {
    number: "03",
    title: "Decide",
    text: "Determine which recovery action has the highest expected value.",
  },
  {
    number: "04",
    title: "Recover",
    text: "Execute only actions that pass predefined policy boundaries.",
  },
];

const cases = [
  {
    id: "RCV-2847",
    amount: "₹12,499",
    type: "Payment Failure",
    probability: "87%",
    status: "Retry Scheduled",
  },
  {
    id: "RCV-1842",
    amount: "₹8,750",
    type: "Checkout Abandoned",
    probability: "72%",
    status: "Payment Link",
  },
  {
    id: "RCV-7312",
    amount: "₹24,200",
    type: "Subscription Failure",
    probability: "91%",
    status: "Retry After 6H",
  },
];

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);

  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  /*
   * CREATE DEMO TRANSACTIONS
   *
   * These are stored in the same database through
   * the existing POST /api/transactions endpoint.
   */
  async function createDemoTransactions() {
    if (loadingDemo) return;

    setLoadingDemo(true);
    setDemoMessage("");

    const transactions = [
      {
        customerEmail: "demo1@recovr.com",
        amount: 500,
        currency: "INR",
        failureReason: "INSUFFICIENT_FUNDS",
      },
      {
        customerEmail: "demo2@recovr.com",
        amount: 2000,
        currency: "INR",
        failureReason: "CARD_DECLINED",
      },
      {
        customerEmail: "demo3@recovr.com",
        amount: 5000,
        currency: "INR",
        failureReason: "NETWORK_ERROR",
      },
      {
        customerEmail: "demo4@recovr.com",
        amount: 1500,
        currency: "INR",
        failureReason: "PAYMENT_TIMEOUT",
      },
    ];

    try {
      for (const transaction of transactions) {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transaction),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to create ₹${transaction.amount} transaction`
          );
        }
      }

      setDemoMessage(
        "4 demo transactions created successfully."
      );
    } catch (error) {
      console.error("Demo transaction creation failed:", error);

      setDemoMessage(
        "Unable to create demo transactions. Please try again."
      );
    } finally {
      setLoadingDemo(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f5f0] text-[#111]">
      {/* NAVIGATION */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-black/10 bg-[#f5f5f0]/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 md:px-8">
          <a
            href="/"
            className="text-[20px] font-black tracking-[-0.08em]"
          >
            RECO
            <span className="text-[#5f5cff]">VR</span>
          </a>

          <div className="hidden items-center gap-8 text-[10px] font-bold md:flex">
            <a href="#platform">Platform</a>

            <a href="#recovery">How It Works</a>

            <a href="#intelligence">Intelligence</a>

            <a href="/dashboard">Dashboard</a>

            <a href="#results">Results</a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="hidden text-[10px] font-bold sm:block"
            >
              Sign In
            </a>

            <a
              href="/dashboard"
              className="group flex items-center gap-2 rounded-full bg-[#111] px-4 py-2.5 text-[10px] font-bold text-white transition hover:bg-[#5f5cff]"
            >
              Enter Recovr
              <ArrowRight
                size={12}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </a>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative flex min-h-screen items-center px-5 pb-20 pt-32 md:px-8"
      >
        <motion.div
          style={{
            y: heroY,
            opacity: heroOpacity,
          }}
          className="mx-auto w-full max-w-[1500px]"
        >
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            {/* HERO COPY */}
            <div>
              <motion.div {...fadeUp}>
                <div className="mb-7 flex items-center gap-3">
                  <span className="h-px w-8 bg-[#5f5cff]" />

                  <span className="text-[9px] font-black tracking-[0.22em] text-[#5f5cff]">
                    AI REVENUE RECOVERY
                  </span>
                </div>
              </motion.div>

              <motion.h1
                {...fadeUp}
                transition={{
                  duration: 0.7,
                  delay: 0.08,
                  ease: "easeOut",
                }}
                className="max-w-[760px] text-[62px] font-black leading-[0.91] tracking-[-0.075em] sm:text-[82px] lg:text-[105px]"
              >
                Find revenue
                <br />
                <span className="text-[#5f5cff]">at risk.</span>
                <br />
                Bring it back.
              </motion.h1>

              <motion.p
                {...fadeUp}
                transition={{
                  duration: 0.65,
                  delay: 0.18,
                  ease: "easeOut",
                }}
                className="mt-8 max-w-[570px] text-[13px] leading-6 md:text-[14px]"
              >
                Recovr detects revenue slipping through failed payments,
                abandoned checkouts and recurring failures — then determines
                the right next action, executes it within defined boundaries
                and measures what comes back.
              </motion.p>

              {/* BUTTONS */}
              <motion.div
                {...fadeUp}
                transition={{
                  duration: 0.65,
                  delay: 0.26,
                  ease: "easeOut",
                }}
                className="mt-9 flex flex-wrap items-center gap-3"
              >
                <a
                  href="/command-center"
                  className="group flex items-center gap-3 rounded-full bg-[#111] px-6 py-3.5 text-[11px] font-bold text-white transition hover:bg-[#5f5cff]"
                >
                  Enter Recovery Command Center

                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </a>

                <a
                  href="#recovery"
                  className="flex items-center gap-2 rounded-full border border-black/15 px-6 py-3.5 text-[11px] font-bold transition hover:bg-white"
                >
                  See how it works
                  <ChevronRight size={13} />
                </a>
              </motion.div>

              {/* DEMO TRANSACTION BUTTON */}
              <motion.div
                {...fadeUp}
                transition={{
                  duration: 0.65,
                  delay: 0.32,
                  ease: "easeOut",
                }}
                className="mt-4"
              >
                <button
                  onClick={createDemoTransactions}
                  disabled={loadingDemo}
                  className="group inline-flex items-center gap-3 rounded-full border border-[#5f5cff]/30 bg-[#5f5cff]/5 px-6 py-3.5 text-[11px] font-black text-[#5f5cff] transition hover:bg-[#5f5cff] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingDemo ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating Demo Transactions...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Load Demo Transactions
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>

                {demoMessage && (
                  <div
                    className={`mt-3 text-[9px] font-bold ${
                      demoMessage.includes("successfully")
                        ? "text-[#177245]"
                        : "text-red-600"
                    }`}
                  >
                    {demoMessage}
                  </div>
                )}

                <p className="mt-2 text-[8px] text-black/40">
                  Creates 4 failed demo payments in the RECOVR database.
                </p>
              </motion.div>

              <motion.div
                {...fadeUp}
                transition={{
                  duration: 0.6,
                  delay: 0.4,
                  ease: "easeOut",
                }}
                className="mt-8 flex items-center gap-6 text-[9px] font-bold"
              >
                <div className="flex items-center gap-2">
                  <Check size={12} className="text-[#5f5cff]" />
                  Bounded actions
                </div>

                <div className="flex items-center gap-2">
                  <Check size={12} className="text-[#5f5cff]" />
                  Explainable decisions
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <Check size={12} className="text-[#5f5cff]" />
                  Full audit trail
                </div>
              </motion.div>
            </div>

            {/* HERO VISUAL */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.96,
                y: 30,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{
                duration: 0.8,
                delay: 0.25,
                ease: "easeOut",
              }}
              className="relative mx-auto w-full max-w-[620px]"
            >
              <FloatingLabel
                className="left-[-15px] top-[14%] hidden sm:flex"
                icon={<CircleAlert size={12} />}
                text="PAYMENT FAILED"
              />

              <FloatingLabel
                className="right-[-15px] top-[27%] hidden sm:flex"
                icon={<TrendingUp size={12} />}
                text="₹12,499 AT RISK"
              />

              <FloatingLabel
                className="bottom-[20%] left-[-20px] hidden sm:flex"
                icon={<Clock3 size={12} />}
                text="RETRY SCHEDULED"
              />

              <FloatingLabel
                className="bottom-[10%] right-[-10px] hidden sm:flex"
                icon={<Check size={12} />}
                text="RECOVERED"
                success
              />

              <div className="relative rounded-[30px] border border-black/10 bg-white p-5 shadow-[0_30px_100px_rgba(0,0,0,0.08)] sm:p-7">
                <div className="flex items-center justify-between border-b border-black/8 pb-5">
                  <div>
                    <div className="text-[8px] font-black tracking-[0.2em]">
                      RECOVERY CASE
                    </div>

                    <div className="mt-1 text-[11px] font-bold">
                      RCV-2847
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-full bg-[#eaf8ef] px-3 py-1.5 text-[8px] font-bold text-[#177245]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#177245]" />
                    ACTIVE
                  </div>
                </div>

                <div className="py-7">
                  <div className="text-[54px] font-black tracking-[-0.07em] sm:text-[66px]">
                    ₹12,499
                  </div>

                  <div className="mt-1 text-[9px] font-bold tracking-[0.15em]">
                    REVENUE AT RISK
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <CaseMini
                    label="FAILURE"
                    value="Insufficient funds"
                    icon={<CircleAlert size={13} />}
                  />

                  <CaseMini
                    label="RECOVERY PROBABILITY"
                    value="87%"
                    icon={<TrendingUp size={13} />}
                    purple
                  />

                  <CaseMini
                    label="RECOVERY DECISION"
                    value="Retry after 24H"
                    icon={<Sparkles size={13} />}
                  />

                  <CaseMini
                    label="ATTEMPTS"
                    value="01 OF 03"
                    icon={<Zap size={13} />}
                  />
                </div>

                <div className="mt-3 rounded-2xl bg-[#111] p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[8px] font-bold tracking-[0.16em] text-white/35">
                        NEXT ACTION
                      </div>

                      <div className="mt-2 text-[13px] font-black">
                        Scheduled recovery retry
                      </div>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                      <ArrowRight size={14} />
                    </div>
                  </div>

                  <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "66%" }}
                      transition={{
                        duration: 1.2,
                        delay: 0.8,
                        ease: "easeOut",
                      }}
                      className="h-full rounded-full bg-[#9693ff]"
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[8px] text-white/30">
                    <span>ATTEMPT 01</span>
                    <span>ATTEMPT 03</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex">
          <span className="text-[8px] font-bold tracking-[0.2em]">
            SCROLL TO EXPLORE
          </span>

          <div className="flex h-8 w-5 items-start justify-center rounded-full border border-black/20 p-1">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="h-1.5 w-1 rounded-full bg-black/50"
            />
          </div>
        </div>
      </section>

      {/* CHALLENGE */}
      <section
        id="platform"
        className="border-t border-black/10"
      >
        <div className="mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-32">
          <motion.div {...fadeUp}>
            <div className="text-[9px] font-black tracking-[0.2em] text-[#5f5cff]">
              THE CHALLENGE
            </div>

            <h2 className="mt-5 max-w-[850px] text-[48px] font-black leading-[0.94] tracking-[-0.065em] md:text-[76px]">
              Revenue doesn't
              <br />
              disappear in one place.
            </h2>

            <p className="mt-7 max-w-[600px] text-[13px] leading-6">
              Payment failures, abandoned checkouts, recurring failures and
              sudden degradation all create different forms of revenue
              leakage. Recovr brings those signals into one recovery system.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {challenges.map((item, index) => (
              <motion.div
                key={item.number}
                {...stagger}
                transition={{
                  duration: 0.55,
                  delay: index * 0.08,
                  ease: "easeOut",
                }}
                className="group relative min-h-[330px] overflow-hidden rounded-[24px] border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[9px] font-black tracking-[0.18em]">
                    {item.number}
                  </span>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f5f0] transition group-hover:bg-[#5f5cff] group-hover:text-white">
                    <item.icon size={17} strokeWidth={1.8} />
                  </div>
                </div>

                <div className="mt-16">
                  <h3 className="text-[21px] font-black tracking-[-0.04em]">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-[10px] leading-5">
                    {item.description}
                  </p>
                </div>

                <div className="absolute bottom-6 left-6 right-6 border-t border-black/8 pt-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[18px] font-black tracking-[-0.04em]">
                        {item.metric}
                      </div>

                      <div className="mt-1 text-[7px] font-bold tracking-[0.15em]">
                        {item.metricLabel}
                      </div>
                    </div>

                    <ArrowDownRight
                      size={15}
                      className="transition group-hover:translate-x-1 group-hover:translate-y-1 group-hover:text-[#5f5cff]"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSFORMATION */}
      <section
        id="recovery"
        className="bg-[#111] text-white"
      >
        <div className="mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-32">
          <motion.div {...fadeUp}>
            <div className="text-[9px] font-black tracking-[0.2em] text-[#9693ff]">
              THE RECOVERY LOOP
            </div>

            <h2 className="mt-5 max-w-[900px] text-[48px] font-black leading-[0.94] tracking-[-0.065em] md:text-[78px]">
              From revenue
              <br />
              <span className="text-[#9693ff]">at risk.</span>
              <br />
              To the right next move.
            </h2>
          </motion.div>

          <div className="mt-20 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
            <motion.div
              {...fadeUp}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7"
            >
              <div className="text-[8px] font-bold tracking-[0.18em] text-white/30">
                INPUT
              </div>

              <div className="mt-8 text-[45px] font-black tracking-[-0.07em]">
                ₹12,499
              </div>

              <div className="mt-1 text-[9px] font-bold tracking-[0.15em] text-white/30">
                PAYMENT AT RISK
              </div>

              <div className="mt-10 space-y-3">
                <DarkSignal
                  icon={<CircleAlert size={13} />}
                  label="Payment failure"
                  value="Insufficient funds"
                />

                <DarkSignal
                  icon={<Clock3 size={13} />}
                  label="Customer history"
                  value="7 / 8 successful"
                />

                <DarkSignal
                  icon={<TrendingUp size={13} />}
                  label="Recoverability"
                  value="87%"
                  purple
                />
              </div>
            </motion.div>

            <motion.div
              {...fadeUp}
              className="relative rounded-[28px] bg-[#f5f5f0] p-7 text-[#111] md:p-9"
            >
              <div className="text-[8px] font-bold tracking-[0.18em]">
                RECOVR DECISION ENGINE
              </div>

              <div className="mt-7 space-y-4">
                {recoverySteps.map((step, index) => (
                  <div
                    key={step.number}
                    className="flex gap-5 border-b border-black/8 pb-5 last:border-0"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111] text-[8px] font-bold text-white">
                      {step.number}
                    </div>

                    <div>
                      <div className="text-[14px] font-black">
                        {step.title}
                      </div>

                      <p className="mt-1 max-w-[480px] text-[9px] leading-5">
                        {step.text}
                      </p>
                    </div>

                    {index === recoverySteps.length - 1 && (
                      <Check
                        size={15}
                        className="ml-auto text-[#177245]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* INTELLIGENCE */}
      <section id="intelligence">
        <div className="mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-32">
          <motion.div {...fadeUp}>
            <div className="text-[9px] font-black tracking-[0.2em] text-[#5f5cff]">
              RECOVERY INTELLIGENCE
            </div>

            <h2 className="mt-5 max-w-[850px] text-[48px] font-black leading-[0.94] tracking-[-0.065em] md:text-[76px]">
              Every failure
              <br />
              has context.
              <br />
              <span className="text-[#5f5cff]">Use it.</span>
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-5 lg:grid-cols-2">
            <motion.div
              {...fadeUp}
              className="rounded-[28px] border border-black/10 bg-white p-7"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[8px] font-black tracking-[0.18em]">
                    RECOVERY INTELLIGENCE
                  </div>

                  <div className="mt-2 text-[20px] font-black">
                    Case analysis
                  </div>
                </div>

                <Sparkles
                  size={18}
                  className="text-[#5f5cff]"
                />
              </div>

              <div className="mt-8 grid grid-cols-2 gap-2">
                <InfoBox
                  label="CUSTOMER"
                  value="Ananya Sharma"
                />

                <InfoBox
                  label="AMOUNT"
                  value="₹12,499"
                />

                <InfoBox
                  label="FAILURE"
                  value="Insufficient funds"
                />

                <InfoBox
                  label="PREVIOUS RECOVERY"
                  value="1 successful retry"
                />
              </div>

              <div className="mt-2 rounded-2xl bg-[#111] p-5 text-white">
                <div className="text-[8px] font-bold tracking-[0.18em] text-white/30">
                  RECOVERY PROBABILITY
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <span className="text-[42px] font-black tracking-[-0.06em]">
                    87%
                  </span>

                  <span className="mb-2 text-[9px] font-bold text-[#72d89b]">
                    HIGH
                  </span>
                </div>

                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[87%] rounded-full bg-[#9693ff]" />
                </div>
              </div>
            </motion.div>

            <motion.div
              {...fadeUp}
              className="rounded-[28px] border border-black/10 bg-white p-7"
            >
              <div className="text-[8px] font-black tracking-[0.18em]">
                EXPLAINABILITY
              </div>

              <div className="mt-2 text-[20px] font-black">
                Why this action?
              </div>

              <div className="mt-8 space-y-2">
                <ExplainRow
                  label="Failure type"
                  value="Temporary"
                  positive
                />

                <ExplainRow
                  label="Previous retry"
                  value="Successful"
                  positive
                />

                <ExplainRow
                  label="Customer history"
                  value="High confidence"
                  positive
                />

                <ExplainRow
                  label="Retry limit"
                  value="2 remaining"
                  positive
                />

                <ExplainRow
                  label="Stopping rule"
                  value="Maximum 3 attempts"
                  positive
                />
              </div>

              <div className="mt-5 rounded-2xl bg-[#f5f5f0] p-5">
                <div className="flex items-center gap-2 text-[9px] font-bold text-[#177245]">
                  <ShieldCheck size={13} />
                  POLICY CHECK PASSED
                </div>

                <p className="mt-2 text-[9px] leading-5">
                  Recommended action remains within the configured recovery
                  boundaries.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* COMMAND CENTER */}
      <section className="border-t border-black/10">
        <div className="mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-32">
          <motion.div {...fadeUp}>
            <div className="text-[9px] font-black tracking-[0.2em] text-[#5f5cff]">
              RECOVERY COMMAND CENTER
            </div>

            <h2 className="mt-5 max-w-[850px] text-[48px] font-black leading-[0.94] tracking-[-0.065em] md:text-[76px]">
              Every at-risk transaction.
              <br />
              <span className="text-[#5f5cff]">
                One place to act.
              </span>
            </h2>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="mt-14 overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_25px_80px_rgba(0,0,0,0.06)]"
          >
            <div className="flex flex-col gap-4 border-b border-black/8 p-5 md:flex-row md:items-center md:justify-between md:p-7">
              <div>
                <div className="text-[8px] font-bold tracking-[0.18em]">
                  ACTIVE RECOVERY CASES
                </div>

                <div className="mt-2 text-[19px] font-black">
                  Recovery Queue
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 md:w-[280px]">
                <Search size={13} />

                <span className="text-[9px]">
                  Search transaction ID, customer...
                </span>
              </div>
            </div>

            <div className="hidden grid-cols-[1fr_1fr_1fr_0.7fr_1fr] gap-4 border-b border-black/7 px-7 py-3 text-[8px] font-bold tracking-[0.16em] md:grid">
              <span>CASE</span>
              <span>TYPE</span>
              <span>AMOUNT</span>
              <span>RECOVERY</span>
              <span>ACTION</span>
            </div>

            {cases.map((item, index) => (
              <div
                key={item.id}
                className="grid gap-4 border-b border-black/7 p-5 last:border-0 md:grid-cols-[1fr_1fr_1fr_0.7fr_1fr] md:items-center md:px-7"
              >
                <div>
                  <div className="text-[8px] md:hidden">
                    CASE
                  </div>

                  <div className="mt-1 text-[10px] font-bold">
                    {item.id}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] md:hidden">
                    TYPE
                  </div>

                  <div className="mt-1 text-[10px] font-semibold">
                    {item.type}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] md:hidden">
                    AMOUNT
                  </div>

                  <div className="mt-1 text-[15px] font-black">
                    {item.amount}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] md:hidden">
                    RECOVERY
                  </div>

                  <div className="mt-1 text-[11px] font-black text-[#5f5cff]">
                    {item.probability}
                  </div>
                </div>

                <div>
                  <div className="text-[8px] md:hidden">
                    ACTION
                  </div>

                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1.5 text-[8px] font-bold ${
                      index === 2
                        ? "bg-[#f5f5f0] text-black"
                        : "bg-[#eaf8ef] text-[#177245]"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* BOUNDED WORKFLOW */}
      <section className="bg-[#111] text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-32">
          <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
            <motion.div {...fadeUp}>
              <div className="text-[9px] font-black tracking-[0.2em] text-[#9693ff]">
                BOUNDED RECOVERY
              </div>

              <h2 className="mt-5 text-[48px] font-black leading-[0.94] tracking-[-0.065em] md:text-[70px]">
                AI can decide.
                <br />
                <span className="text-[#9693ff]">
                  Rules decide whether it acts.
                </span>
              </h2>

              <p className="mt-7 max-w-[500px] text-[12px] leading-6 text-white/40">
                Recovr keeps recovery actions controlled with explicit
                limits, stopping rules and policy checks before anything is
                executed.
              </p>
            </motion.div>

            <motion.div {...fadeUp}>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
                <div className="flex items-center justify-between border-b border-white/8 pb-5">
                  <div>
                    <div className="text-[8px] font-bold tracking-[0.18em] text-white/30">
                      POLICY ENGINE
                    </div>

                    <div className="mt-2 text-[18px] font-black">
                      Recovery boundaries
                    </div>
                  </div>

                  <ShieldCheck
                    size={19}
                    className="text-[#72d89b]"
                  />
                </div>

                <div className="mt-5 space-y-1">
                  <PolicyDark
                    label="Maximum attempts"
                    value="3"
                    icon={<Zap size={13} />}
                  />

                  <PolicyDark
                    label="Minimum confidence"
                    value="75%"
                    icon={<Sparkles size={13} />}
                  />

                  <PolicyDark
                    label="Maximum transaction"
                    value="₹50,000"
                    icon={<CreditCard size={13} />}
                  />

                  <PolicyDark
                    label="Duplicate actions"
                    value="BLOCKED"
                    icon={<X size={13} />}
                  />

                  <PolicyDark
                    label="Human escalation"
                    value="ENABLED"
                    icon={<ShieldCheck size={13} />}
                  />
                </div>

                <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#72d89b]/10 p-4">
                  <div className="flex items-center gap-2 text-[9px] font-bold text-[#72d89b]">
                    <Check size={13} />
                    System healthy
                  </div>

                  <span className="text-[8px] text-white/30">
                    0 violations
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section id="results">
        <div className="mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-32">
          <motion.div {...fadeUp}>
            <div className="text-[9px] font-black tracking-[0.2em] text-[#5f5cff]">
              MEASURED RECOVERY
            </div>

            <h2 className="mt-5 max-w-[850px] text-[48px] font-black leading-[0.94] tracking-[-0.065em] md:text-[76px]">
              Don't just identify
              <br />
              lost revenue.
              <br />
              <span className="text-[#5f5cff]">
                Show what came back.
              </span>
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-3 md:grid-cols-3">
            <ResultCard
              value="₹5.82L"
              label="Revenue at risk"
              text="Transactions identified for potential recovery."
            />

            <ResultCard
              value="₹2.14L"
              label="Recovered"
              text="Revenue successfully returned through recovery actions."
              purple
            />

            <ResultCard
              value="36.9%"
              label="Recovery rate"
              text="Measured recovery across the processed transaction batch."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-black/10">
        <div className="mx-auto max-w-[1500px] px-5 py-28 md:px-8 md:py-36">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-[32px] bg-[#111] px-7 py-16 text-white md:px-16 md:py-24"
          >
            <div className="absolute right-[-100px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[#5f5cff]/20 blur-3xl" />

            <div className="relative max-w-[900px]">
              <div className="text-[9px] font-black tracking-[0.2em] text-[#9693ff]">
                RECOVR
              </div>

              <h2 className="mt-5 text-[48px] font-black leading-[0.92] tracking-[-0.065em] md:text-[78px]">
                Revenue doesn't
                <br />
                have to stay lost.
              </h2>

              <p className="mt-7 max-w-[580px] text-[12px] leading-6 text-white/40">
                Detect what's slipping away. Understand why. Take the right
                next action. Stop when the boundaries say stop.
              </p>

              <div className="mt-9">
                <a
                  href="/dashboard"
                  className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-[10px] font-black text-[#111] transition hover:bg-[#9693ff]"
                >
                  Enter Recovery Command Center

                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-7 text-[9px] md:flex-row md:items-center md:justify-between md:px-8">
          <div className="font-black tracking-[-0.04em]">
            RECO
            <span className="text-[#5f5cff]">VR</span>
          </div>

          <div>AI Revenue Recovery Control Tower</div>

          <div>Razorpay Test Mode · Demo Environment</div>
        </div>
      </footer>
    </main>
  );
}

/* ---------------------------------- */
/* SMALL COMPONENTS                   */
/* ---------------------------------- */

function FloatingLabel({
  className,
  icon,
  text,
  success = false,
}: {
  className: string;
  icon: React.ReactNode;
  text: string;
  success?: boolean;
}) {
  return (
    <motion.div
      animate={{
        y: [0, -8, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`absolute z-10 items-center gap-2 rounded-full border px-3 py-2 text-[8px] font-black tracking-[0.08em] shadow-lg backdrop-blur-md ${
        success
          ? "border-[#72d89b]/20 bg-[#eaf8ef] text-[#177245]"
          : "border-black/10 bg-white/90 text-black/60"
      } ${className}`}
    >
      {icon}
      {text}
    </motion.div>
  );
}

function CaseMini({
  label,
  value,
  icon,
  purple = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  purple?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#f5f5f0] p-4">
      <div className="flex items-center gap-2 text-[8px] font-bold tracking-[0.12em]">
        {icon}
        {label}
      </div>

      <div
        className={`mt-3 text-[11px] font-black ${
          purple ? "text-[#5f5cff]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function DarkSignal({
  icon,
  label,
  value,
  purple = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  purple?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div className="text-white/30">{icon}</div>

        <span className="text-[9px] font-bold text-white/40">
          {label}
        </span>
      </div>

      <span
        className={`text-[10px] font-black ${
          purple
            ? "text-[#9693ff]"
            : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f5f5f0] p-4">
      <div className="text-[7px] font-bold tracking-[0.13em]">
        {label}
      </div>

      <div className="mt-2 text-[10px] font-black">
        {value}
      </div>
    </div>
  );
}

function ExplainRow({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-black/7 py-4">
      <span className="text-[9px]">
        {label}
      </span>

      <span className="flex items-center gap-2 text-[9px] font-bold">
        {positive && (
          <Check
            size={12}
            className="text-[#177245]"
          />
        )}

        {value}
      </span>
    </div>
  );
}

function PolicyDark({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 py-4">
      <div className="flex items-center gap-3">
        <span className="text-white/25">
          {icon}
        </span>

        <span className="text-[9px] text-white/40">
          {label}
        </span>
      </div>

      <span className="text-[10px] font-black">
        {value}
      </span>
    </div>
  );
}

function ResultCard({
  value,
  label,
  text,
  purple = false,
}: {
  value: string;
  label: string;
  text: string;
  purple?: boolean;
}) {
  return (
    <motion.div
      {...fadeUp}
      className={`rounded-[24px] border p-7 ${
        purple
          ? "border-[#5f5cff]/20 bg-[#5f5cff]/5"
          : "border-black/10 bg-white"
      }`}
    >
      <div
        className={`text-[45px] font-black tracking-[-0.07em] ${
          purple
            ? "text-[#5f5cff]"
            : ""
        }`}
      >
        {value}
      </div>

      <div className="mt-3 text-[9px] font-black tracking-[0.15em]">
        {label}
      </div>

      <p className="mt-3 text-[10px] leading-5">
        {text}
      </p>
    </motion.div>
  );
}