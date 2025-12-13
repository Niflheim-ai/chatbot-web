"use client";

import { FormEvent, useState } from "react";

type Message = {
  id: number;
  role: "user" | "bot";
  content: string;
};

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextId, setNextId] = useState(1);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: nextId,
      role: "user",
      content: trimmed
    };

    setNextId((id) => id + 1);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.error || "Something went wrong";
        throw new Error(msg);
      }

      const data = (await res.json()) as { reply?: string };
      const replyText = data.reply?.trim() || "No response from bot.";

      const botMessage: Message = {
        id: nextId + 1,
        role: "bot",
        content: replyText
      };

      setNextId((id) => id + 2);
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur">
        <header className="border-b border-slate-800 px-4 py-3">
          <h1 className="text-lg font-semibold">n8n Chatbot</h1>
          <p className="text-xs text-slate-400">
            Messages are processed via n8n and stored in Supabase.
          </p>
        </header>

        <section className="flex h-[420px] flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400">
                Start the conversation by sending a message.
              </p>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={
                    m.role === "user"
                      ? "chat-bubble-user"
                      : "chat-bubble-bot"
                  }
                >
                  <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="chat-bubble-bot flex items-center gap-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></span>
                  <span className="h-2 w-2 animate-bounce delay-150 rounded-full bg-slate-400" style={{ animationDelay: "150ms" }}></span>
                  <span className="h-2 w-2 animate-bounce delay-300 rounded-full bg-slate-400" style={{ animationDelay: "300ms" }}></span>
                  <span className="text-xs text-slate-300">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400">
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-slate-800 px-4 py-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow disabled:cursor-not-allowed disabled:bg-blue-800"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}