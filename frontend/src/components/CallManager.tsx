'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import api from '@/lib/api';

interface CallState {
  id: string;
  callerVirtualNumber: string;
  calleeVirtualNumber?: string;
  status: 'incoming' | 'ringing' | 'active';
  isCaller: boolean;
}

export default function CallManager() {
  const user = useAuthStore((state) => state.user);
  const [callState, setCallState] = useState<CallState | null>(null);
  const [muted, setMuted] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Global event listener to trigger outbound calls
  useEffect(() => {
    const handleStartCall = async (e: CustomEvent) => {
      const calleeNumber = e.detail.virtualNumber;
      if (!calleeNumber || !user || !ws.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStream.current = stream;

        // Create call in DB
        const res = await api.post('/calls', {
          calleeVirtualNumber: calleeNumber,
          callType: 'audio'
        });
        const callId = res.data.id;

        setCallState({
          id: callId,
          callerVirtualNumber: user.virtualNumber,
          calleeVirtualNumber: calleeNumber,
          status: 'ringing',
          isCaller: true
        });

        ws.current.send(JSON.stringify({
          type: 'call_invite',
          calleeVirtualNumber: calleeNumber,
          callId,
          callType: 'audio'
        }));

      } catch (err) {
        console.error('Microphone access denied or error:', err);
        alert('Could not access microphone for the call.');
      }
    };

    window.addEventListener('start_audio_call' as any, handleStartCall);
    return () => window.removeEventListener('start_audio_call' as any, handleStartCall);
  }, [user]);

  // WebSocket Setup
  useEffect(() => {
    if (!user) return;

    let reconnectTimer: NodeJS.Timeout;

    const connectWebSocket = () => {
      const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api')
        .replace('http', 'ws')
        .replace('/api', '');
        
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          try {
            const token = JSON.parse(authStorage).state?.accessToken;
            if (token) ws.current?.send(JSON.stringify({ type: 'auth', token }));
          } catch (e) {}
        }
      };

      ws.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'call_incoming':
              setCallState({
                id: data.callId,
                callerVirtualNumber: data.callerVirtualNumber,
                status: 'incoming',
                isCaller: false
              });
              break;
              
            case 'call_accepted':
              if (callState?.isCaller) {
                setCallState(prev => prev ? { ...prev, status: 'active' } : null);
                setupWebRTC(data.callId, true);
              }
              break;
              
            case 'call_rejected':
            case 'call_ended':
              cleanupCall();
              break;
              
            case 'webrtc_offer':
              if (!peerConnection.current) await setupWebRTC(callState!.id, false);
              await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.signal));
              const answer = await peerConnection.current?.createAnswer();
              await peerConnection.current?.setLocalDescription(answer);
              ws.current?.send(JSON.stringify({
                type: 'webrtc_answer',
                callId: callState!.id,
                signal: answer
              }));
              break;
              
            case 'webrtc_answer':
              await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.signal));
              break;
              
            case 'webrtc_ice':
              await peerConnection.current?.addIceCandidate(new RTCIceCandidate(data.signal));
              break;
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected, reconnecting in 3s...');
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimer);
      ws.current?.onclose && (ws.current.onclose = null);
      ws.current?.close();
    };
  }, [user, callState]);

  const setupWebRTC = async (callId: string, isInitiator: boolean) => {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localStream.current!);
      });
    }

    peerConnection.current.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && ws.current) {
        ws.current.send(JSON.stringify({
          type: 'webrtc_ice',
          callId,
          signal: event.candidate
        }));
      }
    };

    if (isInitiator) {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      ws.current?.send(JSON.stringify({
        type: 'webrtc_offer',
        callId,
        signal: offer
      }));
    }
  };

  const acceptCall = async () => {
    if (!callState || !ws.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
      setCallState(prev => prev ? { ...prev, status: 'active' } : null);
      
      ws.current.send(JSON.stringify({
        type: 'call_accept',
        callId: callState.id
      }));
    } catch (err) {
      alert('Microphone access denied');
      rejectCall();
    }
  };

  const rejectCall = () => {
    if (callState && ws.current) {
      ws.current.send(JSON.stringify({ type: 'call_reject', callId: callState.id }));
    }
    cleanupCall();
  };

  const endCall = () => {
    if (callState && ws.current) {
      ws.current.send(JSON.stringify({ type: 'call_end', callId: callState.id }));
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    setCallState(null);
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setMuted(!localStream.current.getAudioTracks()[0].enabled);
    }
  };

  if (!callState) {
    return <audio ref={remoteAudioRef} autoPlay className="hidden" />;
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      
      <div className="bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-800">
        <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-3xl font-bold text-white">
            {callState.isCaller ? callState.calleeVirtualNumber?.[0] : callState.callerVirtualNumber[0]}
          </span>
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-2">
          {callState.isCaller ? callState.calleeVirtualNumber : callState.callerVirtualNumber}
        </h2>
        
        <p className="text-slate-400 mb-8 capitalize">
          {callState.status === 'incoming' ? 'Incoming Call...' : callState.status === 'ringing' ? 'Ringing...' : '00:00'}
        </p>

        <div className="flex items-center justify-center gap-6">
          {callState.status === 'incoming' ? (
            <>
              <button onClick={rejectCall} className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition shadow-lg shadow-red-500/20">
                <PhoneOff className="text-white w-6 h-6" />
              </button>
              <button onClick={acceptCall} className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center transition shadow-lg shadow-emerald-500/20 animate-pulse">
                <Phone className="text-white w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition ${muted ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button onClick={endCall} className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition shadow-lg shadow-red-500/20">
                <PhoneOff className="text-white w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
