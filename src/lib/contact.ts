// Single source of truth for the org contact address shown in the footer and
// in error/status messages. Picks between a dev placeholder and a real org
// address via the compile-time NEXT_PUBLIC_APP_MODE toggle — see
// src/lib/appMode.ts — so this file only needs the addresses, everything
// else updates automatically.
import { isLive } from "@/lib/appMode";

const DEV_CONTACT_EMAIL = "amjain.gzb@gmail.com";

// TODO(go-live): replace with a real org contact address before setting
// NEXT_PUBLIC_APP_MODE=live for a real production deploy.
const LIVE_CONTACT_EMAIL = "amjain.gzb@gmail.com";

export const CONTACT_EMAIL = isLive ? LIVE_CONTACT_EMAIL : DEV_CONTACT_EMAIL;
