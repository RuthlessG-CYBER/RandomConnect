'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { MessageSquare, Send, Phone, ArrowLeft, Plus, Search, MoreVertical, Info } from 'lucide-react';
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

  const fetchConnections = async () => {
    try {
      const response = await api.get('/connections');
      setConnections(response.data);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (connectionId: string) => {
    try {
      const response = await api.get(`/messages/connection/${connectionId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

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

    let activeWs = connectWebSocket();

    return () => {
      clearTimeout(reconnectTimer);
      activeWs.onclose = null;
      activeWs.close();
    };
  }, [_hasHydrated, user, router]);

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
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden text-slate-900">
      {/* Top Header */}
      <header className="h-16 flex-none bg-white border-b border-slate-200/60 shadow-sm z-10">
        <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Messages</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center bg-slate-100 px-3 py-1.5 rounded-full text-sm font-medium text-slate-600">
               <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
               {user?.virtualNumber}
             </div>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <div className="flex-1 max-w-screen-2xl w-full mx-auto bg-white sm:my-6 sm:rounded-2xl sm:border border-slate-200/60 shadow-sm overflow-hidden flex">
        
        {/* Left Sidebar - Connection List */}
        <div className={`w-full sm:w-[320px] lg:w-[380px] flex flex-col border-r border-slate-200/60 ${selectedConnection && !showNewChat ? 'hidden sm:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search chats..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl text-sm transition outline-none"
              />
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-xl transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-medium text-slate-600">No conversations</p>
                <p className="text-sm">Start a new chat to begin connecting securely.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50/50 p-2">
                {connections.map((connection) => (
                  <button
                    key={connection.id}
                    onClick={() => selectConnection(connection)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition ${
                      selectedConnection?.id === connection.id 
                        ? 'bg-indigo-50/80 ring-1 ring-indigo-100' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-inner text-white font-semibold text-lg">
                        {connection.user.displayName?.[0] || connection.user.virtualNumber[0]}
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className="font-semibold text-slate-900 truncate">
                          {connection.user.displayName || connection.user.virtualNumber}
                        </p>
                        <p className="text-xs text-slate-400 font-medium whitespace-nowrap ml-2">
                          12:34 PM
                        </p>
                      </div>
                      <p className={`text-sm truncate ${selectedConnection?.id === connection.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                        {connection.status === 'active' ? 'Connected securely' : 'Pending request...'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Area - Chat Window */}
        <div className={`flex-1 flex flex-col bg-[#fdfdfd] relative ${(!selectedConnection && !showNewChat) ? 'hidden sm:flex' : 'flex'}`}>
          {showNewChat ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="max-w-md w-full bg-white border border-slate-200/60 rounded-2xl p-8 shadow-xl shadow-slate-200/20">
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-medium transition"
                      pattern="\d{3}-\d{3}-\d{4}"
                    />
                  </div>
                  <button
                    onClick={startNewChat}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition shadow-md shadow-indigo-600/20"
                  >
                    Send Request
                  </button>
                  <button
                    onClick={() => setShowNewChat(false)}
                    className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3 rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : selectedConnection ? (
            <>
              {/* Chat Header */}
              <div className="h-18 px-6 border-b border-slate-100 bg-white/80 backdrop-blur flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedConnection(null)} className="sm:hidden p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                    {selectedConnection.user.displayName?.[0] || selectedConnection.user.virtualNumber[0]}
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg leading-tight">
                      {selectedConnection.user.displayName || selectedConnection.user.virtualNumber}
                    </h2>
                    <p className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      Online
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('start_audio_call', {
                        detail: { virtualNumber: selectedConnection.user.virtualNumber }
                      }));
                    }}
                    className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full transition shadow-sm"
                    title="Audio Call"
                  >
                    <Phone className="w-5 h-5 fill-current opacity-20" />
                  </button>
                  <button className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition hidden sm:flex">
                    <Info className="w-5 h-5" />
                  </button>
                  <button className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                      <MessageSquare className="w-8 h-8 text-indigo-200" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-slate-900">Start the conversation</p>
                      <p className="text-sm mt-1">End-to-end encrypted connection established.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isMe = message.senderId === user?.id;
                    const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== message.senderId);
                    
                    return (
                      <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                        <div className="flex max-w-[85%] sm:max-w-[70%] items-end gap-2">
                          {!isMe && (
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm ${!showAvatar && 'invisible'}`}>
                              {selectedConnection.user.displayName?.[0] || selectedConnection.user.virtualNumber[0]}
                            </div>
                          )}
                          
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`px-5 py-3 rounded-2xl shadow-sm ${
                                isMe
                                  ? 'bg-indigo-600 text-white rounded-br-sm'
                                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
                              }`}
                            >
                              <p className="leading-relaxed whitespace-pre-wrap">{message.body}</p>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-slate-100">
                <div className="max-w-4xl mx-auto flex items-end gap-3 bg-slate-50 border border-slate-200/60 rounded-3xl p-1.5 shadow-inner">
                  <div className="flex-1">
                    <textarea
                      placeholder="Message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="w-full max-h-32 min-h-[44px] bg-transparent resize-none py-3 px-4 outline-none text-slate-900 placeholder:text-slate-400"
                      rows={1}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="mb-1 mr-1 p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:scale-95 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="w-5 h-5 pl-0.5" />
                  </button>
                </div>
                <div className="text-center mt-2">
                  <span className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                    Press Enter to send <ArrowLeft className="w-2 h-2 rotate-90" />
                  </span>
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
