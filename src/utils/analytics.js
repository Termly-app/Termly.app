/**
 * Termly Analytics & Error Tracking
 * Integrates with PostHog for product analytics and Sentry for error reporting.
 */

// Placeholder for actual SDK initialization
const isProd = import.meta.env.PROD;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;

export function initAnalytics() {
  if (!isProd) {
    console.log('[ANALYTICS] Dev mode: Initialization skipped.');
    return;
  }
  
  // Example PostHog init:
  // posthog.init(POSTHOG_KEY, { api_host: 'https://app.posthog.com' });
  console.log('[ANALYTICS] PostHog & Sentry initialized.');
}

export function trackEvent(eventName, properties = {}) {
  if (!isProd) {
    console.log(`[EVENT] "${eventName}":`, properties);
    return;
  }
  // posthog.capture(eventName, properties);
}

export function trackError(error, context = {}) {
  console.error(`[TRACK-ERROR]:`, error, context);
  if (!isProd) return;
  // Sentry.captureException(error, { extra: context });
}

export function identifyUser(user) {
  if (!user || !isProd) return;
  // posthog.identify(user.id, { email: user.email, name: user.name, role: user.role });
}
