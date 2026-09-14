"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { Shield, Ban, MessageSquare, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";
import type { Connection } from "@/types";

export default function ConnectionsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    try {
      const response = await api.get("/connections");
      setConnections(response.data);
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConnectionStatus = async (connectionId: string, status: "blocked" | "removed") => {
    try {
      await api.patch(`/connections/${connectionId}`, { status });
      await fetchConnections();
    } catch (error) {
      console.error("Failed to update connection:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchConnections();
  }, [_hasHydrated, user, router]);

  if (loading) {
    return (
      <div className="flex-1 bg-[#f8f9fd] flex items-center justify-center">
        <div className="size-9 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  const activeConnections = connections.filter(c => c.status === "active");
  const blockedConnections = connections.filter(c => c.status === "blocked");

  return (
    <main className="flex-1 bg-[#f8f9fd] text-slate-900 font-sans flex flex-col relative overflow-x-hidden">
      
      {/* Subtle Ambient Glow Orbs */}
      <div className="absolute -top-24 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="absolute top-72 -left-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none z-0"></div>

      <div className="relative w-full px-5 sm:px-8 lg:px-12 py-8 flex flex-col gap-8 z-10 flex-1">
        
        {/* SECTION 1: Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Private Connections</h1>
            <p className="text-[15px] text-slate-500 max-w-2xl mt-1 leading-relaxed">
              Manage your peer-to-peer verified contacts. Connections are established automatically when participating in secure channels.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-bold text-slate-900">{activeConnections.length} Active</span>
            </div>
            <div className="w-px h-6 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span className="text-sm font-bold text-slate-900">{blockedConnections.length} Blocked</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Connection Grid */}
        {connections.length === 0 ? (
          <div className="w-full bg-white p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-4 text-center">
            <Shield className="w-12 h-12 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-900">No connections yet</h3>
            <p className="text-slate-500 max-w-md">Your peer registry is empty. Connections will appear here once you interact with other nodes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {connections.map((connection) => {
              const isBlocked = connection.status === "blocked";
              return (
                <div key={connection.id} className={`bg-white p-5 shadow-sm border border-slate-200 flex flex-col gap-4 ${isBlocked ? 'opacity-60 grayscale' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
                        {connection.user.displayName?.[0] || connection.user.virtualNumber[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 leading-tight">
                          {connection.user.displayName || "Unknown Identity"}
                        </span>
                        <span className="text-xs font-mono text-slate-500 mt-0.5">
                          {connection.user.virtualNumber}
                        </span>
                      </div>
                    </div>
                    {isBlocked ? (
                      <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest border border-red-200">Blocked</span>
                    ) : connection.status === "active" ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest border border-emerald-200">Verified</span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest border border-slate-200">Pending</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => router.push('/messages')}
                      disabled={isBlocked}
                      className="flex-1 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </button>
                    {isBlocked ? (
                      <button 
                        onClick={() => updateConnectionStatus(connection.id, "removed")}
                        className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition border border-red-100 flex items-center justify-center"
                        title="Remove entirely"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => updateConnectionStatus(connection.id, "blocked")}
                        className="px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition border border-slate-200 flex items-center justify-center"
                        title="Block peer"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
