"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Menu, X, LogOut, CheckCircle, List, Trash2, MessageSquare } from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [chatHistory, setChatHistory] = useState<{id: string, title: string}[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string } | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const handleFileClick = async (file: { id: string; name: string }) => {
    setSelectedFile(file);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/files/content?id=${file.id}&name=${file.name}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
      } else {
        alert("Failed to load file.");
      }
    } catch (e) {
      alert("Error fetching file.");
    }
  };

  const handleDeleteFile = async (file: {id: string, name: string}) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE_URL}/files/${file.id}?filename=${encodeURIComponent(file.name)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setFiles(files.filter(f => f.id !== file.id));
        if (selectedFile?.id === file.id) closeViewer();
      } else {
        alert("Failed to delete file.");
      }
    } catch (e) {
      alert("Error deleting file.");
    }
  };

  const closeViewer = () => {
    setSelectedFile(null);
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
  };

  const loadHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
      setChatHistory(history);
    } catch (e) {}
  };

  useEffect(() => {
    loadHistory();
    window.addEventListener("chatHistoryUpdated", loadHistory);
    return () => window.removeEventListener("chatHistoryUpdated", loadHistory);
  }, []);

  const handleDeleteChat = (id: string) => {
    if (!confirm("이 대화를 삭제하시겠습니까?")) return;
    const history = JSON.parse(localStorage.getItem("chatHistory") || "[]");
    const newHistory = history.filter((c: any) => c.id !== id);
    localStorage.setItem("chatHistory", JSON.stringify(newHistory));
    setChatHistory(newHistory);
    
    // If current chat is deleted, redirect to start a new chat
    const currentChatId = new URLSearchParams(window.location.search).get("chatId");
    if (currentChatId === id) {
      router.push("/dashboard");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    if (token) {
      setRole(storedRole);
      if (storedRole === "admin") {
        fetchFiles();
      }
    } else {
      setRole(null);
    }
  }, [router]);

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/files`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
      // Fake data for demo if API fails
      setFiles([{ id: "1", name: "Sample Document.pdf" }, { id: "2", name: "Research Note.txt" }]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = '/dashboard';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setUploadStatus("업로드 성공!");
        fetchFiles();
        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        setUploadStatus("업로드 실패.");
        setTimeout(() => setUploadStatus(null), 3000);
      }
    } catch (error) {
      setUploadStatus("업로드 오류.");
      setTimeout(() => setUploadStatus(null), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const isAdmin = role === "admin";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800 font-sans">
      {/* Sidebar - accessible to all users for chat history */}
      <aside
        className={`${isSidebarOpen ? "w-80 translate-x-0" : "w-0 -translate-x-full"
          } transition-all duration-300 ease-in-out border-r border-slate-200 bg-white flex flex-col shadow-sm flex-shrink-0 z-20`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between min-w-[320px]">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            {isAdmin ? (
              <>
                <FileText className="text-indigo-600" size={24} />
                관리자 포털
              </>
            ) : (
              <>
                <MessageSquare className="text-indigo-600" size={24} />
                dorag
              </>
            )}
          </h2>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto min-w-[320px]">
          {/* Recent Chats Section */}
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MessageSquare size={14} /> 최근 대화 목록
            </h3>
            <div className="space-y-2">
              {chatHistory.length > 0 ? (
                chatHistory.map((chat) => (
                  <div 
                    key={chat.id} 
                    className="group relative cursor-pointer text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors"
                  >
                    <span className="truncate flex-1" onClick={() => router.push(`/dashboard?chatId=${chat.id}`)}>{chat.title}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                      className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400 italic">대화 기록이 없습니다.</div>
              )}
            </div>
          </div>

          {isAdmin && (
            <>
              {/* Upload Area */}
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-100 hover:border-indigo-300">
                <Upload size={40} className="text-indigo-400 mb-3" />
                <h3 className="font-semibold text-slate-700 mb-1">컨텍스트 소스 업로드</h3>
                <p className="text-xs text-slate-500 mb-4 max-w-[200px]">AI 응답의 기반이 될 PDF 또는 TXT 문서.</p>
                <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20">
                  {isUploading ? "업로드 중..." : "파일 선택"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
                {uploadStatus && (
                  <div className={`mt-3 text-xs flex items-center gap-1 ${uploadStatus.includes("성공") ? "text-emerald-600" : "text-amber-600"}`}>
                    {uploadStatus.includes("성공") && <CheckCircle size={12} />}
                    {uploadStatus}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <List size={14} /> 업로드된 파일
                </h3>
              <div className="space-y-2">
                {files.length > 0 ? (
                  files.map((file) => (
                    <div 
                      key={file.id} 
                      className="group relative cursor-pointer text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors"
                    >
                      <span className="truncate flex-1" onClick={() => handleFileClick(file)}>{file.name}</span>
                      {isAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteFile(file); }}
                          className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400 italic">아직 업로드된 파일이 없습니다.</div>
                )}
              </div>
            </div>
          </>
          )}
        </div>

        {role && (
          <div className="p-4 border-t border-slate-100 min-w-[320px]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 absolute top-0 left-0 w-full z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-slate-800">
              {isAdmin ? "지식 관리" : "AI 어시스턴트"}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              className="flex items-center gap-2 py-2 px-3 text-sm text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors bg-white font-medium"
            >
              새 채팅
            </button>
            {!role && (
              <button
                onClick={() => router.push("/login")}
                className="flex items-center gap-2 py-2 px-3 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                로그인
              </button>
            )}
            {role && !isAdmin && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 py-2 px-3 text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                로그아웃
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 mt-16 overflow-hidden relative">
          {children}
        </div>
      </main>

      {/* Viewer Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                {selectedFile.name}
              </h3>
              <button onClick={closeViewer} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-4 relative overflow-hidden">
              {fileUrl ? (
                <iframe src={fileUrl} className="w-full h-full bg-white rounded-lg shadow-sm border border-slate-200" title="File Viewer" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 animate-pulse">Loading...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
