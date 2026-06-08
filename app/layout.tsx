import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Live Transcript Share",
  description: "Low-latency browser transcription sharing with Deepgram and Ably."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
