"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { normalizeSessionCode } from "@/lib/session";

export function ViewerJoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeSessionCode(code);
    if (normalized.length === 6) {
      router.push(`/session/${normalized}`);
    }
  }

  return (
    <form onSubmit={join} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-neutral-200">
      <label className="text-sm font-medium text-neutral-800" htmlFor="join-code">
        Join as viewer
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="join-code"
          value={code}
          onChange={(event) => setCode(normalizeSessionCode(event.target.value))}
          placeholder="ABC123"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 uppercase tracking-[0.12em] text-neutral-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          disabled={normalizeSessionCode(code).length !== 6}
          className="rounded-md bg-neutral-950 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          Join
        </button>
      </div>
    </form>
  );
}
