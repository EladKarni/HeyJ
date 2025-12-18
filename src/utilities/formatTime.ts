/**
 * Formats a time duration in milliseconds to a human-readable string
 * @param time Time in milliseconds
 * @returns Formatted string (e.g., "1:23" or "45s")
 */
export const formatTime = (time: number): string => {
  if (!time || time < 0) return "0s";
  const totalSeconds = Math.floor(time / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${seconds}s`;
};
