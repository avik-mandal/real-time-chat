"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const user = searchParams.get("user");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: string; file: File } | null>(null);

  // Load previous messages from API
  useEffect(() => {
    if (!user) return;

    const loadPreviousMessages = async () => {
      try {
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
          console.log(`📜 Loaded ${formattedMessages.length} previous messages from database`);
        }
      } catch (error) {
        console.error("Error loading previous messages:", error);
      }
    };

    loadPreviousMessages();
  }, [user]);

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
      { threshold: 0.5 }
    );

    const messageElements = document.querySelectorAll("[data-message-id]");
    messageElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [messages, user, isConnected]);

  useEffect(() => {
    if (!user) return;

    const socketInstance = socket;
    if (!socketInstance) {
      console.error("Socket not initialized");
      return;
    }

    const handleConnect = () => {
      console.log("✅ Connected to server");
      setIsConnected(true);
      setConnectionError(null);
      socketInstance.emit("join", user);
    };

    const handleDisconnect = (reason: string) => {
      console.log("❌ Disconnected from server:", reason);
      setIsConnected(false);
      if (reason === "io server disconnect") {
        setConnectionError("Server disconnected. Please refresh the page.");
      }
    };

    const handleConnectError = (error: Error) => {
      console.error("❌ Connection error:", error);
      setConnectionError("Failed to connect to server. Make sure the server is running.");
      setIsConnected(false);
    };

    const handleReceiveMessage = (m: Message) => {
      console.log("📨 Received message:", m);
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
      console.log("📜 Received previous messages from server:", previousMessages.length);
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
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const shouldShowAvatar = (currentIndex: number) => {
    if (currentIndex === 0) return true;
    const currentMsg = messages[currentIndex];
    const previousMsg = messages[currentIndex - 1];
    return (
      currentMsg.sender !== previousMsg.sender ||
      (currentMsg.timestamp &&
        previousMsg.timestamp &&
        currentMsg.timestamp - previousMsg.timestamp > 300000)
    );
  };

  const shouldShowTimestamp = (currentIndex: number) => {
    if (currentIndex === 0) return true;
    const currentMsg = messages[currentIndex];
    const previousMsg = messages[currentIndex - 1];
    return (
      currentMsg.sender !== previousMsg.sender ||
      (currentMsg.timestamp &&
        previousMsg.timestamp &&
        currentMsg.timestamp - previousMsg.timestamp > 300000)
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      alert("Please select an image or video file");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview({ url, type: (isImage ? "image" : "video") as "image" | "video", file });
  };

  const uploadFile = async (file: File, fileType: "image" | "video") => {
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
  };

  const send = async () => {
    const socketInstance = socket;
    if (!socketInstance || !socketInstance.connected) {
      alert("Not connected to server. Please wait for connection.");
      return;
    }

    let fileUrl: string | null = null;
    let fileType: "image" | "video" | undefined = undefined;
    let fileName: string | undefined = undefined;

    // Upload file if preview exists
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

    // Don't send if no text and no file
    if (!msg.trim() && !fileUrl) return;

    const message: Message = {
      sender: user!,
      text: msg.trim(),
      timestamp: Date.now(),
      fileUrl: fileUrl || undefined,
      fileType,
      fileName,
    };

    console.log("📤 Sending message:", message);
    setMessages((prev) => [...prev, { ...message, self: true, readBy: [] }]);
    socketInstance.emit("send-message", message);
    setMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !uploading) {
      e.preventDefault();
      send();
    }
  };

  const isMyMessage = (m: Message) => m.self || m.sender === user;
  const isRead = (m: Message) => {
    if (!m._id || !user) return false;
    const otherUsers = messages
      .filter((msg) => msg.sender !== user)
      .map((msg) => msg.sender);
    const uniqueOtherUsers = Array.from(new Set(otherUsers));
    return uniqueOtherUsers.every((u) => m.readBy?.includes(u));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <p className="text-xl text-gray-800 dark:text-white mb-2">
            Please provide a user parameter
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Example: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">?user=John</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-300 dark:border-yellow-700 px-4 py-2 z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
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
              className="text-xs px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
              {getInitials(user)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Chat as <span className="text-blue-600 dark:text-blue-400 ml-1">{user}</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isConnected ? "Online" : "Connecting..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-2 sm:px-4 py-4"
      >
        <div className="max-w-4xl mx-auto space-y-1">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-400"
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
                <p className="text-gray-500 dark:text-gray-400">
                  No messages yet. Start the conversation!
                </p>
              </div>
            </div>
          ) : (
            messages.map((m, i) => {
              const isMine = isMyMessage(m);
              const showAvatar = !isMine && shouldShowAvatar(i);
              const showTimestamp = shouldShowTimestamp(i);
              const read = isRead(m);

              return (
                <div key={m._id || i} className="space-y-1">
                  {showTimestamp && (
                    <div className="flex justify-center my-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
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
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-semibold">
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
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 px-1">
                          {m.sender}
                        </span>
                      )}
                      <div
                        className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
                          isMine
                            ? "bg-blue-500 text-white rounded-br-md"
                            : "bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-600"
                        }`}
                      >
                        {/* File Display */}
                        {m.fileUrl && (
                          <div className="mb-2 rounded-lg overflow-hidden">
                            {m.fileType === "image" ? (
                              <img
                                src={m.fileUrl}
                                alt={m.fileName || "Image"}
                                className="max-w-full h-auto max-h-64 object-cover cursor-pointer"
                                onClick={() => window.open(m.fileUrl, "_blank")}
                              />
                            ) : (
                              <video
                                src={m.fileUrl}
                                controls
                                className="max-w-full h-auto max-h-64"
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
                        <div className="flex items-center gap-1 mt-1.5">
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
                            <div className="flex items-center">
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
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <div className="flex-1 relative">
              {preview.type === "image" ? (
                <img
                  src={preview.url}
                  alt="Preview"
                  className="max-h-20 w-auto rounded"
                />
              ) : (
                <video src={preview.url} className="max-h-20 w-auto rounded" />
              )}
            </div>
            <button
              onClick={() => setPreview(null)}
              className="px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 sm:px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 rounded-2xl transition-colors"
            disabled={uploading}
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
            />
          </div>
          <button
            onClick={send}
            disabled={(!msg.trim() && !preview) || !isConnected || uploading}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center min-w-[80px]"
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
