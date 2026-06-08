"use client";

import { useEffect, useMemo, useState } from "react";
import {
  enterSessionPresence,
  getAblyClient,
  leaveSessionPresence,
  subscribeToConnectionStatus,
  subscribeToSessionPresence,
  subscribeToTranscript
} from "@/lib/ably";
import { getChannelName, normalizeSessionCode } from "@/lib/session";
import type { ConnectionStatus, SessionPresenceState, TranscriptMessage } from "@/lib/types";
import { TranscriptPane } from "@/components/TranscriptPane";
import { ViewerJoinForm } from "@/components/ViewerJoinForm";

const TEXT_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export function ViewerApp({ sessionCode }: { sessionCode?: string }) {
  const normalizedCode = normalizeSessionCode(sessionCode ?? "");
  const [, setStatus] = useState<ConnectionStatus>("idle");
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [interimText, setInterimText] = useState("");
  const [interimSource, setInterimSource] = useState<"speech" | "text">("speech");
  const [autoScroll, setAutoScroll] = useState(true);
  const [textSizeIndex, setTextSizeIndex] = useState(0);
  const [presence, setPresence] = useState<SessionPresenceState>({
    hasSpeaker: false,
    listenerCount: 0,
    totalCount: 0
  });

  const channelName = useMemo(
    () => (normalizedCode ? getChannelName(normalizedCode) : ""),
    [normalizedCode]
  );

  useEffect(() => {
    if (!channelName) return;

    setMessages([]);
    setInterimText("");
    setPresence({ hasSpeaker: false, listenerCount: 0, totalCount: 0 });

    const client = getAblyClient();
    let unsubscribePresence: (() => void) | undefined;
    const unsubscribeStatus = subscribeToConnectionStatus(client, setStatus);
    const unsubscribeTranscript = subscribeToTranscript(
      channelName,
      (event) => {
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
      },
      () => setStatus("error")
    );

    enterSessionPresence(channelName, "listener").catch(() => setStatus("error"));
    subscribeToSessionPresence(channelName, setPresence, () => setStatus("error"))
      .then((unsubscribe) => {
        unsubscribePresence = unsubscribe;
      })
      .catch(() => setStatus("error"));

    return () => {
      leaveSessionPresence(channelName, "listener").catch(() => undefined);
      unsubscribePresence?.();
      unsubscribeTranscript();
      unsubscribeStatus();
    };
  }, [channelName]);

  const sessionConnected = presence.hasSpeaker && presence.listenerCount > 0;

  if (!normalizedCode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-4">
        <div className="w-full max-w-sm">
          <ViewerJoinForm />
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#f7f5ef]">
      <div className="fixed right-2 top-2 z-10 flex items-center gap-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-0.5 text-xs text-neutral-700 ring-1 ring-neutral-200">
          <span
            className={`h-2 w-2 rounded-full ${
              sessionConnected ? "bg-emerald-500" : "bg-neutral-400"
            }`}
          />
          {sessionConnected ? "Connected" : "Waiting"}
        </span>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-neutral-600 ring-1 ring-neutral-200">
          {presence.totalCount} users
        </span>
        <div className="inline-flex overflow-hidden rounded-full bg-white/80 text-xs text-neutral-700 ring-1 ring-neutral-200">
          <button
            onClick={() => setTextSizeIndex((current) => Math.max(0, current - 1))}
            disabled={textSizeIndex === 0}
            aria-label="Decrease text size"
            className="px-2 py-0.5 disabled:text-neutral-300"
          >
            A-
          </button>
          <button
            onClick={() =>
              setTextSizeIndex((current) => Math.min(TEXT_SIZES.length - 1, current + 1))
            }
            disabled={textSizeIndex === TEXT_SIZES.length - 1}
            aria-label="Increase text size"
            className="border-l border-neutral-200 px-2 py-0.5 disabled:text-neutral-300"
          >
            A+
          </button>
        </div>
        <button
          onClick={() => setAutoScroll((current) => !current)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-0.5 text-xs text-neutral-700 ring-1 ring-neutral-200"
          aria-pressed={autoScroll}
        >
          <span
            className={`grid h-3.5 w-3.5 place-items-center rounded-full ring-1 ${
              autoScroll ? "bg-neutral-950 ring-neutral-950" : "bg-white ring-neutral-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                autoScroll ? "bg-white" : "bg-transparent"
              }`}
            />
          </span>
          Auto-scroll
        </button>
      </div>
      <TranscriptPane
        messages={messages}
        interimText={interimText}
        interimSource={interimSource}
        autoScroll={autoScroll}
        textSize={TEXT_SIZES[textSizeIndex]}
        gap="tight"
        className="h-screen"
      />
    </main>
  );
}
