# RECOVR — AI Revenue Recovery Command Center

> **“Razorpay pe payment fail, aur merchant ki naak kat gayi.”** 😭
> RECOVR makes sure a failed payment doesn't become lost revenue.

RECOVR is an **AI-powered Revenue Incident & Recovery Orchestrator** built to help merchants detect payment failures, understand why revenue is being lost, prioritize recovery opportunities, and execute safe recovery actions.

Instead of treating every failed transaction independently, RECOVR turns payment failures into **revenue incidents** that can be investigated, prioritized, recovered, and audited.

---

## 🚨 The Problem

Payment failures directly affect merchant revenue.

A single failed payment may look insignificant, but thousands of failures caused by:

* Temporary payment issues
* Insufficient funds
* Hard declines
* Payment-link abandonment
* Repeated customer failures
* Unknown anomalies

can result in significant revenue leakage.

Traditional payment dashboards tell merchants **what failed**.

RECOVR focuses on:

> **Why is revenue being lost, how much is at risk, and what should we do about it?**

---

## 💡 The RECOVR Approach

RECOVR follows a revenue recovery pipeline:

```text
Payment Events
      ↓
Failure Detection
      ↓
Incident Classification
      ↓
Root-Cause Analysis
      ↓
Revenue-at-Risk Calculation
      ↓
Recovery Strategy
      ↓
Guardrails
      ↓
Recovery Execution
      ↓
Outcome Verification
      ↓
Learning & Optimization
```

The goal is not simply to retry payments.

The goal is to **recover revenue intelligently and safely**.

---

# ✨ Core Features

## 1. Payment Failure Detection

RECOVR monitors transaction activity and identifies payment degradation patterns.

It can identify:

* Failed payments
* Failure spikes
* Repeated customer failures
* Abnormal payment behaviour
* Revenue-impacting incidents

---

## 2. AI-Powered Diagnosis

RECOVR analyzes payment failures and determines likely causes.

Examples:

```text
Insufficient Funds
Temporary Failure
Hard Decline
Payment Link Abandonment
Unknown Anomaly
```

The system combines deterministic logic with AI reasoning to avoid relying entirely on generative output.

---

## 3. Revenue-at-Risk Analysis

Not every failed payment deserves the same priority.

RECOVR calculates the potential revenue impact of payment failures and helps merchants focus on the incidents that matter most.

Example:

```text
Failed Transactions:     127
Revenue at Risk:         ₹84,500
High Priority Cases:     18
Recoverable Estimate:     ₹51,200
```

This changes the question from:

> “How many payments failed?”

to:

> **“How much money are we actually at risk of losing?”**

---

# 🎯 Recovery Command Center

The Recovery Command Center provides a centralized view of active revenue incidents.

It includes:

* Revenue at Risk
* Recovery opportunities
* Active incidents
* Recovery queue
* System health
* Recent recovery activity
* Transaction trends
* Recovery outcomes

Merchants can quickly identify the most important recovery opportunities.

---

# 🔄 Recovery Strategies

RECOVR supports multiple recovery actions depending on the failure scenario.

### Payment Link Recovery

For suitable cases, RECOVR can create a new Razorpay Payment Link that can be sent to the customer.

```text
Failed Payment
      ↓
RECOVR identifies recovery opportunity
      ↓
Create Razorpay Payment Link
      ↓
Customer receives new payment opportunity
      ↓
Payment succeeds
      ↓
RECOVR records recovery
```

---

### Safe Retry

RECOVR does **not falsely represent a retry as directly retrying a failed Razorpay payment**.

Instead, a retry can be represented as a new payment attempt/order/checkout flow where appropriate.

This keeps the recovery model technically accurate and avoids unsafe payment behaviour.

---

### Recovery Guardrails

Recovery actions are bounded by rules before execution.

Examples:

* Maximum recovery attempts
* Transaction eligibility
* Failure type
* Recovery strategy
* Risk level
* Action safety
* Duplicate prevention

The system follows:

```text
AI Recommendation
      ↓
Guardrails
      ↓
Allowed Action
      ↓
Execution
```

AI recommends.

**Guardrails decide what is allowed.**

---

# 🤖 AI + Deterministic Architecture

RECOVR uses a hybrid intelligence model.

```text
                 Payment Data
                      │
                      ▼
             ┌─────────────────┐
             │ Deterministic   │
             │ Analysis        │
             └────────┬────────┘
                      │
               Insufficient?
                 /          \
               No            Yes
               │              │
               ▼              ▼
           Decision        Gemini AI
                              │
                              ▼
                       Diagnosis /
                       Recommendation
                              │
                              ▼
                         Guardrails
                              │
                              ▼
                         Orchestrator
                              │
                              ▼
                       Recovery Action
```

This approach provides predictable behaviour for known cases while allowing AI to handle more complex or ambiguous situations.

---

# 🧠 Recovery Orchestrator

The orchestrator acts as the decision layer between diagnosis and execution.

It determines:

* Which recovery strategy should be used
* Whether the transaction is eligible
* Whether the action is safe
* Whether another attempt should be avoided
* Which recovery API should be called
* What outcome should be recorded

The architecture is designed around:

```text
Detect → Diagnose → Decide → Guardrail → Execute → Verify → Learn
```

---

# 📊 Analytics

RECOVR provides analytics around payment and recovery performance.

Key metrics include:

* Total transactions
* Successful payments
* Failed payments
* Failure rate
* Revenue at risk
* Recovered revenue
* Recovery rate
* Recovery attempts
* Recovery outcomes
* Incident trends

This allows merchants to understand whether their recovery system is actually improving revenue.

---

# 🧾 Recovery Cases

Every important recovery opportunity can become a recovery case.

A case can contain:

```text
Transaction
    ↓
Failure Reason
    ↓
Revenue Impact
    ↓
Diagnosis
    ↓
Recommended Strategy
    ↓
Recovery Action
    ↓
Outcome
```

This gives merchants a complete lifecycle view instead of treating recovery as a single API call.

---

# 🔍 Audit Trail

RECOVR maintains visibility into recovery actions.

The audit system helps answer:

* What happened?
* Why was this transaction selected?
* What strategy was recommended?
* What action was executed?
* When was it executed?
* What was the outcome?

This is especially important when automated systems interact with payment infrastructure.

---

# 💳 Razorpay Integration

RECOVR is designed around **Razorpay Test Mode** for development and demonstration.

The project integrates with Razorpay functionality for:

* Orders
* Payment Links
* Payment recovery flows
* Webhook events
* Payment status synchronization

The project is intended to demonstrate revenue recovery workflows without making unsafe claims about Razorpay's underlying payment retry mechanisms.

---

# 🔔 Webhooks

RECOVR can process Razorpay webhook events to connect payment outcomes back to the recovery system.

Conceptually:

```text
Razorpay
    │
    │ Payment Event
    ▼
RECOVR Webhook
    │
    ▼
Transaction Update
    │
    ▼
Recovery Case Update
    │
    ▼
Analytics / Audit
```

This allows a recovery action to eventually be linked to its real payment outcome.

---

# 🖥️ Dashboard

RECOVR provides a premium financial-SaaS dashboard designed around fast incident visibility.

The interface focuses on:

* Large financial metrics
* Clear incident states
* Minimal visual noise
* Recovery prioritization
* Action-oriented information

Visual language:

```text
Off-white background
Black typography
Purple accent
Rounded cards
Thin borders
Premium SaaS aesthetic
```

---

# 🛠️ Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS
* Framer Motion

### Backend

* Next.js API Routes
* Prisma
* SQLite for local development

### AI

* Google Gemini API
* Deterministic fallback logic
* AI-powered diagnosis and recommendations

### Payments

* Razorpay APIs
* Razorpay Test Mode
* Razorpay Webhooks
* Razorpay Payment Links

### Deployment

* Vercel
* GitHub

---

# 📁 Project Structure

```text
recovr/
│
├── app/
│   ├── analytics/
│   ├── api/
│   │   ├── analytics/
│   │   ├── command-center/
│   │   ├── demo/
│   │   ├── razorpay/
│   │   ├── recovery/
│   │   ├── transactions/
│   │   └── webhooks/
│   │
│   ├── cases/
│   ├── command-center/
│   ├── dashboard/
│   ├── demo/
│   ├── recovery/
│   ├── audit/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│
├── lib/
│   ├── analytics/
│   ├── recovery/
│   ├── razorpay/
│   └── ...
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│
├── prisma.config.ts
├── package.json
└── README.md
```

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/Dgd456sfh/recovr.git
cd recovr
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Configure environment variables

Create:

```text
.env.local
```

Add your own credentials:

```env
RAZORPAY_KEY_ID=your_razorpay_test_key_id
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret

GEMINI_API_KEY=your_gemini_api_key

DATABASE_URL="file:./dev.db"

RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

RECOVR_CALLBACK_URL=your_callback_url
```

> **Never commit `.env.local` or API keys to GitHub.**

---

## 4. Generate Prisma Client

```bash
npx prisma generate
```

---

## 5. Run the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🧪 Demo Flow

RECOVR includes demo transaction and recovery flows for demonstrating the product without requiring a live production payment.

Typical demo flow:

```text
Create Demo Transaction
          ↓
Simulate Payment Failure
          ↓
RECOVR Detects Failure
          ↓
Create Recovery Case
          ↓
Analyze Failure
          ↓
Recommend Recovery Strategy
          ↓
Execute Recovery
          ↓
Track Outcome
          ↓
Update Analytics
```

---

# 🔐 Security

Sensitive credentials should always be stored as environment variables.

Do not commit:

```text
.env
.env.local
API keys
Razorpay secrets
Gemini API keys
Webhook secrets
Production credentials
```

The repository should contain only configuration templates, never real secrets.

---

# 🌐 Deployment

RECOVR is deployable using Vercel.

The application can be connected directly to the GitHub repository:

```text
GitHub
   ↓
Vercel
   ↓
Next.js Build
   ↓
Production Deployment
```

Environment variables must be configured in the Vercel project settings before production features requiring external services are used.

---

# ⚠️ Current Database Note

The local development setup uses SQLite.

For production-scale deployment, a hosted database such as PostgreSQL is recommended instead of relying on a local SQLite file.

A future production architecture can use:

```text
Next.js
   │
   ├── Vercel
   │
   ├── PostgreSQL
   │
   ├── Redis / Queue
   │
   ├── Gemini
   │
   └── Razorpay
```

---

# 🗺️ Roadmap

### ✅ Completed

* [x] Revenue recovery dashboard
* [x] Transaction management
* [x] Demo transaction flow
* [x] Recovery cases
* [x] Recovery command center
* [x] Recovery actions
* [x] Analytics
* [x] Audit trail
* [x] Gemini integration
* [x] Deterministic fallback
* [x] Recovery guardrails
* [x] Razorpay Test Mode integration
* [x] Payment Link recovery flow
* [x] Razorpay webhook flow
* [x] Vercel deployment

### 🔜 Future

* [ ] PostgreSQL production database
* [ ] Redis + background job processing
* [ ] Advanced anomaly detection
* [ ] Merchant authentication
* [ ] Multi-merchant support
* [ ] Automated customer communication
* [ ] Recovery strategy learning
* [ ] More payment failure intelligence
* [ ] Production-grade observability
* [ ] Advanced recovery optimization

---

# 🏗️ Architecture Vision

RECOVR is designed to evolve from a payment recovery dashboard into a complete **AI Revenue Recovery Infrastructure Layer**.

```text
                    ┌─────────────────────┐
                    │      Merchant       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      RECOVR         │
                    │ Command Center      │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
          Detection        Diagnosis        Analytics
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                       Recovery Engine
                               │
                         Guardrails
                               │
                         Orchestrator
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
          Payment Links                 New Attempts
                 │                           │
                 └─────────────┬─────────────┘
                               ▼
                            Razorpay
                               │
                               ▼
                           Webhooks
                               │
                               ▼
                      Outcome Verification
                               │
                               ▼
                        Learning Loop
```

---

# 🎯 Why RECOVR?

Most payment systems focus on successfully processing payments.

RECOVR focuses on what happens **after a payment fails**.

The core idea is simple:

> **A failed payment is not necessarily lost revenue. It's a recovery opportunity.**

RECOVR turns:

```text
Payment Failure
```

into:

```text
Revenue Incident
       ↓
Diagnosis
       ↓
Prioritization
       ↓
Recovery
       ↓
Verification
       ↓
Learning
```

---

# 👩‍💻 Built With

Built as an AI Revenue Recovery project exploring:

* AI agents
* Generative AI
* Payment infrastructure
* Revenue intelligence
* Automated recovery
* Financial analytics
* Event-driven workflows
* Safe AI orchestration

---

# 📄 License

This project is currently intended for demonstration, experimentation, and hackathon/buildathon purposes.

---

## RECOVR

### Don't just detect failed payments.

### **Recover the revenue.**

