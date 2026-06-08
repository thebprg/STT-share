const SESSION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSessionCode(length = 6) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => SESSION_ALPHABET[byte % SESSION_ALPHABET.length]).join("");
}

export function normalizeSessionCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function getSessionUrl(sessionCode: string) {
  if (typeof window === "undefined") {
    return `/session/${sessionCode}`;
  }

  return `${window.location.origin}/session/${sessionCode}`;
}

export function getChannelName(sessionCode: string) {
  return `session-${sessionCode}`;
}
