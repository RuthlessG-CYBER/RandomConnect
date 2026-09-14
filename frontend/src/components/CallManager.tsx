'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import api from '@/lib/api';

interface CallState {
  id: string;
  callerVirtualNumber: string;
  calleeVirtualNumber?: string;
  status: 'incoming' | 'ringing' | 'active';
  isCaller: boolean;
  type: 'audio' | 'video';
}

export default function CallManager() {
  const user = useAuthStore((state) => state.user);
  const [callState, setCallState] = useState<CallState | null>(null);
  const callStateRef = useRef<CallState | null>(null);
  
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [duration, setDuration] = useState(0);
  
  const ws = useRef<WebSocket | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer logic
  useEffect(() => {
    if (callState?.status === 'active') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (!callState) setDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState?.status]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Global event listener to trigger outbound calls
  useEffect(() => {
    const handleStartCall = async (e: CustomEvent) => {
      const calleeNumber = e.detail.virtualNumber;
      const callType = e.detail.type || 'audio';
      
      if (!calleeNumber || !user || !ws.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: callType === 'video'
        });
        localStream.current = stream;

        const res = await api.post('/calls', {
          calleeVirtualNumber: calleeNumber,
          callType
        });
        const callId = res.data.id;

        setCallState({
          id: callId,
          callerVirtualNumber: user.virtualNumber,
          calleeVirtualNumber: calleeNumber,
          status: 'ringing',
          isCaller: true,
          type: callType
        });

        ws.current.send(JSON.stringify({
          type: 'call_invite',
          calleeVirtualNumber: calleeNumber,
          callId,
          callType
        }));

      } catch (err) {
        console.error('Media access denied or error:', err);
        alert('Could not access microphone/camera for the call.');
      }
    };

    window.addEventListener('start_call' as any, handleStartCall);
    // Legacy support for older events
    window.addEventListener('start_audio_call' as any, (e: any) => handleStartCall(new CustomEvent('start_call', { detail: { ...e.detail, type: 'audio' }})));
    
    return () => {
      window.removeEventListener('start_call' as any, handleStartCall);
      window.removeEventListener('start_audio_call' as any, handleStartCall);
    };
  }, [user]);

  // WebSocket Setup
  useEffect(() => {
    if (!user) return;
    let reconnectTimer: NodeJS.Timeout;

    const connectWebSocket = () => {
      const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('http', 'ws').replace('/api', '');
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
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
          const currentCall = callStateRef.current;
          
          switch (data.type) {
            case 'call_incoming':
              setCallState({
                id: data.callId,
                callerVirtualNumber: data.callerVirtualNumber,
                status: 'incoming',
                isCaller: false,
                type: data.callType || 'audio'
              });
              break;
              
            case 'call_accepted':
              if (currentCall?.isCaller) {
                setCallState(prev => prev ? { ...prev, status: 'active' } : null);
                setupWebRTC(data.callId, true);
              }
              break;
              
            case 'call_rejected':
            case 'call_ended':
              cleanupCall();
              break;
              
            case 'webrtc_offer':
              if (!peerConnection.current) await setupWebRTC(currentCall!.id, false);
              await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.signal));
              const answer = await peerConnection.current?.createAnswer();
              await peerConnection.current?.setLocalDescription(answer);
              ws.current?.send(JSON.stringify({
                type: 'webrtc_answer',
                callId: currentCall!.id,
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
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimer);
      ws.current?.onclose && (ws.current.onclose = null);
      ws.current?.close();
    };
  }, [user]);

  async function setupWebRTC(callId: string, isInitiator: boolean) {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localStream.current!);
      });
    }

    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current && callStateRef.current?.type === 'video') {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: callState.type === 'video' 
      });
      localStream.current = stream;
      setCallState(prev => prev ? { ...prev, status: 'active' } : null);
      
      ws.current.send(JSON.stringify({
        type: 'call_accept',
        callId: callState.id
      }));
    } catch (err) {
      alert('Microphone/Camera access denied');
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

  function cleanupCall() {
    setCallState(null);
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setMuted(false);
    setVideoEnabled(true);
    setDuration(0);
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTracks = localStream.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setMuted(!audioTracks[0].enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTracks = localStream.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoTracks[0].enabled;
        setVideoEnabled(videoTracks[0].enabled);
      }
    }
  };

  // Keep local video updated
  useEffect(() => {
    if (localVideoRef.current && localStream.current && callState?.type === 'video') {
      localVideoRef.current.srcObject = localStream.current;
    }
  }, [callState?.status, callState?.type]);

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      
      {callState && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-0 sm:p-4 backdrop-blur-xl">
          
          {callState.type === 'video' && callState.status === 'active' ? (
            <div className="w-full h-full sm:rounded-3xl overflow-hidden relative flex bg-slate-900 shadow-2xl">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 right-6 w-32 sm:w-48 aspect-[3/4] bg-black  overflow-hidden shadow-2xl border-2 border-slate-800">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className={`w-full h-full object-cover ${!videoEnabled && 'hidden'}`}
                />
                {!videoEnabled && (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <VideoOff className="w-8 h-8 text-slate-500" />
                  </div>
                )}
              </div>
              
              <div className="absolute top-6 left-6 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full">
                <p className="text-white font-mono font-medium">{formatDuration(duration)}</p>
              </div>
              
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-md p-4 rounded-full shadow-2xl">
                <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition ${muted ? 'bg-red-500 text-white' : 'bg-slate-700/80 text-white hover:bg-slate-600'}`}>
                  {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition ${!videoEnabled ? 'bg-red-500 text-white' : 'bg-slate-700/80 text-white hover:bg-slate-600'}`}>
                  {!videoEnabled ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
                <button onClick={endCall} className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition shadow-lg">
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 sm:rounded-3xl p-8 w-full h-full sm:h-auto sm:max-w-sm flex flex-col items-center justify-center text-center shadow-2xl border border-slate-800">
              <div className="w-32 h-32 bg-indigo-600 rounded-full mx-auto mb-8 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                <span className="text-5xl font-bold text-white">
                  {callState.isCaller ? callState.calleeVirtualNumber?.[0] : callState.callerVirtualNumber[0]}
                </span>
              </div>
              
              <h2 className="text-3xl font-semibold text-white mb-2">
                {callState.isCaller ? callState.calleeVirtualNumber : callState.callerVirtualNumber}
              </h2>
              
              <p className="text-slate-400 mb-12 capitalize text-lg tracking-wide font-medium flex items-center justify-center gap-2">
                {callState.type === 'video' && <Video className="w-4 h-4" />}
                {callState.status === 'incoming' 
                  ? `Incoming ${callState.type} Call...` 
                  : callState.status === 'ringing' 
                  ? 'Ringing...' 
                  : formatDuration(duration)
                }
              </p>

              <div className="flex items-center justify-center gap-6 mt-auto sm:mt-0 pb-8 sm:pb-0">
                {callState.status === 'incoming' ? (
                  <>
                    <button onClick={rejectCall} className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition shadow-xl shadow-red-500/20">
                      <PhoneOff className="text-white w-7 h-7" />
                    </button>
                    <button onClick={acceptCall} className="w-16 h-16 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center transition shadow-xl shadow-emerald-500/20 animate-pulse">
                      {callState.type === 'video' ? <Video className="text-white w-7 h-7" /> : <Phone className="text-white w-7 h-7" />}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={toggleMute} className={`w-16 h-16 rounded-full flex items-center justify-center transition shadow-lg ${muted ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                      {muted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                    </button>
                    <button onClick={endCall} className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition shadow-xl shadow-red-500/20">
                      <PhoneOff className="text-white w-7 h-7" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
