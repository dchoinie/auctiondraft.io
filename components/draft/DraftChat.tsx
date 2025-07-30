"use client";

import React, { useState, useRef, useEffect } from "react";
import PartySocket from "partysocket";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@/stores/userStore";

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

interface DraftChatProps {
  partySocket: PartySocket | null;
  user: User | null;
  isOpen: boolean;
  onToggle: () => void;
}

export default function DraftChat({
  partySocket,
  user,
  isOpen,
  onToggle,
}: DraftChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Listen for chat messages from PartyKit and request chat history
  useEffect(() => {
    console.log("DraftChat: Setting up listeners, partySocket:", partySocket);
    if (!partySocket) {
      console.log("DraftChat: No partySocket provided");
      setIsConnected(false);
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      let rawData = event.data;
      if (rawData instanceof ArrayBuffer) {
        rawData = new TextDecoder().decode(rawData);
      }

      try {
        const message = JSON.parse(rawData as string);
        console.log("DraftChat: Received message:", message.type);
        
        if (message.type === "chatMessage") {
          setMessages(prev => [...prev, message.data]);
        } else if (message.type === "init" && message.data?.chatMessages) {
          // Load chat history from initial state
          setMessages(message.data.chatMessages || []);
        }
      } catch (error) {
        console.error("Error parsing chat message:", error);
      }
    };

    const handleOpen = () => {
      console.log("DraftChat: WebSocket opened");
      setIsConnected(true);
      // Chat history will be included in the initial state sent by PartyKit
    };

    const handleClose = () => {
      console.log("DraftChat: WebSocket closed");
      setIsConnected(false);
    };

    const handleError = (error: Event) => {
      console.error("DraftChat: WebSocket error:", error);
      setIsConnected(false);
    };

    console.log("DraftChat: Adding event listeners");
    partySocket.addEventListener("message", handleMessage);
    partySocket.addEventListener("open", handleOpen);
    partySocket.addEventListener("close", handleClose);
    partySocket.addEventListener("error", handleError);

    // Check if socket is already open
    if (partySocket.readyState === WebSocket.OPEN) {
      console.log("DraftChat: Socket already open, setting connected");
      setIsConnected(true);
    }

    return () => {
      console.log("DraftChat: Removing event listeners");
      partySocket.removeEventListener("message", handleMessage);
      partySocket.removeEventListener("open", handleOpen);
      partySocket.removeEventListener("close", handleClose);
      partySocket.removeEventListener("error", handleError);
    };
  }, [partySocket]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !partySocket || !user) return;

    const messageData = {
      type: "chatMessage",
      data: {
        id: Date.now().toString(),
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        message: inputMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      },
    };

    partySocket.send(JSON.stringify(messageData));
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={onToggle}
        className={`fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg transition-all duration-200 ${
          isOpen
            ? "bg-red-600 hover:bg-red-700"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
        title={isOpen ? "Close Chat" : "Open Chat"}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 z-40 w-80 h-96 shadow-xl border-2 border-gray-400 bg-gradient-to-br from-gray-900/95 to-gray-800/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-emerald-300 text-sm flex items-center justify-between">
              <span>Draft Chat</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-xs text-gray-400">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0 h-full flex flex-col">
            {/* Messages Area */}
            <ScrollArea className="flex-1 px-3 pb-2" ref={scrollAreaRef}>
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-4">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${
                        msg.userId === user?.id ? "flex-row-reverse" : ""
                      }`}
                    >
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-emerald-600 text-white">
                          {getUserInitials(msg.userName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div
                        className={`max-w-[70%] ${
                          msg.userId === user?.id
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-700 text-gray-200"
                        } rounded-lg px-3 py-2 text-sm`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs">
                            {msg.userName}
                          </span>
                          <span className="text-xs opacity-70">
                            {msg.timestamp}
                          </span>
                        </div>
                        <div className="break-words">{msg.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 border-t border-gray-600">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 border-gray-600 text-gray-200 placeholder:text-gray-400"
                  disabled={!isConnected}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || !isConnected}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
} 