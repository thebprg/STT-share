"use client";

import type { DeepgramTranscriptCallback, StatusCallback } from "@/lib/types";

type DeepgramOptions = {
  apiKey: string;
  onTranscript: DeepgramTranscriptCallback;
  onStatus: StatusCallback;
};

type DeepgramAlternative = {
  transcript?: string;
};

type DeepgramResult = {
  channel?: {
    alternatives?: DeepgramAlternative[];
  };
  is_final?: boolean;
  speech_final?: boolean;
};

const DEEPGRAM_URL =
  "wss://api.deepgram.com/v1/listen?model=nova-3&interim_results=true&smart_format=true&endpointing=100";

function getSupportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

export class DeepgramStreamer {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private socket: WebSocket | null = null;
  private readonly options: DeepgramOptions;

  constructor(options: DeepgramOptions) {
    this.options = options;
  }

  async start() {
    if (!this.options.apiKey.trim()) {
      this.options.onStatus("error", "Enter a Deepgram API key.");
      return;
    }

    this.options.onStatus("connecting");

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.socket = new WebSocket(DEEPGRAM_URL, ["token", this.options.apiKey]);
      this.socket.binaryType = "arraybuffer";

      this.socket.onopen = () => {
        this.options.onStatus("connected");
        this.startRecorder();
      };

      this.socket.onmessage = (message) => this.handleMessage(message);
      this.socket.onerror = () => this.options.onStatus("error", "Deepgram connection failed.");
      this.socket.onclose = () => {
        if (this.mediaRecorder?.state === "recording") {
          this.options.onStatus("disconnected");
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start microphone.";
      this.options.onStatus("error", message);
      this.stop();
    }
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    this.mediaStream?.getTracks().forEach((track) => track.stop());

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "CloseStream" }));
      this.socket.close();
    } else {
      this.socket?.close();
    }

    this.mediaRecorder = null;
    this.mediaStream = null;
    this.socket = null;
    this.options.onStatus("idle");
  }

  private startRecorder() {
    if (!this.mediaStream || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const mimeType = getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(
      this.mediaStream,
      mimeType ? { mimeType } : undefined
    );

    this.mediaRecorder.ondataavailable = async (event) => {
      if (!event.data.size || this.socket?.readyState !== WebSocket.OPEN) {
        return;
      }

      this.socket.send(await event.data.arrayBuffer());
    };

    this.mediaRecorder.start(100);
  }

  private handleMessage(message: MessageEvent) {
    try {
      const data = JSON.parse(String(message.data)) as DeepgramResult;
      const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();

      if (!transcript) {
        return;
      }

      this.options.onTranscript({
        transcript,
        isFinal: Boolean(data.is_final || data.speech_final),
        timestamp: Date.now(),
        source: "speech"
      });
    } catch {
      this.options.onStatus("error", "Unable to parse Deepgram response.");
    }
  }
}
