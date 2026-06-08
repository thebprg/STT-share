import type { TranscriptEvent, TranscriptMessage } from "@/lib/types";

const PARAGRAPH_BREAK_AFTER_MS = 3500;
const MAX_SENTENCES_PER_PARAGRAPH = 3;
const SENTENCE_END_RE = /[.!?]["')\]]?$/;
const LEADING_PUNCTUATION_RE = /^[,.;:!?)]/;

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function endsSentence(text: string) {
  return SENTENCE_END_RE.test(text.trim());
}

function sentenceCount(text: string) {
  return text.split(/[.!?]+(?:\s+|$)/).length - 1;
}

export function joinTranscriptText(previous: string, next: string) {
  const left = normalizeText(previous);
  const right = normalizeText(next);

  if (!left) return right;
  if (!right) return left;
  if (left.endsWith(right)) return left;

  const separator = LEADING_PUNCTUATION_RE.test(right) ? "" : " ";
  return `${left}${separator}${right}`;
}

function shouldStartNewParagraph(last: TranscriptMessage, event: TranscriptEvent) {
  if ((event.source ?? "speech") !== last.source) {
    return true;
  }

  const pauseMs = event.timestamp - last.receivedAt;

  if (pauseMs >= PARAGRAPH_BREAK_AFTER_MS && endsSentence(last.text)) {
    return true;
  }

  return endsSentence(last.text) && sentenceCount(last.text) >= MAX_SENTENCES_PER_PARAGRAPH;
}

export function shouldAppendToLastMessage(
  messages: TranscriptMessage[],
  event: TranscriptEvent
) {
  const last = messages.at(-1);
  return Boolean(last && !shouldStartNewParagraph(last, event));
}

export function appendTranscriptEvent(
  messages: TranscriptMessage[],
  event: TranscriptEvent
): TranscriptMessage[] {
  const text = normalizeText(event.transcript);

  if (!text) {
    return messages;
  }

  const source = event.source ?? "speech";
  const nextMessage: TranscriptMessage = {
    id: crypto.randomUUID(),
    text,
    isFinal: true,
    receivedAt: event.timestamp,
    source
  };
  if (!shouldAppendToLastMessage(messages, event)) {
    return [...messages, nextMessage];
  }

  const last = messages[messages.length - 1];

  return [
    ...messages.slice(0, -1),
    {
      ...last,
      text: joinTranscriptText(last.text, text),
      receivedAt: event.timestamp
    }
  ];
}
