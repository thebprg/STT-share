"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  enterSessionPresence,
  getAblyClient,
  leaveSessionPresence,
  publishTranscript,
  subscribeToConnectionStatus,
  subscribeToSessionPresence
} from "@/lib/ably";
import { DeepgramStreamer } from "@/lib/deepgram";
import { generateSessionCode, getChannelName, getSessionUrl } from "@/lib/session";
import type {
  ConnectionStatus,
  SessionPresenceState,
  TranscriptEvent,
  TranscriptMessage
} from "@/lib/types";
import { TranscriptPane } from "@/components/TranscriptPane";

const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY ?? "";
const TEXT_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export function SpeakerApp() {
  const [sessionCode, setSessionCode] = useState("");
  const [deepgramStatus, setDeepgramStatus] = useState<ConnectionStatus>("idle");
  const [, setAblyStatus] = useState<ConnectionStatus>("idle");
  const [presence, setPresence] = useState<SessionPresenceState>({
    hasSpeaker: false,
    listenerCount: 0,
    totalCount: 0
  });
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [interimText, setInterimText] = useState("");
  const [interimSource, setInterimSource] = useState<"speech" | "text">("speech");
  const [typedText, setTypedText] = useState("");
  const [textSizeIndex, setTextSizeIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const streamerRef = useRef<DeepgramStreamer | null>(null);
  const sessionCodeRef = useRef("");

  const sessionUrl = useMemo(() => (sessionCode ? getSessionUrl(sessionCode) : ""), [sessionCode]);

  useEffect(() => {
    const client = getAblyClient();
    return subscribeToConnectionStatus(client, setAblyStatus);
  }, []);

  useEffect(() => {
    return () => {
      streamerRef.current?.stop();
      if (sessionCodeRef.current) {
        leaveSessionPresence(getChannelName(sessionCodeRef.current), "speaker").catch(
          () => undefined
        );
      }
    };
  }, []);

  useEffect(() => {
    sessionCodeRef.current = sessionCode;

    if (!sessionCode) {
      setPresence({ hasSpeaker: false, listenerCount: 0, totalCount: 0 });
      return;
    }

    let cleanup: (() => void) | undefined;

    subscribeToSessionPresence(getChannelName(sessionCode), setPresence, () => {
      setAblyStatus("error");
      setError("Unable to read session presence from Ably.");
    })
      .then((unsubscribe) => {
        cleanup = unsubscribe;
      })
      .catch(() => {
        setAblyStatus("error");
        setError("Unable to read session presence from Ably.");
      });

    return () => cleanup?.();
  }, [sessionCode]);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function startSession() {
    setError("");
    setMessages([]);
    setInterimText("");
    setTypedText("");

    if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === "your-deepgram-api-key") {
      setDeepgramStatus("error");
      setError("NEXT_PUBLIC_DEEPGRAM_API_KEY is not configured.");
      return;
    }

    if (sessionCodeRef.current) {
      await leaveSessionPresence(getChannelName(sessionCodeRef.current), "speaker").catch(
        () => undefined
      );
    }

    const code = generateSessionCode();
    const channelName = getChannelName(code);

    setSessionCode(code);
    sessionCodeRef.current = code;

    await enterSessionPresence(channelName, "speaker").catch(() => {
      setAblyStatus("error");
      setError("Unable to enter Ably session presence.");
    });

    const streamer = new DeepgramStreamer({
      apiKey: DEEPGRAM_API_KEY,
      onStatus: (status, detail) => {
        setDeepgramStatus(status);
        if (detail && status === "error") setError(detail);
      },
      onTranscript: (event) => handleTranscript(code, event)
    });

    streamerRef.current?.stop();
    streamerRef.current = streamer;
    await streamer.start();
  }

  function stopSession() {
    streamerRef.current?.stop();
    streamerRef.current = null;
    if (sessionCode) {
      leaveSessionPresence(getChannelName(sessionCode), "speaker").catch(() => undefined);
    }
    setDeepgramStatus("idle");
    setTypedText("");
    setInterimText("");
  }

  function handleTranscript(code: string, event: TranscriptEvent) {
    if (event.isFinal) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          text: event.transcript,
          isFinal: true,
          receivedAt: event.timestamp,
          source: event.source ?? "speech"
        }
      ]);
      setInterimText("");
    } else {
      setInterimText(event.transcript);
      setInterimSource(event.source ?? "speech");
    }

    publishTranscript(getChannelName(code), event).catch(() => {
      setAblyStatus("error");
      setError("Unable to publish transcript to Ably.");
    });
  }

  function streamTypedText(value: string) {
    setTypedText(value);

    if (!sessionCode || !isLive) {
      return;
    }

    handleTranscript(sessionCode, {
      transcript: value,
      isFinal: false,
      timestamp: Date.now(),
      source: "text"
    });
  }

  function submitTypedText() {
    const transcript = typedText.trim();

    if (!sessionCode || !isLive || !transcript) {
      return;
    }

    handleTranscript(sessionCode, {
      transcript,
      isFinal: true,
      timestamp: Date.now(),
      source: "text"
    });
    setTypedText("");
  }

  const isLive = deepgramStatus === "connected" || deepgramStatus === "connecting";
  const canSendText = Boolean(sessionCode && isLive);

  return (
    <main className="h-screen overflow-hidden bg-[#f4f3ef]">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-2 px-4 py-2">
        <header className="sticky top-0 z-20 rounded-lg bg-white/95 px-3 py-2 shadow-sm ring-1 ring-neutral-200 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-neutral-950">CaptionCast</h1>
                <p className="text-[11px] text-neutral-500">Speaker console</p>
              </div>
              <button
                onClick={isLive ? stopSession : startSession}
                className={`rounded-md px-5 py-2 text-sm font-semibold ${
                  isLive ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                }`}
              >
                {isLive ? "Stop" : "Start"}
              </button>
              <button
                onClick={() => sessionUrl && copy(sessionUrl)}
                disabled={!sessionUrl || !isLive}
                className={`relative rounded-md border px-3 py-2 text-sm font-medium transition ${
                  copied
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                    : "border-neutral-300 bg-white text-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span>{copied ? "✓" : "↑"}</span>
                  {copied ? "Copied" : "Share"}
                </span>
                {copied ? (
                  <span className="absolute right-0 top-[calc(100%+6px)] rounded-md bg-neutral-950 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
                    Link copied
                  </span>
                ) : null}
              </button>
            </div>

            <div className="flex items-center justify-end gap-3">
              {sessionCode ? (
                <span className="rounded-md bg-neutral-50 px-2.5 py-1 font-mono text-xs font-semibold tracking-[0.16em] text-neutral-950 ring-1 ring-neutral-200">
                  {sessionCode}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isLive ? "bg-emerald-500" : "bg-neutral-400"
                  }`}
                />
                Mic
              </span>
              <span className="text-xs text-neutral-500">
                {presence.listenerCount} listener{presence.listenerCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </header>

        <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-neutral-200">
          <div className="absolute right-3 top-3 z-10 inline-flex overflow-hidden rounded-md bg-white/90 text-xs text-neutral-700 shadow-sm ring-1 ring-neutral-200 backdrop-blur">
            <button
              onClick={() => setTextSizeIndex((current) => Math.max(0, current - 1))}
              disabled={textSizeIndex === 0}
              aria-label="Decrease text size"
              className="px-3 py-1.5 disabled:text-neutral-300"
            >
              A-
            </button>
            <button
              onClick={() =>
                setTextSizeIndex((current) => Math.min(TEXT_SIZES.length - 1, current + 1))
              }
              disabled={textSizeIndex === TEXT_SIZES.length - 1}
              aria-label="Increase text size"
              className="border-l border-neutral-200 px-3 py-1.5 disabled:text-neutral-300"
            >
              A+
            </button>
          </div>
          <TranscriptPane
            messages={messages}
            interimText={interimText}
            interimSource={interimSource}
            autoScroll={true}
            textSize={TEXT_SIZES[textSizeIndex]}
            gap="tight"
            className="min-h-0 flex-1"
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitTypedText();
            }}
            className="border-t border-neutral-200 px-4 py-2.5"
          >
            <input
              value={typedText}
              onChange={(event) => streamTypedText(event.target.value)}
              disabled={!canSendText}
              placeholder={canSendText ? "Type live text..." : "Start the session to type live text"}
              aria-label="Type live text"
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-base text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-400 disabled:bg-white disabled:text-neutral-400"
            />
          </form>
        </section>
      </div>
    </main>
  );
}
