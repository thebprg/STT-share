export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type TranscriptMessage = {
  id: string;
  text: string;
  isFinal: boolean;
  receivedAt: number;
  source: "speech" | "text";
};

export type TranscriptEvent = {
  transcript: string;
  isFinal: boolean;
  timestamp: number;
  placementTimestamp?: number;
  source?: "speech" | "text";
};

export type PresenceRole = "speaker" | "listener";

export type SessionPresenceState = {
  hasSpeaker: boolean;
  listenerCount: number;
  totalCount: number;
};

export type DeepgramTranscriptCallback = (event: TranscriptEvent) => void;
export type StatusCallback = (status: ConnectionStatus, detail?: string) => void;
