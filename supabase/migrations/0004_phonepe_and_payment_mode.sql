-- Adds a per-event payment-mode switch (manual vs. PhonePe sandbox demo,
-- admin-toggleable at runtime, no redeploy needed) and the columns needed
-- to correlate a PhonePe webhook/status-check back to a registration.

alter table events add column payment_mode text not null default 'manual'
  check (payment_mode in ('manual', 'phonepe_sandbox'));

-- Our own generated correlation id (dash-stripped registration uuid, see
-- toMerchantTxnId in src/lib/payment/phonepe.ts) — distinct from
-- payment_reference, which stays free-text/self-reported/non-unique.
alter table registrations add column phonepe_merchant_txn_id text;
-- PhonePe's own transaction id, returned once payment is confirmed.
alter table registrations add column phonepe_transaction_id text;
alter table registrations add column phonepe_raw_response jsonb;

create unique index registrations_phonepe_merchant_txn_idx
  on registrations(phonepe_merchant_txn_id) where phonepe_merchant_txn_id is not null;
