"use client";

import { useState } from "react";

export default function DemoPage() {
  const [amount, setAmount] = useState("2000");
  const [email, setEmail] = useState("demo@recovr.com");
  const [reason, setReason] =
    useState("INSUFFICIENT_FUNDS");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function createDemoTransaction() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        "/api/demo/transaction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Number(amount),
            customerEmail: email,
            failureReason: reason,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Failed to create demo transaction."
        );
      }

      setMessage(
        `Demo transaction created successfully: ${result.transaction.paymentId}`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f0] px-5 py-10 text-[#111]">
      <div className="mx-auto max-w-2xl">

        <div className="text-[10px] font-bold tracking-[0.2em] text-[#5f5cff]">
          RECOVR DEMO ENVIRONMENT
        </div>

        <h1 className="mt-3 text-5xl font-black tracking-[-0.06em]">
          Create Demo Transaction
        </h1>

        <p className="mt-3 text-sm text-black/50">
          Create a realistic failed payment and test
          RECOVR's recovery workflow.
        </p>

        <div className="mt-10 rounded-[24px] border border-black/10 bg-white p-6">

          <label className="text-[10px] font-bold">
            AMOUNT
          </label>

          <input
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            type="number"
            className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#5f5cff]"
          />

          <label className="mt-5 block text-[10px] font-bold">
            CUSTOMER EMAIL
          </label>

          <input
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            type="email"
            className="mt-2 w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-[#5f5cff]"
          />

          <label className="mt-5 block text-[10px] font-bold">
            FAILURE REASON
          </label>

          <select
            value={reason}
            onChange={(e) =>
              setReason(e.target.value)
            }
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#5f5cff]"
          >
            <option value="INSUFFICIENT_FUNDS">
              Insufficient Funds
            </option>

            <option value="CARD_DECLINED">
              Card Declined
            </option>

            <option value="NETWORK_ERROR">
              Network Error
            </option>

            <option value="PAYMENT_TIMEOUT">
              Payment Timeout
            </option>
          </select>

          <button
            onClick={createDemoTransaction}
            disabled={loading}
            className="mt-7 w-full rounded-xl bg-[#111] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#5f5cff] disabled:opacity-50"
          >
            {loading
              ? "Creating..."
              : "Create Demo Transaction"}
          </button>

          {message && (
            <div className="mt-5 rounded-xl bg-[#f5f5f0] p-4 text-xs font-semibold">
              {message}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-black/10 bg-white p-5">
          <div className="text-[9px] font-bold tracking-widest text-black/40">
            DEMO FLOW
          </div>

          <div className="mt-4 text-sm font-bold">
            Failed Payment
            <span className="mx-2">→</span>
            RECOVR Analysis
            <span className="mx-2">→</span>
            Recovery Action
            <span className="mx-2">→</span>
            Recovered
          </div>
        </div>

      </div>
    </main>
  );
}