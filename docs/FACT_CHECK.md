# Fact-Check List (Person A)

Tick each item once it's verified against the official source. Update the code or docs where a value differs.

## Legal and rates (code: `src/lib/vasooli.ts`, `src/lib/notices.ts`)

- [ ] **RBI Bank Rate**: current value (the code uses `RBI_BANK_RATE_PCT = 5.5`). Source: rbi.org.in
- [ ] **MSMED Act s.15**: maximum 45 days; with no written agreement, the "appointed day" is 15 days after acceptance
- [ ] **MSMED Act s.16**: compound interest with monthly rests at 3× the bank rate
- [ ] **MSMED Act s.18**: reference to the MSE Facilitation Council through MSME Samadhaan
- [ ] **Income Tax s.43B(h)**: effective from AY 2024-25; applies to micro and small enterprises (not medium); traders excluded
- [ ] **MSME classification limits** (revised from 1 April 2025): micro ≤ ₹2.5 cr investment / ≤ ₹10 cr turnover; small ≤ ₹25 cr / ≤ ₹100 cr
- [ ] **Delayed-payment protection excludes traders.** Confirm the Udyam-for-traders notification.
- [ ] **TReDS**: indicative discount rate (the code uses 10% a year, labelled "indicative")
- [ ] Legal-notice template wording, reviewed by a CA or advocate

## Schemes (code: `src/lib/schemes.ts`; set `verified: true` after checking)

- [ ] Udyam Registration
- [ ] MSME Samadhaan
- [ ] TReDS
- [ ] CGTMSE: current guarantee ceiling
- [ ] PM MUDRA: tiers, including Tarun Plus
- [ ] PMEGP: new units only; subsidy bands
- [ ] Stand-Up India
- [ ] PM Vishwakarma: eligible trades
- [ ] MSME ZED Certification
- [ ] GeM seller registration
- [ ] Mukhyamantri Udyam Kranti Yojana (MP): age band, loan limits, still active?
- [ ] MP MSME Development Policy: current policy name and capital subsidy

## Impact numbers (doc: `docs/IMPACT.md`)

- [ ] Total delayed payments to MSEs (₹ lakh crore), with source and year
- [ ] MSME credit gap, with source and year
- [ ] Current Udyam registration count
- [ ] MSME Samadhaan applications and amounts (from the portal dashboard)
- [ ] Number of MSMEs in Indore / MP (DIC or Udyam state data)

## Field validation

- [ ] 5–8 interviews in Peenya: who owes them, which schemes they know, how they keep books
- [ ] 2–5 phone interviews in Indore / Pithampur
- [ ] 2–3 quotes, with permission, for the deck
