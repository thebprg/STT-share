import Ably from "ably";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const apiKey = process.env.ABLY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "ABLY_API_KEY is not configured." }, { status: 500 });
  }

  const client = new Ably.Rest(apiKey);
  const tokenRequest = await client.auth.createTokenRequest({
    clientId: `browser-${crypto.randomUUID()}`,
    capability: {
      "*": ["publish", "subscribe", "presence"]
    },
    ttl: 60 * 60 * 1000
  });

  return NextResponse.json(tokenRequest);
}
