"use client";

import { useState } from "react";

const STORAGE_KEY = "leadpilot:crm-webhook-url";

function readStoredUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Per-viewer CRM webhook URL (a Zapier/Make/n8n/HubSpot inbound webhook, or
 * any endpoint the user wants lead data POSTed to). Stored in localStorage
 * rather than on the server: this is a single-tenant demo app with no user
 * accounts, so there's no meaningful server-side place to keep a per-user
 * setting, and this keeps the URL out of any shared state entirely.
 *
 * Read via a lazy useState initializer, not an effect — this component
 * tree only ever mounts client-side (the drawer is conditionally rendered
 * from state that starts null), so there's no SSR pass to mismatch against,
 * and no effect-based setState-on-mount to avoid.
 */
export function useCrmWebhookUrl() {
  const [webhookUrl, setWebhookUrlState] = useState<string>(readStoredUrl);

  function setWebhookUrl(next: string) {
    setWebhookUrlState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable — the value still works for this session via state.
    }
  }

  return { webhookUrl, setWebhookUrl };
}
