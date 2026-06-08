"use client";

import { useEffect, useRef } from "react";
import { joinTranscriptText, shouldAppendToLastMessage } from "@/lib/transcript-format";
import type { TranscriptMessage } from "@/lib/types";

type TranscriptTextSize = "xs" | "sm" | "md" | "lg" | "xl";

const TEXT_SIZE_CLASSES: Record<TranscriptTextSize, string> = {
  xs: "text-sm md:text-base",
  sm: "text-base md:text-lg",
  md: "text-lg md:text-xl",
  lg: "text-xl md:text-2xl",
  xl: "text-2xl md:text-3xl"
};

export function TranscriptPane({
  messages,
  interimText,
  interimSource = "speech",
  interimTimestamp,
  autoScroll,
  textSize = "lg",
  gap = "normal",
  className = ""
}: {
  messages: TranscriptMessage[];
  interimText?: string;
  interimSource?: "speech" | "text";
  interimTimestamp?: number;
  autoScroll: boolean;
  textSize?: TranscriptTextSize;
  gap?: "tight" | "compact" | "normal";
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textClass = TEXT_SIZE_CLASSES[textSize];
  const isEmpty = messages.length === 0 && !interimText;
  const interimEvent = {
    transcript: interimText ?? "",
    isFinal: false,
    timestamp: interimTimestamp ?? Date.now(),
    source: interimSource
  };
  const inlineInterim =
    Boolean(interimText) &&
    shouldAppendToLastMessage(messages, interimEvent);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages, interimText, autoScroll]);

  return (
    <div className={`overflow-y-auto ${className}`}>
      <div
        className={`mx-auto flex min-h-full w-full max-w-none flex-col px-5 py-10 ${
          isEmpty ? "justify-center" : "justify-start"
        } ${
          gap === "tight" ? "gap-4" : gap === "compact" ? "gap-5" : "gap-6"
        }`}
      >
        {isEmpty ? (
          <p className="text-center text-sm text-neutral-500">Waiting for speech...</p>
        ) : null}
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const interimPreview =
            isLast && inlineInterim && interimText
              ? joinTranscriptText(message.text, interimText).slice(message.text.length)
              : "";

          return (
            <p
              key={message.id}
              className={`${textClass} leading-snug ${
                message.source === "text"
                  ? "font-mono text-neutral-500"
                  : "font-semibold text-neutral-950"
              }`}
            >
              {message.text}
              {interimPreview ? (
                <span
                  className={interimSource === "text" ? "text-neutral-400" : "text-neutral-500"}
                >
                  {interimPreview}
                </span>
              ) : null}
            </p>
          );
        })}
        {interimText && !inlineInterim ? (
          <p
            className={`${textClass} leading-snug ${
              interimSource === "text"
                ? "font-mono text-neutral-400"
                : "text-neutral-500"
            }`}
          >
            {interimText}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
