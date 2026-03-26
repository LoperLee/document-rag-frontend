"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/config";

type Message = {
  role: "user" | "ai";
  content: string;
};

function DashboardContent() {
  const [role, setRole] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = searchParams.get("chatId");

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    setRole(storedRole);

    if (!chatId) {
      const newId = crypto.randomUUID();
      router.replace(`/dashboard?chatId=${newId}`);
    } else {
      fetchHistory(chatId, storedRole);
    }
  }, [chatId]);

  const fetchHistory = async (id: string, storedRole: string | null) => {
    setIsFetchingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat/${id}/history`);
      if (res.ok) {
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          setMessages(data.history);
        } else {
          setMessages([{
            role: "ai",
            content: storedRole === "admin"
              ? "환영합니다, 관리자님. 사이드바에서 문서를 관리하고 RAG 성능을 테스트할 수 있습니다."
              : "안녕하세요! AI 어시스턴트입니다. 등록된 지식 기반으로 질문에 답변할 준비가 되었습니다."
          }]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;

    // Save history if first user message
    if (messages.length <= 1) {
      const existingStr = localStorage.getItem("chatHistory");
      let existing: any[] = [];
      if (existingStr) {
        try { existing = JSON.parse(existingStr); } catch (e) { }
      }
      if (!existing.find((c: any) => c.id === chatId)) {
        const newHistory = [{ id: chatId, title: userMessage.slice(0, 30) }, ...existing];
        localStorage.setItem("chatHistory", JSON.stringify(newHistory));
        window.dispatchEvent(new Event('chatHistoryUpdated'));
      }
    }

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: userMessage, chat_id: chatId }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "ai", content: data.response }]);
      } else {
        setMessages((prev) => [...prev, { role: "ai", content: "오류: API에서 응답을 가져올 수 없습니다." }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "ai", content: "오류: 서버 연결에 실패했습니다." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          {isFetchingHistory ? (
            <div className="flex justify-center items-center py-10 text-slate-500 gap-2">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span>로딩 중입니다 잠시만 기다려주세요.</span>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot size={18} className="text-indigo-600" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 ${msg.role === "user"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-50 text-slate-800 border border-slate-100 shadow-sm"
                      }`}
                  >
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center flex-shrink-0 mt-1">
                      <User size={18} className="text-slate-600" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={18} className="text-indigo-600" />
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-2 text-slate-500">
                    <Loader2 size={16} className="animate-spin text-indigo-500" />
                    응답 생성 중...
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-sm">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="문서에 대해 질문해보세요..."
            className="flex-1 bg-transparent pl-4 pr-2 py-4 focus:outline-none resize-none text-slate-800 placeholder-slate-400 min-h-[56px] max-h-[200px]"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="mr-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm flex-shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          AI가 생성한 내용은 부정확할 수 있습니다. 원본 문서를 통해 사실을 확인하세요.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
