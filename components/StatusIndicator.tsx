"use client";

import clsx from "clsx";
import type { ConnectionStatus } from "@/lib/types";

const LABELS: Record<ConnectionStatus, string> = {
  idle: "Idle",
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected",
  error: "Error"
};

export function StatusIndicator({
  status,
  label
}: {
  status: ConnectionStatus;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm text-neutral-700 ring-1 ring-neutral-200">
      <span
        className={clsx(
          "h-2.5 w-2.5 rounded-full",
          status === "connected" && "bg-emerald-500",
          status === "connecting" || status === "reconnecting" ? "bg-amber-500" : "",
          status === "disconnected" || status === "idle" ? "bg-neutral-400" : "",
          status === "error" && "bg-red-500"
        )}
      />
      {label ?? LABELS[status]}
    </div>
  );
}
