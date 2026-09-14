"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import AnimatedContent from "@/components/AnimatedContent";
import {
  Phone,
  MessageSquare,
  Users,
  Shield,
  Video,
  Settings2,
  Copy,
  Check,
  PhoneIncoming,
  ArrowRight,
  ShieldAlert,
  Clock,
  Key,
  Globe,
  Wifi,
  CloudOff,
  Timer,
  Lock,
  Flame,
  ShieldCheck
} from "lucide-react";
import type { Connection, Group, GroupInvite } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const logout = useAuthStore((state) => state.logout);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [connectionsRes, groupsRes, invitesRes] = await Promise.all([
        api.get("/connections"),
        api.get("/groups"),
        api.get("/groups/invites/me"),
      ]);
      setConnections(connectionsRes.data);
      setGroups(groupsRes.data);
      setInvites(invitesRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) return; // Wait for ClerkSync to populate user
    fetchData();
  }, [_hasHydrated, user, fetchData]);

  const copyVirtualNumber = async () => {
    if (!user?.virtualNumber) return;
    await navigator.clipboard.writeText(user.virtualNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteResponse = async (inviteId: string, accept: boolean) => {
    try {
      await api.post(`/groups/invites/${inviteId}/respond`, { accept });
      await fetchData();
    } catch (error) {
      console.error("Failed to respond to invite:", error);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f9fd]">
        <div className="size-9 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  const activeConnections = connections.filter(
    (connection) => connection.status === "active",
  ).length;

  return (
    <main className="flex-1 bg-[#f8f9fd] text-slate-900 font-sans flex flex-col">

      {/* Hero Banner: Edge-to-edge Virtual Handle */}
      <section className="relative w-full bg-slate-900 text-white overflow-hidden py-10 px-6 sm:px-12 shadow-sm border-b border-slate-800">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[50px] right-[10%] w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-[20px] right-[25%] w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-[30px] left-[5%] w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl"></div>
        </div>
        
        <AnimatedContent distance={20} duration={0.6}>
          <div className="relative w-full flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 z-10">
            <div className="flex flex-col gap-3">

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Your Private Handle</h1>
              
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 ">
                  <span className="font-mono text-2xl sm:text-3xl leading-none font-bold tracking-tight text-cyan-400" id="handle-display">
                    {user?.virtualNumber || "Loading..."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-[11px] font-medium backdrop-blur-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    End-to-End Encrypted
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-[11px] font-medium backdrop-blur-sm">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Burnable on Demand
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-2 lg:mt-0">
              <button 
                onClick={copyVirtualNumber}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white text-sm font-medium backdrop-blur-md transition-all border-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy Handle"}</span>
              </button>
            </div>
          </div>
        </AnimatedContent>
      </section>

      {/* Dashboard Workspace Container */}
      <div className="w-full px-5 sm:px-8 lg:px-12 py-8 flex flex-col gap-10">
        
        {/* Section: Quick Actions & Channels */}
        <section className="flex flex-col gap-5">
          <AnimatedContent distance={10} duration={0.5} delay={0.1}>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <div>
                <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">Quick Actions & Channels</h2>
                <p className="text-sm text-slate-500">Zero-knowledge peer routing & sovereign identity nodes</p>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                <span className="text-xs font-mono font-medium">P2P Mesh: Synchronized</span>
              </div>
            </div>
          </AnimatedContent>

          {/* 4-Column Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Connections */}
            <AnimatedContent distance={15} duration={0.5} delay={0.2}>
              <div onClick={() => router.push('/connections')} className="bg-white  p-6 flex flex-col justify-between shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group cursor-pointer h-full">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12  bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Ed25519</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">{activeConnections}</span>
                      <span className="text-sm font-medium text-slate-500">Active</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mt-1">Connections</h3>
                    <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">Verified peer-to-peer contacts linked via ephemeral cryptographic handshake tokens.</p>
                  </div>
                </div>
                <div className="pt-5 mt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 group-hover:gap-2.5 transition-all">
                    <span>Manage Keys</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </AnimatedContent>

            {/* Card 2: Messages */}
            <AnimatedContent distance={15} duration={0.5} delay={0.3}>
              <div onClick={() => router.push('/messages')} className="bg-white  p-6 flex flex-col justify-between shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group cursor-pointer h-full">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12  bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                      5 Unread
                    </span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">5</span>
                      <span className="text-sm font-medium text-slate-500">Threads</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mt-1">Messages</h3>
                    <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">Self-destructing and forward-secret chat threads with ratcheted double-key updates.</p>
                  </div>
                </div>
                <div className="pt-5 mt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 group-hover:gap-2.5 transition-all">
                    <span>Open Inbox</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </AnimatedContent>

            {/* Card 3: Groups */}
            <AnimatedContent distance={15} duration={0.5} delay={0.4}>
              <div onClick={() => router.push('/groups')} className="bg-white  p-6 flex flex-col justify-between shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group cursor-pointer h-full">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12  bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Shield className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">MLS Tree</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">{groups.length}</span>
                      <span className="text-sm font-medium text-slate-500">Enclaves</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mt-1">Groups</h3>
                    <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">Multi-party encrypted broadcast circles configured with fully blinded operational metadata.</p>
                  </div>
                </div>
                <div className="pt-5 mt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 group-hover:gap-2.5 transition-all">
                    <span>View Groups</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </AnimatedContent>

            {/* Card 4: Calls */}
            <AnimatedContent distance={15} duration={0.5} delay={0.5}>
              <div onClick={() => router.push('/calls')} className="bg-white  p-6 flex flex-col justify-between shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group cursor-pointer h-full">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12  bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Phone className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full">0% Loss</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">HD</span>
                      <span className="text-sm font-medium text-slate-500">Audio/Video</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mt-1">Calls</h3>
                    <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">Zero-relay direct peer WebRTC streaming completely isolated from public IP leaks.</p>
                  </div>
                </div>
                <div className="pt-5 mt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 group-hover:gap-2.5 transition-all">
                    <span>Start Call</span>
                    <Phone className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </AnimatedContent>
          </div>
        </section>

      </div>
    </main>
  );
}
