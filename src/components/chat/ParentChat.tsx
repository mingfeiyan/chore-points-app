"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Balances = Record<string, number>;

type Kid = {
  id: string;
  name: string | null;
};

export default function ParentChat({ kids }: { kids: Kid[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<Balances>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("chat");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
        if (data.balances) {
          setBalances(data.balances);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "Something went wrong. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to connect. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasBalances = Object.keys(balances).length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg flex flex-col h-[600px] sm:h-[700px]">
      {/* Header with balances */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">{t("title")}</h2>
        {hasBalances && (
          <div className="flex flex-wrap gap-2 mt-2">
            {kids.map((kid) => (
              <div
                key={kid.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full text-sm"
              >
                <span className="text-amber-500">&#x2B50;</span>
                <span className="font-medium text-gray-700">
                  {kid.name || "Kid"}
                </span>
                <span className="font-bold text-amber-600">
                  {balances[kid.id] ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 px-4">
            <div className="text-5xl mb-4">&#x2728;</div>
            <p className="text-lg font-medium text-gray-500">{t("welcome")}</p>
            <p className="text-sm mt-2 max-w-sm">{t("welcomeHint")}</p>
            <div className="mt-6 space-y-2 w-full max-w-sm">
              {[t("example1"), t("example2"), t("example3")].map(
                (example, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(example);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-600 transition-colors"
                  >
                    &quot;{example}&quot;
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-500 text-white rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-400 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>&#x2022;</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>&#x2022;</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>&#x2022;</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
