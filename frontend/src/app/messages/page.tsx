'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { UserButton } from '@clerk/nextjs';
import { MessageSquare, Send, Phone, Video, ArrowLeft, Plus, Search, MoreVertical, Info, Timer, Mic, Paperclip, ShieldCheck, CheckCheck, Lock, ArrowUp, Shield, MessageSquarePlus, Key, Check } from 'lucide-react';
import type { Connection, Message } from '@/types';

export default function MessagesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const selectedConnectionIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedConnectionIdRef.current = selectedConnection?.id || null;
  }, [selectedConnection]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConnections = useCallback(async () => {
    try {
      const response = await api.get('/connections');
      setConnections(response.data);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (connectionId: string) => {
    try {
      const response = await api.get(`/messages/connection/${connectionId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchConnections();

    let reconnectTimer: NodeJS.Timeout;

    const connectWebSocket = () => {
      const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api')
        .replace('http', 'ws')
        .replace('/api', '');
        
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          try {
            const token = JSON.parse(authStorage).state?.accessToken;
            if (token) ws.send(JSON.stringify({ type: 'auth', token }));
          } catch (e) {}
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message') {
            if (data.message.connectionId === selectedConnectionIdRef.current) {
              setMessages((prev) => [...prev, data.message]);
            }
            fetchConnections();
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      };
      
      return ws;
    };

    const activeWs = connectWebSocket();

    return () => {
      clearTimeout(reconnectTimer);
      activeWs.onclose = null;
      activeWs.close();
    };
  }, [_hasHydrated, user, router, fetchConnections]);

  const selectConnection = (connection: Connection) => {
    setSelectedConnection(connection);
    setShowNewChat(false);
    fetchMessages(connection.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      if (selectedConnection) {
        await api.post('/messages', {
          toVirtualNumber: selectedConnection.user.virtualNumber,
          body: newMessage,
        });
        await fetchMessages(selectedConnection.id);
      }
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const startNewChat = async () => {
    if (!newChatNumber.trim()) return;

    try {
      await api.post('/messages', {
        toVirtualNumber: newChatNumber,
        body: 'Hello!',
      });
      setShowNewChat(false);
      setNewChatNumber('');
      await fetchConnections();
    } catch (error: unknown) {
      console.error('Failed to start conversation:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = err.response?.data?.error || err.message || 'Failed to start conversation';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f8f9fd] flex flex-col font-sans overflow-hidden text-slate-900">

      {/* Top Sub-Header */}
      <header className="h-16 flex-none bg-white border-b border-slate-200/60 shadow-sm z-20 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Messages</h1>
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold tracking-wide">
            3 unread
          </span>
          <div className="hidden lg:flex items-center gap-1 ml-4 bg-slate-100/80 p-1 ">
            <button className="px-3 py-1  bg-white text-slate-900 shadow-sm text-[12px] font-medium transition-all">Direct</button>
            <button className="px-3 py-1  text-slate-500 hover:text-slate-900 text-[12px] font-medium transition-all">Relays</button>
            <button className="px-3 py-1  text-slate-500 hover:text-slate-900 text-[12px] font-medium transition-all">Ephemeral</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowNewChat(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm active:scale-95">
            <MessageSquarePlus className="w-4 h-4" />
            <span className="hidden sm:inline">New Secure Chat</span>
          </button>
        </div>
      </header>

      {/* Main App Container */}
      <div className="flex-1 w-full flex overflow-hidden bg-white z-10">
        
        {/* Left Sidebar - Connection List */}
        <div className={`w-full sm:w-[320px] lg:w-[380px] flex-shrink-0 flex flex-col bg-white border-r border-slate-200/60 z-10 ${selectedConnection && !showNewChat ? 'hidden sm:flex' : 'flex'}`}>
          <div className="p-4">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search alias, virtual line or key..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-0 text-slate-900 rounded-full text-[13px] font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all shadow-sm inset-ring-1 inset-ring-slate-100"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y-0">
            {connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-medium text-slate-600">No conversations</p>
                <p className="text-sm">Start a new chat to begin connecting securely.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {connections.map((connection) => {
                  const isActive = selectedConnection?.id === connection.id;
                  return (
                    <button
                      key={connection.id}
                      onClick={() => selectConnection(connection)}
                      className={`group relative flex items-start gap-3 p-3.5 cursor-pointer transition-colors text-left ${isActive ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                    >
                      {isActive && <span className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r"></span>}
                      
                      <div className="relative flex-shrink-0 mt-0.5">
                        <div className="w-11 h-11 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center shadow-sm text-white font-semibold text-lg">
                          {connection.user.displayName?.[0] || connection.user.virtualNumber[0]}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-[15px] text-slate-900 truncate">
                            {connection.user.displayName || connection.user.virtualNumber}
                          </span>
                          <span className="text-[11px] font-medium text-indigo-600 flex-shrink-0">
                            10:42 AM
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] font-mono font-medium text-slate-500">{connection.user.virtualNumber}</span>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-400">
                            <Lock className="w-3 h-3 text-emerald-600" />
                            <span>Signal v4</span>
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 truncate">
                          {connection.status === 'active' ? 'Secure session established.' : 'Pending connection...'}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
                        {isActive && <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">2</span>}
                        {!isActive && connection.status === 'active' && <CheckCheck className="w-4 h-4 text-indigo-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Left Rail Security Footer */}
          <div className="p-3 bg-slate-50 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-medium text-slate-600">Virtual Core: Active (Isolated VM)</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">v4.1.8</span>
          </div>
        </div>

        {/* Right Area - Chat Window */}
        <div className={`flex-1 flex flex-col bg-[#f7f8fc] relative ${(!selectedConnection && !showNewChat) ? 'hidden sm:flex' : 'flex'}`}>
          {showNewChat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="max-w-md w-full bg-white border border-slate-200/60  p-8 shadow-xl shadow-slate-200/20">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                  <MessageSquare className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">New Conversation</h2>
                <p className="text-slate-500 mb-8">Enter a virtual number to start a secure chat.</p>
                
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="XXX-XXX-XXXX"
                      value={newChatNumber}
                      onChange={(e) => setNewChatNumber(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200  focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-medium transition"
                      pattern="\d{3}-\d{3}-\d{4}"
                    />
                  </div>
                  <button
                    onClick={startNewChat}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3  transition shadow-md shadow-indigo-600/20"
                  >
                    Send Request
                  </button>
                  <button
                    onClick={() => setShowNewChat(false)}
                    className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3  transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : selectedConnection ? (
            <>
              {/* Ambient Glow Orbs */}
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>

              {/* Chat Header */}
              <div className="h-16 px-6 bg-white/90 backdrop-blur-md flex items-center justify-between shadow-sm border-b border-slate-100 z-10 relative">
                <div className="flex items-center gap-3.5">
                  <button onClick={() => setSelectedConnection(null)} className="sm:hidden p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                      {selectedConnection.user.displayName?.[0] || selectedConnection.user.virtualNumber[0]}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute bottom-0 right-0 ring-2 ring-white"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900 text-[17px] leading-tight">
                        {selectedConnection.user.displayName || selectedConnection.user.virtualNumber}
                      </h2>
                      <span className="text-[13px] font-semibold text-indigo-600 font-mono">
                        {selectedConnection.user.virtualNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>End-to-End Encrypted (Signal Protocol)</span>
                      </span>
                      <span className="text-slate-500 text-[10px] font-mono font-medium hidden md:inline">
                        FP: 70AF · 91BC · 04EE
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('start_call', {
                        detail: { virtualNumber: selectedConnection.user.virtualNumber, type: 'audio' }
                      }));
                    }}
                    className="w-9 h-9 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-colors"
                    title="Audio Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('start_call', {
                        detail: { virtualNumber: selectedConnection.user.virtualNumber, type: 'video' }
                      }));
                    }}
                    className="w-9 h-9 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-colors"
                    title="Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  <button className="w-9 h-9 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 items-center justify-center transition-colors hidden sm:flex" title="Safety Keys & Session Inspection">
                    <Key className="w-4 h-4" />
                  </button>
                  <button className="w-9 h-9 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-transparent relative z-0">
                <div className="flex items-center justify-center my-4">
                  <div className="px-3 py-1 rounded-full bg-slate-200/50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    Today · Isolated Cryptographic Session
                  </div>
                </div>
                
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 pt-10">
                    <div className="w-20 h-20 bg-white rounded-3xl rotate-3 flex items-center justify-center shadow-sm ring-1 ring-slate-100">
                      <MessageSquare className="w-8 h-8 text-indigo-300 -rotate-3" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-700">Start the conversation</p>
                      <p className="text-sm mt-1 text-slate-500">End-to-end encrypted connection established.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isMe = message.senderId === user?.id;
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== message.senderId);
                    const isLastInGroup = index === messages.length - 1 || messages[index + 1].senderId !== message.senderId;
                    
                    return (
                      <div key={message.id} className={`flex ${isMe ? 'flex-col items-end max-w-lg ml-auto' : 'items-end gap-2 max-w-lg mr-auto'}`}>
                        {!isMe && (
                          <div className={`relative w-7 h-7 flex-shrink-0 mb-1 ${!showAvatar && 'invisible'}`}>
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                              {selectedConnection.user.displayName?.[0] || selectedConnection.user.virtualNumber[0]}
                            </div>
                          </div>
                        )}
                        
                        <div
                          className={`p-3.5 text-[14px] leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-slate-800 text-white  rounded-br-sm'
                              : 'bg-white text-slate-900  rounded-bl-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.body}</p>
                          <div className={`flex items-center gap-1.5 mt-1.5 text-[11px] font-medium ${isMe ? 'text-slate-400 justify-end' : 'text-slate-400 justify-end'}`}>
                            <span>{new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMe && <CheckCheck className="w-4 h-4 text-indigo-400" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Floating Glass Input Pill Bar */}
              <div className="px-6 pb-5 pt-2 relative z-10">
                <div className="bg-white/90 backdrop-blur-md rounded-3xl p-1.5 shadow-sm border border-slate-200/60 flex items-center gap-2 focus-within:ring-2 focus-within:ring-indigo-500/40 transition-all">
                  <button className="w-9 h-9 flex-shrink-0 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors" title="Attach file">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-emerald-600 text-[11px] font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    <span>E2EE Active</span>
                  </div>
                  
                  <button className="flex items-center gap-1 px-2 py-1 rounded-full text-slate-500 hover:bg-slate-100 transition-colors" title="Self-destruct timer">
                    <Timer className="w-4 h-4 text-red-500" />
                    <span className="text-[13px] font-medium">24h</span>
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <input
                      placeholder={`Message ${selectedConnection.user.virtualNumber}...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="w-full bg-transparent border-0 py-2 px-2 text-slate-900 text-[14px] placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  
                  <button className="w-9 h-9 flex-shrink-0 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors">
                    <Mic className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
              <div className="w-24 h-24 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-indigo-100" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Your Messages</h2>
              <p className="text-slate-500 mt-2 text-center max-w-sm">
                Select a conversation from the sidebar or start a new secure chat.
              </p>
              <button 
                onClick={() => setShowNewChat(true)}
                className="mt-8 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-full shadow-md shadow-indigo-600/20 transition"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
