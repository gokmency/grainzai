import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let isInitialized = false;

function isPlaceholderKey(key: string | undefined): boolean {
  if (!key || typeof key !== 'string') return true;
  const trimmed = key.trim();
  return (
    trimmed.length < 10 ||
    /<.*>|your.*key|placeholder|example\.com/i.test(trimmed)
  );
}

export const initPostHog = () => {
  if (isInitialized) return;
  if (!POSTHOG_KEY || isPlaceholderKey(POSTHOG_KEY)) {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'always',
    capture_pageview: false, // We'll handle this manually with React Router
    capture_pageleave: true,
    autocapture: true,
  });

  isInitialized = true;
};

// Safe wrapper that only calls PostHog methods when initialized
export const analytics = {
  identify: (userId: string, properties?: Record<string, unknown>) => {
    if (isInitialized) {
      posthog.identify(userId, properties);
    }
  },
  reset: () => {
    if (isInitialized) {
      posthog.reset();
    }
  },
  capture: (event: string, properties?: Record<string, unknown>) => {
    if (isInitialized) {
      posthog.capture(event, properties);
    }
  },
};
