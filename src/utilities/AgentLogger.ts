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

// Track if the endpoint is blocked to prevent spam
let isEndpointBlocked = false;

export const logAgentEvent = (logData: LogData): void => {
  // AgentLogger disabled - endpoint not running
  // Uncomment below to enable agent logging if you have a logging server running on port 7242
  return;

  // Only log in development
  // if (__DEV__ && !isEndpointBlocked) {
  //   const payload = {
  //     ...logData,
  //     timestamp: Date.now(),
  //     sessionId: SESSION_ID,
  //     runId: RUN_ID,
  //   };

  //   fetch(AGENT_LOG_ENDPOINT, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(payload),
  //   }).catch((error) => {
  //     // If endpoint is blocked by browser extension, stop trying
  //     if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
  //       isEndpointBlocked = true;
  //       console.warn('AgentLogger: Endpoint blocked by browser extension. Disabling further logging attempts.');
  //     }
  //     // Silently fail - logging should never break the app
  //   });
  // }
};
