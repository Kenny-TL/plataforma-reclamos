"use client";

import Script from "next/script";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileLoader() {
  if (!siteKey) return null;

  return (
    <Script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive"
      onReady={() => {
        window.dispatchEvent(new Event("turnstile:ready"));
      }}
      onError={() => {
        window.dispatchEvent(new Event("turnstile:error"));
      }}
    />
  );
}
