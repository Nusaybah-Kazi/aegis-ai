import { useState, useRef, useEffect } from "react";

import client from "../api/client";

const PROVIDERS = [
  { value: "gpt-oss-fast", label: "GPT-OSS Fast" },
  { value: "gpt-oss-reasoning", label: "GPT-OSS Reasoning" },
  { value: "qwen", label: "Qwen" },
];

function ChatBubble({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[75%]">
          {msg.text}
        </div>
      </div>
    );
  }

  if (msg.status === "blocked") {
    return (
      <div className="flex justify-start mb-3">
        <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-lg px-4 py-2 max-w-[75%]">
          <p className="font-semibold text-sm mb-1">Blocked</p>
          <p className="text-sm">{msg.reason}</p>

          {msg.findings && msg.findings.length > 0 && (
            <ul className="text-xs mt-1 list-disc list-inside opacity-80">
              {msg.findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (msg.status === "paused") {
    return (
      <div className="flex justify-start mb-3">
        <div className="bg-yellow-950/40 border border-yellow-800 text-yellow-300 rounded-lg px-4 py-2 max-w-[75%]">
          <p className="font-semibold text-sm mb-1">
            Pending admin review
          </p>

          <p className="text-sm">{msg.reason}</p>

          <p className="text-xs mt-1 opacity-70">
            Request #{msg.queue_id} — check My Requests once approved.
          </p>
        </div>
      </div>
    );
  }

  if (msg.status === "unavailable") {
    return (
      <div className="flex justify-start mb-3">
        <div className="bg-slate-800/70 border border-slate-700 text-slate-300 rounded-lg px-4 py-2 max-w-[75%]">
          <p className="text-sm">{msg.reason}</p>
        </div>
      </div>
    );
  }

  // answered
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-[#111b2a] border border-[#24344a] text-[#c7d5e8] rounded-lg px-4 py-2 max-w-[75%]">
        {msg.provider && (
          <p className="text-xs font-semibold text-[#6f89a8] mb-1">
            {PROVIDERS.find((p) => p.value === msg.provider)?.label ||
              msg.provider}
          </p>
        )}

        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
      </div>
    </div>
  );
}

function ChatPanel({ endpoint, extraFields, providerSelector }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();

    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const body = { message: text, ...extraFields };
      const { data } = await client.post(endpoint, body);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          status: data.status,
          text: data.answer,
          reason: data.reason,
          findings: data.findings,
          queue_id: data.queue_id,
          provider: data.provider,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          status: "blocked",
          reason:
            err.response?.data?.detail ||
            "Something went wrong sending your message.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-[70vh] border border-[#24344a] rounded-lg bg-[#0f1724]">
      {providerSelector}

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-[#7f96b3] text-center mt-8">
            Start a conversation below.
          </p>
        )}

        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-[#111b2a] border border-[#24344a] text-[#6f89a8] rounded-lg px-4 py-2 text-sm">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#24344a] p-3 flex gap-2">
        <textarea
          className="flex-1 bg-[#080e17] border border-[#2a3b52] text-[#c7d5e8] placeholder-[#5d7898] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function EmployeeChat() {
  const [tab, setTab] = useState("internal");
  const [provider, setProvider] = useState("gpt-oss-fast");

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4 text-[#c7d5e8]">
        AI Assistant
      </h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("internal")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === "internal"
              ? "bg-blue-600 text-white"
              : "bg-[#182333] text-[#9eb3cc] border border-[#2a3b52]"
          }`}
        >
          AI Assistant
        </button>

        <button
          onClick={() => setTab("external")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === "external"
              ? "bg-blue-600 text-white"
              : "bg-[#182333] text-[#9eb3cc] border border-[#2a3b52]"
          }`}
        >
          External AI
        </button>
      </div>

      {tab === "internal" ? (
        <ChatPanel
          key="internal"
          endpoint="/chat/internal"
          extraFields={{}}
        />
      ) : (
        <ChatPanel
          key="external"
          endpoint="/chat/external"
          extraFields={{ provider }}
          providerSelector={
            <div className="border-b border-[#24344a] p-3">
              <label className="text-xs font-medium text-[#6f89a8] mr-2">
                Provider:
              </label>

              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="bg-[#080e17] border border-[#2a3b52] text-[#c7d5e8] rounded px-2 py-1 text-sm"
              >
                {PROVIDERS.map((p) => (
                  <option
                    key={p.value}
                    value={p.value}
                    className="bg-[#0f1724] text-[#c7d5e8]"
                  >
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      )}
    </div>
  );
}