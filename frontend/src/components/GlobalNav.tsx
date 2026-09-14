"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const navItems = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Messages", path: "/messages" },
  { name: "Connections", path: "/connections" },
  { name: "Calls", path: "/calls" },
  { name: "Groups", path: "/groups" },
];

export default function GlobalNav() {
  const pathname = usePathname();

  const [ping, setPing] = useState<number>(0);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const measurePing = async () => {
      try {
        const start = performance.now();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4040/api';
        const healthUrl = apiUrl.replace(/\/api\/?$/, '') + '/health';
        await fetch(healthUrl, { method: 'HEAD', cache: 'no-store' });
        const end = performance.now();
        setPing(Math.round(end - start));
        setIsOffline(false);
      } catch (e) {
        setIsOffline(true);
      }
    };
    
    measurePing();
    const interval = setInterval(measurePing, 5000);
    return () => clearInterval(interval);
  }, []);

  // Hide on auth pages or root
  if (pathname === "/login" || pathname === "/signup" || pathname === "/") {
    return null;
  }

  return (
    <header className="h-14 flex-none w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-30 flex items-center justify-between px-4 sm:px-6 sticky top-0">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.jpg" alt="TikiTaka Logo" className="w-7 h-7 shadow-sm object-cover" />
          <span className="text-lg font-bold tracking-tight text-slate-900">TikiTaka</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-500 ml-4 relative">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`relative px-3 py-1.5  transition-colors z-10 ${
                  isActive ? "text-slate-900" : "hover:text-slate-900"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute inset-0 bg-slate-100  -z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 shadow-sm" title={isOffline ? "Disconnected" : "Connected"}>
          <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
          <span className={`text-xs font-mono font-medium ${isOffline ? 'text-red-600' : ping < 50 ? 'text-emerald-600' : ping < 150 ? 'text-amber-600' : 'text-red-600'}`}>
            {isOffline ? 'ERR' : ping > 0 ? `${ping}ms` : '--ms'}
          </span>
        </div>
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <UserButton />
      </div>
    </header>
  );
}
