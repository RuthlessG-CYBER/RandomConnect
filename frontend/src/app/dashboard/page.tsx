'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import AnimatedContent from '@/components/AnimatedContent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, MessageSquare, Users, PhoneCall, LogOut, Copy, Check, ArrowUpRight, Sparkles } from 'lucide-react';
import type { Connection, Group, GroupInvite } from '@/types';

const actions = [
  { href: '/connections', icon: Users, label: 'Connections', description: 'Keep your circle close', tone: 'bg-violet-100 text-violet-700' },
  { href: '/messages', icon: MessageSquare, label: 'Messages', description: 'Start a private conversation', tone: 'bg-sky-100 text-sky-700' },
  { href: '/groups', icon: Sparkles, label: 'Groups', description: 'Invite-only spaces', tone: 'bg-amber-100 text-amber-700' },
  { href: '/calls', icon: PhoneCall, label: 'Calls', description: 'Voice and video, online', tone: 'bg-emerald-100 text-emerald-700' },
];

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [connectionsRes, groupsRes, invitesRes] = await Promise.all([api.get('/connections'), api.get('/groups'), api.get('/groups/invites/me')]);
      setConnections(connectionsRes.data); setGroups(groupsRes.data); setInvites(invitesRes.data);
    } catch (error) { console.error('Failed to fetch dashboard data:', error); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    void fetchData();
  }, [user, router]);

  const handleLogout = async () => { try { await api.post('/auth/logout'); } catch (error) { console.error('Logout error:', error); } logout(); router.push('/login'); };
  const copyVirtualNumber = async () => { if (!user?.virtualNumber) return; await navigator.clipboard.writeText(user.virtualNumber); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleInviteResponse = async (inviteId: string, accept: boolean) => { try { await api.post(`/groups/invites/${inviteId}/respond`, { accept }); await fetchData(); } catch (error) { console.error('Failed to respond to invite:', error); } };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f7f8fc]"><div className="size-9 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /></div>;
  const activeConnections = connections.filter((connection) => connection.status === 'active').length;

  return <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#f7f8fc]/80 backdrop-blur-xl"><div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8"><button onClick={() => router.push('/dashboard')} className="flex items-center gap-3 text-left"><span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white shadow-lg shadow-slate-900/15">R</span><span><span className="block text-sm font-semibold tracking-tight">RandomConnect</span><span className="block text-xs text-slate-500">Private by design</span></span></button><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:block">Hi, {user?.displayName || 'there'}</span><Button variant="ghost" size="sm" onClick={handleLogout}><LogOut /><span className="hidden sm:inline">Log out</span></Button></div></div></header>
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <AnimatedContent distance={28} duration={0.6}><section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-2xl shadow-slate-900/15 sm:px-9 sm:py-9"><div className="absolute -right-16 -top-20 size-72 rounded-full bg-violet-500/50 blur-3xl" /><div className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-cyan-400/25 blur-3xl" /><div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end"><div><Badge className="mb-4 border-white/15 bg-white/10 text-white hover:bg-white/10">Your private handle</Badge><p className="text-sm text-slate-300">Share this only with people you want to reach you.</p><div className="mt-2 flex items-center gap-3"><Phone className="size-5 text-cyan-300" /><span className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">{user?.virtualNumber}</span></div></div><Button variant="secondary" size="lg" onClick={copyVirtualNumber} className="w-full bg-white text-slate-950 hover:bg-slate-100 sm:w-auto">{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy number'}</Button></div></section></AnimatedContent>
      {invites.length > 0 && <AnimatedContent distance={22} duration={0.55} delay={0.1}><Card className="mt-6 border-amber-200 bg-amber-50/70 shadow-none"><CardHeader><CardTitle className="text-amber-950">Group invitations</CardTitle><CardDescription className="text-amber-800">You choose who gets access to your spaces.</CardDescription></CardHeader><CardContent className="space-y-3">{invites.map((invite) => <div key={invite.id} className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{invite.group.name}</p><p className="text-sm text-slate-600">Invited by {invite.invitedByUser.displayName || invite.invitedByUser.virtualNumber}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => handleInviteResponse(invite.id, true)}>Accept</Button><Button size="sm" variant="outline" onClick={() => handleInviteResponse(invite.id, false)}>Decline</Button></div></div>)}</CardContent></Card></AnimatedContent>}
      <section className="mt-8"><div className="mb-4 flex items-end justify-between"><div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your space</h1><p className="mt-1 text-sm text-slate-500">Choose how you want to connect today.</p></div><Badge variant="outline" className="hidden sm:inline-flex">{activeConnections} active</Badge></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{actions.map(({ href, icon: Icon, label, description, tone }, index) => <AnimatedContent key={href} distance={18} duration={0.45} delay={index * 0.07}><button onClick={() => router.push(href)} className="group h-full w-full rounded-2xl text-left"><Card className="h-full border-0 bg-white shadow-sm ring-1 ring-slate-200/80 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-slate-200/70"><CardContent className="pt-4"><div className={`mb-7 grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></div><div className="flex items-center justify-between"><p className="font-semibold">{label}</p><ArrowUpRight className="size-4 text-slate-400 transition group-hover:text-slate-950" /></div><p className="mt-1 text-sm text-slate-500">{description}</p>{label === 'Connections' && <p className="mt-4 text-xs font-medium text-slate-500">{activeConnections} active</p>}{label === 'Groups' && <p className="mt-4 text-xs font-medium text-slate-500">{groups.length} groups</p>}</CardContent></Card></button></AnimatedContent>)}</div></section>
      <AnimatedContent distance={22} duration={0.55} delay={0.25}><Card className="mt-8 border-0 shadow-sm ring-1 ring-slate-200/80"><CardHeader className="border-b border-slate-100"><CardTitle>Recent connections</CardTitle><CardDescription>People you have interacted with recently.</CardDescription></CardHeader><CardContent className="pt-2">{connections.length === 0 ? <div className="py-12 text-center"><Users className="mx-auto size-9 text-slate-300" /><p className="mt-3 font-medium">Your circle starts here</p><p className="mt-1 text-sm text-slate-500">Share your private number to begin a conversation.</p><Button className="mt-5" onClick={() => router.push('/messages')}>Start a conversation</Button></div> : <div className="divide-y divide-slate-100">{connections.slice(0, 5).map((connection) => <div key={connection.id} className="flex items-center justify-between gap-4 py-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">{connection.user.displayName?.[0] || connection.user.virtualNumber[0]}</span><div><p className="font-medium">{connection.user.displayName || connection.user.virtualNumber}</p><p className="text-sm text-slate-500">Updated {new Date(connection.updatedAt).toLocaleDateString()}</p></div></div><Badge variant={connection.status === 'active' ? 'default' : 'secondary'} className={connection.status === 'active' ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>{connection.status}</Badge></div>)}</div>}</CardContent></Card></AnimatedContent>
    </div>
  </main>;
}
