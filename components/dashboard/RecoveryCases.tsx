"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { recoveryCases } from "@/lib/demo-data";

export default function RecoveryCases() {
  const [query, setQuery] = useState("");

  const filteredCases = useMemo(() => {
    const value = query.toLowerCase().trim();

    if (!value) return recoveryCases;

    return recoveryCases.filter(
      (item) =>
        item.id.toLowerCase().includes(value) ||
        item.customer.toLowerCase().includes(value) ||
        item.type.toLowerCase().includes(value)
    );
  }, [query]);

  return (
    <section className="rounded-[24px] border border-black/10 bg-white">
      <div className="flex flex-col gap-4 border-b border-black/8 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <div className="text-[9px] font-bold tracking-[0.18em] text-black/35">
            ACTIVE RECOVERY CASES
          </div>

          <div className="mt-1 text-lg font-black">
            Recovery Queue
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 md:w-[300px]">
          <Search size={13} className="text-black/30" />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases..."
            className="w-full bg-transparent text-[10px] outline-none placeholder:text-black/30"
          />
        </div>
      </div>

      <div className="hidden grid-cols-[1fr_1.2fr_1fr_0.7fr_1fr] gap-4 border-b border-black/7 px-6 py-3 text-[8px] font-bold tracking-wider text-black/30 md:grid">
        <span>CASE</span>
        <span>CUSTOMER</span>
        <span>AMOUNT</span>
        <span>RECOVERY</span>
        <span>ACTION</span>
      </div>

      {filteredCases.length === 0 ? (
        <div className="p-10 text-center text-[11px] text-black/35">
          No recovery cases found.
        </div>
      ) : (
        filteredCases.map((item) => (
          <a
            href={`/dashboard/cases/${item.id}`}
            key={item.id}
            className="grid gap-4 border-b border-black/7 p-5 transition hover:bg-[#f5f5f0] md:grid-cols-[1fr_1.2fr_1fr_0.7fr_1fr] md:items-center md:px-6"
          >
            <div>
              <div className="text-[8px] font-bold text-black/30">
                CASE
              </div>

              <div className="mt-1 text-[11px] font-bold">
                {item.id}
              </div>
            </div>

            <div>
              <div className="text-[8px] font-bold text-black/30 md:hidden">
                CUSTOMER
              </div>

              <div className="mt-1 text-[11px] font-semibold">
                {item.customer}
              </div>
            </div>

            <div>
              <div className="text-[8px] font-bold text-black/30 md:hidden">
                AMOUNT
              </div>

              <div className="mt-1 text-[16px] font-black">
                ₹{item.amount.toLocaleString("en-IN")}
              </div>
            </div>

            <div>
              <div className="text-[8px] font-bold text-black/30 md:hidden">
                RECOVERY
              </div>

              <div className="mt-1 text-[12px] font-bold text-[#5f5cff]">
                {item.probability}%
              </div>
            </div>

            <div>
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-[8px] font-bold ${
                  item.status === "Stopped"
                    ? "bg-black/5 text-black/35"
                    : "bg-[#eaf8ef] text-[#177245]"
                }`}
              >
                {item.status}
              </span>
            </div>
          </a>
        ))
      )}
    </section>
  );
}