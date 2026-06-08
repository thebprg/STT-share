"use client";

import Ably from "ably";
import type { ConnectionStateChange, Message, PresenceMessage } from "ably";
import type {
  ConnectionStatus,
  PresenceRole,
  SessionPresenceState,
  TranscriptEvent
} from "@/lib/types";

let realtime: Ably.Realtime | null = null;

export function getAblyClient() {
  if (!realtime) {
    realtime = new Ably.Realtime({
      authUrl: "/api/ably-token",
      autoConnect: true
    });
  }

  return realtime;
}

export function subscribeToConnectionStatus(
  client: Ably.Realtime,
  onStatus: (status: ConnectionStatus) => void
) {
  const handler = (stateChange: ConnectionStateChange) => {
    if (stateChange.current === "connected") onStatus("connected");
    else if (stateChange.current === "connecting") onStatus("connecting");
    else if (stateChange.current === "disconnected") onStatus("disconnected");
    else if (stateChange.current === "suspended") onStatus("reconnecting");
    else if (stateChange.current === "failed") onStatus("error");
  };

  client.connection.on(handler);
  handler({ current: client.connection.state } as ConnectionStateChange);

  return () => client.connection.off(handler);
}

export function publishTranscript(channelName: string, event: TranscriptEvent) {
  const channel = getAblyClient().channels.get(channelName);
  return channel.publish("transcript", event);
}

export function subscribeToTranscript(
  channelName: string,
  onTranscript: (event: TranscriptEvent) => void,
  onError?: () => void
) {
  const channel = getAblyClient().channels.get(channelName);
  const handler = (message: Message) => {
    onTranscript(message.data as TranscriptEvent);
  };

  channel.subscribe("transcript", handler).catch(() => onError?.());

  return () => {
    channel.unsubscribe("transcript", handler);
    channel.detach().catch(() => undefined);
  };
}

function getPresenceState(members: PresenceMessage[]): SessionPresenceState {
  const roles = members.map((member) => (member.data as { role?: PresenceRole } | undefined)?.role);

  return {
    hasSpeaker: roles.includes("speaker"),
    listenerCount: roles.filter((role) => role === "listener").length,
    totalCount: members.length
  };
}

export async function enterSessionPresence(channelName: string, role: PresenceRole) {
  const channel = getAblyClient().channels.get(channelName);
  await channel.presence.enter({ role });
}

export async function leaveSessionPresence(channelName: string, role: PresenceRole) {
  const channel = getAblyClient().channels.get(channelName);
  await channel.presence.leave({ role }).catch(() => undefined);
}

export async function subscribeToSessionPresence(
  channelName: string,
  onPresence: (state: SessionPresenceState) => void,
  onError?: () => void
) {
  const channel = getAblyClient().channels.get(channelName);
  const updatePresence = async () => {
    try {
      const members = await channel.presence.get();
      onPresence(getPresenceState(members));
    } catch {
      onError?.();
    }
  };
  const handler = () => {
    updatePresence();
  };

  await channel.presence.subscribe(handler).catch(() => onError?.());
  await updatePresence();

  return () => {
    channel.presence.unsubscribe(handler);
  };
}
