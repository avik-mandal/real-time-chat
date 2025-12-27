"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { socket } from "@/lib/socket";

interface Message {
  _id?: string;
  sender: string;
  text: string;
  self?: boolean;
  timestamp?: number;
  fileUrl?: string;
  fileType?: "image" | "video";
  fileName?: string;
  readBy?: string[];
}

export default function Chat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = searchParams.get("user");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: string; file: File } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem("isAuthenticated");
      const storedUsername = localStorage.getItem("username");
      
      if (authStatus !== "true") {
        router.push("/login");
        return;
      }
      
      if (user !== storedUsername && storedUsername) {
        router.push(`/chat?user=${encodeURIComponent(storedUsername)}`);
        return;
      }
      
      setIsAuthenticated(true);
      setCheckingAuth(false);
    };

    checkAuth();
  }, [router, user]);

  // Load previous messages from API
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const loadPreviousMessages = async () => {
      try {
        setLoadingMessages(true);
        const response = await fetch("/api/messages?limit=50");
        const data = await response.json();
        
        if (data.success && data.messages) {
          const formattedMessages = data.messages.map((m: any) => ({
            _id: m._id,
            sender: m.sender,
            text: m.text || "",
            fileUrl: m.fileUrl,
            fileType: m.fileType,
            fileName: m.fileName,
            timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
            readBy: m.readBy || [],
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Error loading previous messages:", error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadPreviousMessages();
  }, [user, isAuthenticated]);

  // Auto-scroll to bottom with debounce
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }, 100);
  }, []);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (!user || !isConnected) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute("data-message-id");
            const messageSender = entry.target.getAttribute("data-message-sender");
            
            if (messageId && messageSender && messageSender !== user) {
              const socketInstance = socket;
              if (socketInstance && socketInstance.connected) {
                socketInstance.emit("mark-as-read", { messageId, user });
              }
            }
          }
        });
      },
      { threshold: 0.5, rootMargin: "0px 0px -50px 0px" }
    );

    const messageElements = document.querySelectorAll("[data-message-id]");
    messageElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages, user, isConnected]);

  // Socket connection management
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const socketInstance = socket;
    if (!socketInstance) {
      console.error("Socket not initialized");
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      socketInstance.emit("join", user);
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      if (reason === "io server disconnect") {
        setConnectionError("Server disconnected. Please refresh the page.");
      }
    };

    const handleConnectError = (error: Error) => {
      setConnectionError("Failed to connect to server. Make sure the server is running.");
      setIsConnected(false);
    };

    const handleReceiveMessage = (m: Message) => {
      setMessages((prev) => {
        const exists = prev.some(
          (msg) =>
            msg._id === m._id ||
            (msg.sender === m.sender &&
              msg.text === m.text &&
              !msg._id &&
              Math.abs((msg.timestamp || 0) - (m.timestamp || Date.now())) < 1000)
        );
        if (exists) return prev;
        return [...prev, { ...m, timestamp: m.timestamp || Date.now(), readBy: m.readBy || [] }];
      });
    };

    const handlePreviousMessages = (previousMessages: Message[]) => {
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m._id || `${m.sender}-${m.text}-${m.timestamp}`));
        const newMessages = previousMessages
          .map((m: any) => ({
            _id: m._id,
            sender: m.sender,
            text: m.text || "",
            fileUrl: m.fileUrl,
            fileType: m.fileType,
            fileName: m.fileName,
            timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
            readBy: m.readBy || [],
          }))
          .filter((m) => !existing.has(m._id || `${m.sender}-${m.text}-${m.timestamp}`));
        return [...newMessages, ...prev];
      });
    };

    const handleMessageRead = (data: { messageId: string; readBy: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId
            ? { ...m, readBy: [...(m.readBy || []), data.readBy] }
            : m
        )
      );
    };

    if (socketInstance.connected) {
      handleConnect();
    } else {
      socketInstance.connect();
    }

    socketInstance.on("connect", handleConnect);
    socketInstance.on("disconnect", handleDisconnect);
    socketInstance.on("connect_error", handleConnectError);
    socketInstance.on("receive-message", handleReceiveMessage);
    socketInstance.on("previous-messages", handlePreviousMessages);
    socketInstance.on("message-read", handleMessageRead);

    return () => {
      socketInstance.off("connect", handleConnect);
      socketInstance.off("disconnect", handleDisconnect);
      socketInstance.off("connect_error", handleConnectError);
      socketInstance.off("receive-message", handleReceiveMessage);
      socketInstance.off("previous-messages", handlePreviousMessages);
      socketInstance.off("message-read", handleMessageRead);
    };
  }, [user, isAuthenticated]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Utility functions
  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const formatTime = useCallback((timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  const shouldShowAvatar = useCallback((currentIndex: number) => {
    if (currentIndex === 0) return true;
    const currentMsg = messages[currentIndex];
    const previousMsg = messages[currentIndex - 1];
    return (
      currentMsg.sender !== previousMsg.sender ||
      (currentMsg.timestamp &&
        previousMsg.timestamp &&
        currentMsg.timestamp - previousMsg.timestamp > 300000)
    );
  }, [messages]);

  const shouldShowTimestamp = useCallback((currentIndex: number) => {
    if (currentIndex === 0) return true;
    const currentMsg = messages[currentIndex];
    const previousMsg = messages[currentIndex - 1];
    return (
      currentMsg.sender !== previousMsg.sender ||
      (currentMsg.timestamp &&
        previousMsg.timestamp &&
        currentMsg.timestamp - previousMsg.timestamp > 300000)
    );
  }, [messages]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      alert("Please select an image or video file");
      return;
    }

    // Check file size
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 50 * 1024 * 1024; // 50MB
    
    if (isImage && file.size > maxImageSize) {
      alert("Image size must be less than 10MB");
      return;
    }
    
    if (isVideo && file.size > maxVideoSize) {
      alert("Video size must be less than 50MB");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview({ url, type: (isImage ? "image" : "video") as "image" | "video", file });
  }, []);

  const uploadFile = useCallback(async (file: File, fileType: "image" | "video") => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", fileType);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        return data.fileUrl;
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Failed to upload file: " + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const send = useCallback(async () => {
    const socketInstance = socket;
    if (!socketInstance || !socketInstance.connected) {
      alert("Not connected to server. Please wait for connection.");
      return;
    }

    let fileUrl: string | null = null;
    let fileType: "image" | "video" | undefined = undefined;
    let fileName: string | undefined = undefined;

    if (preview) {
      fileUrl = await uploadFile(preview.file, preview.type as "image" | "video");
      if (!fileUrl) {
        setPreview(null);
        return;
      }
      fileType = preview.type as "image" | "video";
      fileName = preview.file.name;
      setPreview(null);
    }

    if (!msg.trim() && !fileUrl) return;

    const message: Message = {
      sender: user!,
      text: msg.trim(),
      timestamp: Date.now(),
      fileUrl: fileUrl || undefined,
      fileType,
      fileName,
    };

    setMessages((prev) => [...prev, { ...message, self: true, readBy: [] }]);
    socketInstance.emit("send-message", message);
    setMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    scrollToBottom(false);
  }, [msg, preview, user, uploadFile, scrollToBottom]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !uploading) {
      e.preventDefault();
      send();
    }
  }, [send, uploading]);

  const handleLogout = useCallback(() => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("username");
      router.push("/login");
    }
  }, [router]);

  const isMyMessage = useCallback((m: Message) => m.self || m.sender === user, [user]);
  
  const isRead = useCallback((m: Message) => {
    if (!m._id || !user) return false;
    const otherUsers = Array.from(new Set(
      messages.filter((msg) => msg.sender !== user).map((msg) => msg.sender)
    ));
    return otherUsers.length > 0 && otherUsers.every((u) => m.readBy?.includes(u));
  }, [messages, user]);

  // Memoized message groups
  const messageGroups = useMemo(() => {
    const groups: { sender: string; messages: Message[]; timestamp: number }[] = [];
    
    messages.forEach((msg) => {
      const lastGroup = groups[groups.length - 1];
      if (
        lastGroup &&
        lastGroup.sender === msg.sender &&
        msg.timestamp &&
        lastGroup.timestamp &&
        msg.timestamp - lastGroup.timestamp < 300000
      ) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({
          sender: msg.sender,
          messages: [msg],
          timestamp: msg.timestamp || Date.now(),
        });
      }
    });
    
    return groups;
  }, [messages]);

  // Loading state
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-700 px-4 py-2.5 z-20 animate-slide-down">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                {connectionError || "Connecting to server... Please wait."}
              </p>
            </div>
            <button
              onClick={() => {
                const socketInstance = socket;
                if (socketInstance) {
                  socketInstance.connect();
                }
              }}
              className="text-xs px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 rounded-md transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-3 shadow-sm z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-lg ring-2 ring-white dark:ring-gray-800">
              {getInitials(user)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {user}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></span>
                {isConnected ? "Online" : "Offline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              ></div>
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
              title="Logout"
              aria-label="Logout"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 scroll-smooth"
      >
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-blue-500 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                No messages yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Start the conversation by sending a message!
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-1">
            {messages.map((m, i) => {
              const isMine = isMyMessage(m);
              const showAvatar = !isMine && shouldShowAvatar(i);
              const showTimestamp = shouldShowTimestamp(i);
              const read = isRead(m);

              return (
                <div key={m._id || `${m.sender}-${i}`} className="space-y-1">
                  {showTimestamp && (
                    <div className="flex justify-center my-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                        {formatTime(m.timestamp)}
                      </span>
                    </div>
                  )}
                  <div
                    data-message-id={m._id}
                    data-message-sender={m.sender}
                    className={`flex items-end gap-2 ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isMine && (
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-semibold shadow-md ring-2 ring-white dark:ring-gray-800">
                            {getInitials(m.sender)}
                          </div>
                        ) : (
                          <div className="w-8 h-8"></div>
                        )}
                      </div>
                    )}

                    <div
                      className={`flex flex-col max-w-[75%] sm:max-w-md ${
                        isMine ? "items-end" : "items-start"
                      }`}
                    >
                      {!isMine && showAvatar && (
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 px-1.5">
                          {m.sender}
                        </span>
                      )}
                      <div
                        className={`relative px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 ${
                          isMine
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md"
                            : "bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-600"
                        }`}
                      >
                        {/* File Display */}
                        {m.fileUrl && (
                          <div className="mb-2 rounded-lg overflow-hidden -mx-1">
                            {m.fileType === "image" ? (
                              <img
                                src={m.fileUrl}
                                alt={m.fileName || "Image"}
                                className="max-w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(m.fileUrl, "_blank")}
                                loading="lazy"
                              />
                            ) : (
                              <video
                                src={m.fileUrl}
                                controls
                                className="max-w-full h-auto max-h-64 rounded-lg"
                                preload="metadata"
                              >
                                Your browser does not support video playback.
                              </video>
                            )}
                          </div>
                        )}

                        {/* Text Message */}
                        {m.text && (
                          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                            {m.text}
                          </p>
                        )}

                        {/* Timestamp and Read Status */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div
                            className={`text-xs ${
                              isMine
                                ? "text-blue-100"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {formatTime(m.timestamp)}
                          </div>
                          {isMine && (
                            <div className="flex items-center" title={read ? "Read" : "Sent"}>
                              {read ? (
                                <svg
                                  className="w-4 h-4 text-blue-200"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-4 h-4 text-blue-200"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.469a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isMine && <div className="w-8 h-8 flex-shrink-0"></div>}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 shadow-md">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="flex-1 relative bg-gray-100 dark:bg-gray-700 rounded-lg p-2 overflow-hidden">
              {preview.type === "image" ? (
                <img
                  src={preview.url}
                  alt="Preview"
                  className="max-h-24 w-auto rounded-lg object-cover"
                />
              ) : (
                <video
                  src={preview.url}
                  className="max-h-24 w-auto rounded-lg"
                  controls
                />
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
              {preview.file.name}
            </div>
            <button
              onClick={() => setPreview(null)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium text-sm flex items-center gap-1.5"
              aria-label="Remove preview"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 px-2 sm:px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload file"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={uploading}
            title="Attach file"
            aria-label="Attach file"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>
          <div className="flex-1 relative">
            <input
              className="w-full border border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={preview ? "Add a caption..." : "Type a message..."}
              disabled={uploading}
              aria-label="Message input"
            />
          </div>
          <button
            onClick={send}
            disabled={(!msg.trim() && !preview) || !isConnected || uploading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center min-w-[80px]"
            title="Send message"
            aria-label="Send message"
          >
            {uploading ? (
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
