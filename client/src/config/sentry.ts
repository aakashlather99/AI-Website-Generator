/**
 * Sentry Configuration for Frontend (React)
 * Centralized error tracking and monitoring
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export const initializeSentry = () => {
  const sentryDSN = import.meta.env.VITE_SENTRY_DSN;

  if (!sentryDSN) {
    console.warn('⚠️  VITE_SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: true,
      }),
      new BrowserTracing(),
    ],
    replaysSessionSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Don't send network errors for 404s
      if (event.exception) {
        const exc = event.exception.values?.[0];
        if (exc?.value?.includes('404')) {
          return null;
        }
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized for frontend error tracking');
};

/**
 * Set user context
 */
export const setSentryUser = (userId, email, name) => {
  Sentry.setUser({
    id: userId.toString(),
    email,
    username: name,
  });
};

/**
 * Clear user context (on logout)
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Capture error
 */
export const captureException = (error, context = {}) => {
  Sentry.captureException(error, {
    contexts: context,
  });
};

/**
 * Capture message
 */
export const captureMessage = (message, level = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Add breadcrumb
 */
export const addBreadcrumb = (message, data = {}, category = 'info') => {
  Sentry.addBreadcrumb({
    message,
    data,
    category,
    level: 'info',
  });
};

/**
 * Start a transaction
 */
export const startTransaction = (name, op = 'default') => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

export default Sentry;
