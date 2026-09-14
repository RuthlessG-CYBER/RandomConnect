"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Settings,
  Bell,
  Shield,
  Key,
  Smartphone,
  Lock,
  EyeOff,
  User,
  Fingerprint,
  HardDrive,
  LogOut,
  ChevronRight,
  Wifi,
  CloudOff
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const { user: clerkUser } = useUser();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'network' | 'storage'>('profile');

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.push('/login');
    }
  }, [_hasHydrated, user, router]);

  if (!_hasHydrated || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f9fd]">
        <div className="size-9 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <main className="flex-1 bg-[#f8f9fd] text-slate-900 font-sans flex flex-col relative overflow-x-hidden">

      {/* Subtle Ambient Glow Orbs */}
      <div className="absolute -top-24 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="absolute top-72 -left-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none z-0"></div>

      <div className="relative w-full px-5 sm:px-8 lg:px-12 py-8 flex flex-col gap-8 z-10 flex-1">
        
        {/* SECTION: Header */}
        <div className="flex flex-col gap-2">

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings & Preferences</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center justify-between px-4 py-3  font-semibold text-sm transition ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100'}`}
            >
              <div className="flex items-center gap-3">
                <User className="w-4 h-4" />
                Identity Profile
              </div>
              {activeTab === 'profile' && <ChevronRight className="w-4 h-4 opacity-70" />}
            </button>

            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center justify-between px-4 py-3  font-semibold text-sm transition ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100'}`}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4" />
                Security & Keys
              </div>
              {activeTab === 'security' && <ChevronRight className="w-4 h-4 opacity-70" />}
            </button>

            <button 
              onClick={() => setActiveTab('network')}
              className={`w-full flex items-center justify-between px-4 py-3  font-semibold text-sm transition ${activeTab === 'network' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100'}`}
            >
              <div className="flex items-center gap-3">
                <Wifi className="w-4 h-4" />
                Network Routing
              </div>
              {activeTab === 'network' && <ChevronRight className="w-4 h-4 opacity-70" />}
            </button>

            <button 
              onClick={() => setActiveTab('storage')}
              className={`w-full flex items-center justify-between px-4 py-3  font-semibold text-sm transition ${activeTab === 'storage' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-100'}`}
            >
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4" />
                Local Storage
              </div>
              {activeTab === 'storage' && <ChevronRight className="w-4 h-4 opacity-70" />}
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 w-full min-h-[500px]">
            
            {activeTab === 'profile' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Virtual Identity</h2>
                  <p className="text-[13px] text-slate-500 mt-1">Manage your public-facing alias and virtual routing number.</p>
                </div>
                
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-3xl shadow-inner border border-indigo-200">
                    {user.displayName?.[0] || user.virtualNumber[0]}
                  </div>
                  <div className="flex flex-col gap-4 flex-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Display Alias</label>
                      <input 
                        type="text" 
                        defaultValue={user.displayName || ""} 
                        className="w-full max-w-md px-4 py-2.5 bg-slate-50 border border-slate-200  text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Virtual Number</label>
                      <input 
                        type="text" 
                        value={user.virtualNumber} 
                        readOnly
                        className="w-full max-w-md px-4 py-2.5 bg-slate-100 border border-slate-200  text-slate-600 font-mono focus:outline-none cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-400 mt-2">This number is permanently bound to your device enclave.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button className="px-6 py-2.5  bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700 transition">
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Security & Keys</h2>
                  <p className="text-[13px] text-slate-500 mt-1">Manage cryptographic primitives and session lifecycles.</p>
                </div>

                <div className="grid gap-4">
                  <div className="py-4 border-b border-slate-200  flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Identity Key Pair</p>
                        <p className="text-[12px] text-slate-500">Curve25519 EDDSA. Generated locally.</p>
                      </div>
                    </div>
                    <button className="px-4 py-2  bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition">
                      View Fingerprint
                    </button>
                  </div>

                  <div className="py-4 border-b border-slate-200  flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Forward Secrecy Sessions</p>
                        <p className="text-[12px] text-slate-500">Double Ratchet active across all chats.</p>
                      </div>
                    </div>
                    <button className="px-4 py-2  bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition">
                      Reset Ratchets
                    </button>
                  </div>
                </div>

                <div className="py-5 border-b border-red-200 ">
                  <h3 className="font-bold text-red-700">Burn Identity</h3>
                  <p className="text-[13px] text-red-600 mt-1 mb-4">Permanently destroy your virtual number, purge all keys, and sever all active peer connections. This cannot be undone.</p>
                  <button className="px-5 py-2  bg-red-600 text-white text-sm font-bold shadow-sm hover:bg-red-700 transition">
                    Self-Destruct
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'network' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Network Routing</h2>
                  <p className="text-[13px] text-slate-500 mt-1">Configure STUN/TURN relays and peer discovery mechanisms.</p>
                </div>
                
                <div className="py-6 border-b border-slate-200  flex flex-col items-center justify-center text-center gap-3">
                  <Wifi className="w-8 h-8 text-indigo-400" />
                  <p className="text-slate-600 font-medium text-sm">Using Default Relay Nodes</p>
                  <p className="text-xs text-slate-400 max-w-sm">TikiTaka operates purely peer-to-peer over WebRTC. You are currently connected to the primary signaling server.</p>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-slate-200 ">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Obfuscate Traffic</p>
                    <p className="text-[12px] text-slate-500">Pad metadata to prevent ISP deep packet inspection.</p>
                  </div>
                  <div className="w-11 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Local Storage</h2>
                  <p className="text-[13px] text-slate-500 mt-1">All messages and call logs are stored exclusively on your device.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="py-5 border-b border-slate-200 ">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Message Database</p>
                    <p className="text-2xl font-bold text-slate-900">1.2 MB</p>
                    <p className="text-[12px] text-slate-400 mt-1">IndexedDB Secure Store</p>
                  </div>
                  <div className="py-5 border-b border-slate-200 ">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Media Cache</p>
                    <p className="text-2xl font-bold text-slate-900">0 KB</p>
                    <p className="text-[12px] text-slate-400 mt-1">Volatile Memory Only</p>
                  </div>
                </div>

                <button className="px-5 py-2.5  bg-slate-100 text-slate-900 font-semibold hover:bg-slate-200 transition text-sm flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Clear All Local Data
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
