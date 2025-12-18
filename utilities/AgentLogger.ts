// Centralized agent logging utility
// This should be removed or disabled in production

const AGENT_LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d';
const SESSION_ID = 'debug-session';
const RUN_ID = 'run1';

interface LogData {
  location: string;
  message: string;
  data?: Record<string, any>;
  hypothesisId?: string;
}

export const logAgentEvent = (logData: LogData): void => {
  // Only log in development
  if (__DEV__) {
    const payload = {
      ...logData,
      timestamp: Date.now(),
      sessionId: SESSION_ID,
      runId: RUN_ID,
    };

    fetch(AGENT_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Silently fail - logging should never break the app
    });
  }
};
