// Single source of truth for the compile-time "development vs live" toggle.
// This is NOT a runtime feature flag — it's baked in at build time via
// NEXT_PUBLIC_APP_MODE and is meant to be set once per deploy target (see
// docs/netlify.md), not changed by users or admins at runtime. Unrelated
// to events.payment_mode, which IS a runtime, per-event, admin-toggleable
// DB flag (manual vs PhonePe) — that stays orthogonal to this.

export type AppMode = "development" | "live";

const RAW = process.env.NEXT_PUBLIC_APP_MODE;

// Fail safe: anything other than exactly "live" is treated as development,
// so a misconfigured or unset var never accidentally goes live.
export const APP_MODE: AppMode = RAW === "live" ? "live" : "development";

export const isLive = APP_MODE === "live";
export const isDevelopment = !isLive;
