"use client";

import { useEffect, useRef } from "react";
import type { TranscriptMessage } from "@/lib/types";

type TranscriptTextSize = "xs" | "sm" | "md" | "lg" | "xl";

const TEXT_SIZE_CLASSES: Record<TranscriptTextSize, string> = {
  xs: "text-base md:text-lg",
  sm: "text-lg md:text-xl",
  md: "text-xl md:text-2xl",
  lg: "text-2xl md:text-3xl",
  xl: "text-3xl md:text-4xl"
};

export function TranscriptPane({
  messages,
  interimText,
  interimSource = "speech",
  autoScroll,
  textSize = "lg",
  gap = "normal",
  className = ""
}: {
  messages: TranscriptMessage[];
  interimText?: string;
  interimSource?: "speech" | "text";
  autoScroll: boolean;
  textSize?: TranscriptTextSize;
  gap?: "tight" | "compact" | "normal";
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textClass = TEXT_SIZE_CLASSES[textSize];
  const isEmpty = messages.length === 0 && !interimText;

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
          gap === "tight" ? "gap-0.5" : gap === "compact" ? "gap-1.5" : "gap-3"
        }`}
      >
        {isEmpty ? (
          <p className="text-center text-sm text-neutral-500">Waiting for speech...</p>
        ) : null}
        {messages.map((message) => (
          <p
            key={message.id}
            className={`${textClass} leading-relaxed ${
              message.source === "text"
                ? "font-mono text-neutral-500"
                : "font-semibold text-neutral-950"
            }`}
          >
            {message.text}
          </p>
        ))}
        {interimText ? (
          <p
            className={`${textClass} leading-relaxed ${
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
