# Live Transcript Share

Minimal browser-first live transcription sharing prototype.

## What It Does

- A speaker starts a random 6-character session.
- The speaker uses the Deepgram API key configured for the app.
- Microphone audio streams directly from the speaker browser to Deepgram Streaming STT.
- Interim and final transcripts are published from the speaker browser to an Ably channel.
- Viewers join with `/session/[sessionCode]` or the code entry form.
- Viewers only see transcript events received after joining.
- No authentication, database, user accounts, server-side session storage, or transcript persistence.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Ably Setup

1. Create an Ably app at `https://ably.com`.
2. Copy an API key with publish and subscribe access.
3. Set it in `.env.local`:

```bash
ABLY_API_KEY=your-ably-api-key
NEXT_PUBLIC_DEEPGRAM_API_KEY=your-deepgram-api-key
```

The browser authenticates through `app/api/ably-token/route.ts`, which creates short-lived token requests. The Ably API key is not exposed to the client bundle.

Channels use this format:

```text
session-[SESSION_CODE]
```

## Deepgram Usage

1. Create or copy a Deepgram API key from `https://console.deepgram.com`.
2. Set it in `.env.local` as `NEXT_PUBLIC_DEEPGRAM_API_KEY`.
3. Click `Start Session`.
4. Allow microphone access.

Because microphone audio streams directly from the browser to Deepgram, this MVP exposes the Deepgram key to the speaker browser through a `NEXT_PUBLIC_` environment variable. Audio streams to Deepgram with:

```text
model=nova-3
interim_results=true
smart_format=true
endpointing=500
utterance_end_ms=1500
```

## Viewer Flow

- Open the copied session link, for example `/session/ABC123`.
- Or enter the 6-character code in the join form.
- The transcript is held only in browser memory.
- Refreshing or closing the tab clears the transcript.

## Vercel Deployment

1. Push this repository to GitHub.
2. In Vercel, create a new project from the GitHub repository.
3. Add the environment variable:

```bash
ABLY_API_KEY=your-ably-api-key
NEXT_PUBLIC_DEEPGRAM_API_KEY=your-deepgram-api-key
```

4. Deploy.

No database or extra infrastructure is required.

## Latency Notes

- Browser microphone chunks are sent to Deepgram every `100ms`.
- Deepgram interim results are published immediately to Ably.
- Viewers render interim and final events as they arrive.
- Real-world latency depends on microphone permissions, browser media encoding, network conditions, Deepgram response time, and Ably realtime connectivity.
