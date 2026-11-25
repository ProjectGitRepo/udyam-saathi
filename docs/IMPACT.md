# Udyam Saathi: Impact Case

> **Before submission:** every figure marked **[verify]** must be checked against the listed source and replaced with the exact number and citation. Figures from the demo business are computed by the app and are labelled as such.

## 1. The problem

Small businesses in India do not fail for lack of customers. They fail for lack of a **back office**.

| Pain | What happens today | Evidence |
|---|---|---|
| **Late payments** | Buyers hold payments for 60–120 days. Owners don't know the law protects them, or are afraid to use it. | Payments owed to MSEs and delayed are estimated at **~₹10 lakh crore** [verify: GAME / MSME delayed-payment report]. MSME Samadhaan has received a large number of applications [verify: samadhaan.msme.gov.in dashboard]. |
| **Missed schemes** | Dozens of central and state schemes exist; owners don't know which apply or what papers are needed. | Low awareness of schemes among micro enterprises [verify: survey source] |
| **No credit** | Messy records lead to loan rejections, which push owners to informal lenders. | MSME credit gap estimated at **₹20–25 lakh crore** [verify: IFC / SIDBI estimate] |
| **No help** | A CA or munim costs money; enterprise software is in English and built for accountants. | — |

**Why now:**
- **Section 43B(h) of the Income Tax Act** (in force from FY 2023-24): a buyer can deduct a payment owed to a micro or small enterprise only in the year it is actually paid, if it was paid late. That is a new, powerful lever, and most owners don't know it exists.
- Udyam registration has brought crores of MSMEs into the formal system [verify: current Udyam count], so they qualify for these protections.
- Generative-UI standards (A2UI 1.0, Nov 2026) and voice AI in Indian languages make a truly no-learning interface possible.

## 2. Who we serve

- **Primary:** Udyam-registered **micro and small manufacturers and service businesses** that sell on credit: namkeen and food processors, fabricators, packaging, printing, auto-component job-workers.
- **Launch geography:** **Indore and Pithampur (MP)**, then other fast-growing regional hubs. Validated with MSMEs in Peenya, Bengaluru [add interview count + quotes].
- **Persona:** *Ramesh Patidar, 34, namkeen manufacturer, Palda, Indore.* 8 staff, ₹1.2 crore turnover, sells on 30–45 days credit, keeps books in a register, prefers Hindi and WhatsApp.

## 3. Value delivered: one business, one minute

Computed by the app for the demo business, Shree Ganesh Namkeen in Indore:

| What Saathi found | Value |
|---|---|
| Money held by buyers past the legal limit | **₹4,63,500** across 3 buyers |
| Statutory interest the owner can claim (MSMED s.16) | **₹7,549**, growing every month |
| Total the owner can unlock | **₹4,71,049** |
| Buyers flagged as risky *before* the next credit sale | **3** (e.g. Indore Caterers, 60 days late on average) |
| Government schemes the business qualifies for | **8** (10 if a new woman-led unit) |
| Loan readiness | **66/100**, with steps to improve |
| 30-day cash forecast | ₹5.3 lakh expected, of which ₹4.25 lakh depends on late payers, so TReDS is suggested |

**The shift:** from reacting to stuck money to preventing it. Saathi sends a friendly reminder before the due date, follows up automatically, pauses credit to bad payers, and uses the 31 March tax-deduction deadline as leverage.

## 4. Impact metrics we will track

| Metric | Definition | Pilot target (90 days) |
|---|---|---|
| ₹ recovered | Paid invoices that had a Saathi notice | [set with pilot] |
| Days Sales Outstanding (DSO) | Average days from invoice to payment | –20% |
| On-time payment rate | Share of invoices paid within terms | +15 pts |
| Schemes applied | Applications started from Yojana | 1 per business |
| Loan readiness | Average score change | +10 points |
| Active weekly users | Owners using it at least once a week | 60% |

## 5. Business model

| Stream | How |
|---|---|
| **Freemium subscription** | Free: ledger + 3 notices/month. **Saathi Pro ₹299/month:** unlimited recovery, alerts, forecasts, scheme applications. |
| **Embedded finance** | Referral fees from TReDS platforms (invoice discounting) and NBFCs/banks (loans). Leads arrive with clean, verified payment history. |
| **B2B2C channel** | CA firms (one dashboard for 50+ clients) and industry associations (white-label for members). |

**Moat:** each ledger entry and payment builds a **verified payment-behaviour graph** of buyers and suppliers. That powers trust scores, better forecasts and a credit profile lenders will pay for. It compounds with every user.

## 6. Go-to-market

1. **Indore pilot:** 50 MSMEs through Palda / Sanwer Road / Pithampur industry associations and 5 partner CAs.
2. **Regional hubs:** the same playbook in Peenya (Bengaluru), Rajkot, Ludhiana and Coimbatore. Languages: Hindi, Kannada, Gujarati, Punjabi, Tamil.
3. **Partnerships:** TReDS platforms and an NBFC for embedded credit; MSME-DFO / DIC offices for scheme facilitation.

## 7. Why we will win

- **Outcome, not software:** owners see rupees recovered, not features.
- **The law as a product feature:** MSMED s.15/16, s.43B(h), MSME Samadhaan and TReDS, packaged into one tap.
- **Trustworthy AI:** numbers are computed, never guessed; nothing is sent without approval.
- **Built for Bharat:** Hindi first, voice first, WhatsApp-native, zero learning.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Owners fear damaging buyer relationships | A graduated ladder that starts with a friendly pre-due reminder; legal steps only when the owner chooses |
| Legal or scheme data goes stale | Official-source links, monthly review, `verified` flag shown in the UI |
| AI errors | AI only interprets language; all money and legal output is deterministic or templated, with human approval |
| Data privacy | Data stays with the business; consent-based imports (Account Aggregator); encryption in production |
