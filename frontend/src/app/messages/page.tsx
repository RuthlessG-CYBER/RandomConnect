'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { MessageSquare, Send, Phone, ArrowLeft, Plus } from 'lucide-react';
import type { Connection, Message } from '@/types';

export default function MessagesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
    if (!user) {
      router.push('/login');
      return;
    }
    fetchConnections();
  }, [user, router]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-200px)]">
            <div className="border-r border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={() => setShowNewChat(true)}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Message</span>
                </button>
              </div>
              {connections.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No connections yet</p>
                  <p className="text-sm mt-2">Share your virtual number to get started</p>
                </div>
              ) : (
                <div className="overflow-y-auto h-full">
                  {connections.map((connection) => (
                    <button
                      key={connection.id}
                      onClick={() => selectConnection(connection)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition border-b border-gray-100 ${
                        selectedConnection?.id === connection.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="font-medium text-gray-600">
                            {connection.user.displayName?.[0] || connection.user.virtualNumber[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {connection.user.displayName || connection.user.virtualNumber}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">{connection.status}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2 flex flex-col">
              {showNewChat ? (
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Start New Conversation</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Virtual Number
                      </label>
                      <input
                        type="text"
                        placeholder="XXX-XXX-XXXX"
                        value={newChatNumber}
                        onChange={(e) => setNewChatNumber(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        pattern="\d{3}-\d{3}-\d{4}"
                      />
                    </div>
                    <button
                      onClick={startNewChat}
                      className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition"
                    >
                      Start Conversation
                    </button>
                    <button
                      onClick={() => setShowNewChat(false)}
                      className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selectedConnection ? (
                <>
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="font-medium text-gray-600">
                          {selectedConnection.user.displayName?.[0] || selectedConnection.user.virtualNumber[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {selectedConnection.user.displayName || selectedConnection.user.virtualNumber}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">{selectedConnection.status}</p>
                      </div>
                    </div>
                    <button className="text-indigo-600 hover:text-indigo-700">
                      <Phone className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No messages yet</p>
                        <p className="text-sm">Send a message to start the conversation</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.senderId === user?.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            <p>{message.body}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {new Date(message.sentAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
