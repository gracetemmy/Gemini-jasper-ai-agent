import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { AudioProcessor } from '../services/audioService';
import { Mic, MicOff, Volume2, VolumeX, Loader2, MessageSquare, Sparkles, Camera, CameraOff, X, ArrowRight, History, Settings, User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const VOICE_OPTIONS = [
  { id: 'en-US-Journey-F', label: 'Journey Female', geminiVoice: 'Kore' },
  { id: 'en-US-Studio-O', label: 'Studio Male', geminiVoice: 'Puck' },
  { id: 'en-US-Neural2-F', label: 'Neural Female', geminiVoice: 'Zephyr' },
];

export const JasperAgent: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [aiTranscript, setAiTranscript] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0));
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'jasper', text: string, id: string, isPartial?: boolean }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[1]); // Default to Studio Male
  const [showHistory, setShowHistory] = useState(false);
  const [savedSessions, setSavedSessions] = useState<{ id: string, date: string, history: any[] }[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState(Math.random().toString(36).substr(2, 9));
  
  const audioProcessor = useRef(new AudioProcessor());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const transcriptTimeout = useRef<NodeJS.Timeout | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const visualizerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startVisualizer = () => {
    if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
    visualizerIntervalRef.current = setInterval(() => {
      const data = audioProcessor.current.getByteFrequencyData();
      if (data) {
        // Sample 20 points from the frequency data for the matrix
        const levels = [];
        const step = Math.floor(data.length / 20);
        for (let i = 0; i < 20; i++) {
          levels.push(data[i * step] / 255);
        }
        setAudioLevels(levels);
      }
    }, 50);
  };

  const stopVisualizer = () => {
    if (visualizerIntervalRef.current) {
      clearInterval(visualizerIntervalRef.current);
      visualizerIntervalRef.current = null;
    }
    setAudioLevels(new Array(20).fill(0));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      videoStreamRef.current = stream;
      setIsVideoEnabled(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoEnabled(false);
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }
  };

  const [isSendingFrame, setIsSendingFrame] = useState(false);

  const sendVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || !sessionRef.current || !isConnected) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      setIsSendingFrame(true);
      setTimeout(() => setIsSendingFrame(false), 200);
      
      // Use 640x480 for better vision clarity
      canvas.width = 640; 
      canvas.height = 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      try {
        sessionRef.current.sendRealtimeInput({
          media: { data: base64Data, mimeType: 'image/jpeg' }
        });
      } catch (err) {
        console.error("Error sending video frame:", err);
      }
    }
  };

  const connectToJasper = async () => {
    if (isConnecting || isConnected) return;
    
    setError(null);
    setIsConnecting(true);
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("API Key not found. Please ensure GEMINI_API_KEY is set.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice.geminiVoice as any } },
          },
          systemInstruction: `You are Jasper, a highly advanced, empathetic, and witty AI companion. 
          You are currently in a real-time, multimodal LIVE session. 
          
          CORE CAPABILITIES:
          1. VISION: You can see through the user's camera.
          2. AUDIO: You can hear the user.
          3. TEXT: You can read messages typed by the user. 
          
          RESPONSE GUIDELINES:
          - TEXT INPUTS: When the user types a message, you MUST respond immediately with your voice (audio) and provide a text transcript. Treat text messages with the same priority as spoken words.
          - ACCURACY: Your primary goal is to be helpful and accurate. Use Google Search if you need to verify facts.
          - MULTIMODAL AWARENESS: Acknowledge what you see and hear.
          - PERSONALITY: Be engaging, witty, and warm.
          - TRANSCRIPTION: You MUST provide a text transcript of everything you say.
          
          CONSTRAINTS:
          - Respond immediately to every input (voice, text, or vision).
          - Stay in character as Jasper at all times.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          tools: [{ googleSearch: {} }],
        },
        callbacks: {
          onopen: () => {
            console.log("Jasper Connection Opened");
            setIsConnected(true);
            setIsConnecting(false);
            startVisualizer();
            
            // Add a "Jasper is ready" message to the chat
            setChatHistory(prev => [...prev, { role: 'jasper', text: "I'm here! How can I help you today?", id: 'ready-msg' }]);
            
            // Start audio streaming
            audioProcessor.current.startRecording((base64Data) => {
              if (!isMutedRef.current && sessionRef.current) {
                try {
                  sessionRef.current.sendRealtimeInput({
                    media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                  });
                } catch (e) {
                  console.error("Error sending audio data:", e);
                }
              }
            });

            // Start video frame streaming if enabled
            if (isVideoEnabled) {
              frameIntervalRef.current = setInterval(sendVideoFrame, 500); // 2 fps
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // console.log("Jasper Message Received:", JSON.stringify(message).substring(0, 100)); 
            
            // 1. Handle Jasper's audio and text parts
            const modelTurn = message.serverContent?.modelTurn;
            const parts = modelTurn?.parts;
            
            if (parts) {
              setIsThinking(false);
              for (const part of parts) {
                // Handle Audio
                if (part.inlineData) {
                  setIsSpeaking(true);
                  audioProcessor.current.playAudioChunk(part.inlineData.data);
                  if (transcriptTimeout.current) clearTimeout(transcriptTimeout.current);
                  transcriptTimeout.current = setTimeout(() => setIsSpeaking(false), 2000);
                }
                
                // Handle Text (Direct or Transcription)
                if (part.text) {
                  const text = part.text;
                  setChatHistory(prev => {
                    // Find the most recent Jasper message
                    const lastIndex = prev.map(m => m.role === 'jasper').lastIndexOf(true);
                    
                    if (lastIndex !== -1 && (prev[lastIndex].isPartial || prev[lastIndex].text.length < 500)) {
                      const newHistory = [...prev];
                      // Append text if it's a continuation or a partial
                      newHistory[lastIndex] = { 
                        ...newHistory[lastIndex], 
                        text: newHistory[lastIndex].isPartial ? text : newHistory[lastIndex].text + " " + text,
                        isPartial: false // Mark as not partial if it's coming through parts
                      };
                      return newHistory;
                    }
                    
                    return [...prev, { role: 'jasper', text, id: 'j-text-' + Date.now() }];
                  });
                }
              }
            }

            // 2. Handle Live Transcription (if separate from parts)
            const serverContent = message.serverContent as any;
            const outputTranscription = (message as any).outputAudioTranscription || serverContent?.outputAudioTranscription;
            
            if (outputTranscription) {
              setIsThinking(false);
              const { transcript, done } = outputTranscription;
              if (transcript) {
                setChatHistory(prev => {
                  const lastIndex = prev.map(m => m.role === 'jasper' && m.isPartial).lastIndexOf(true);
                  
                  if (lastIndex !== -1) {
                    const newHistory = [...prev];
                    newHistory[lastIndex] = { 
                      ...newHistory[lastIndex], 
                      text: transcript, 
                      isPartial: !done 
                    };
                    return newHistory;
                  }
                  
                  return [...prev, { 
                    role: 'jasper', 
                    text: transcript, 
                    id: 'j-live-' + Date.now(), 
                    isPartial: !done 
                  }];
                });
              }
            }

            // 3. Handle User's transcription
            const inputTranscription = (message as any).inputAudioTranscription || serverContent?.inputAudioTranscription;
            if (inputTranscription) {
              const { transcript, done } = inputTranscription;
              if (transcript) {
                setUserTranscript(transcript);
                if (done) {
                  setChatHistory(prev => [
                    ...prev.filter(m => !m.isPartial || m.role !== 'user'),
                    { role: 'user', text: transcript, id: 'u-' + Date.now() }
                  ]);
                  setUserTranscript("");
                }
              }
            }

            if (message.serverContent?.interrupted) {
              console.log("Jasper Interrupted");
              audioProcessor.current.stopAll();
              setIsSpeaking(false);
              setChatHistory(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'jasper' && last.isPartial) {
                  return [...prev.slice(0, -1), { ...last, isPartial: false, text: last.text + " [Interrupted]" }];
                }
                return prev;
              });
            }
          },
          onclose: () => {
            setIsConnected(false);
            setIsConnecting(false);
            audioProcessor.current.stopRecording();
            stopVisualizer();
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
          },
          onerror: (err: any) => {
            console.error("Jasper connection error:", err);
            setIsConnecting(false);
            const errorMsg = err?.message || "Connection lost. Please try reconnecting.";
            setError(errorMsg);
            if (errorMsg.toLowerCase().includes("quota")) {
              setError("Jasper is resting (Quota reached). Please try again later.");
            }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (error: any) {
      console.error("Failed to connect to Jasper:", error);
      setIsConnecting(false);
      setError(error.message || "Failed to connect to Jasper. Please try again.");
    }
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || !sessionRef.current || !isConnected) {
      console.warn("Cannot send text: session not ready or empty input");
      return;
    }

    const messageText = textInput.trim();
    if (!messageText) return;

    try {
      setIsThinking(true);
      // Add to local history immediately
      const userMsgId = 'u-' + Date.now();
      setChatHistory(prev => [...prev, { role: 'user', text: messageText, id: userMsgId }]);
      
      // Clear input immediately for better UX
      setTextInput("");
      
      if (sessionRef.current) {
        console.log("Sending text to Jasper:", messageText);
        
        // Use the standard Live API method for sending text turns
        try {
          // Try Method 1: sendRealtimeInput with clientContent
          (sessionRef.current as any).sendRealtimeInput({
            clientContent: {
              turns: [{ role: 'user', parts: [{ text: messageText }] }],
              turnComplete: true
            }
          });
          console.log("Text sent successfully via sendRealtimeInput");
        } catch (err) {
          console.warn("sendRealtimeInput failed, trying session.send:", err);
          // Try Method 2: session.send with clientContent
          try {
            (sessionRef.current as any).send({
              clientContent: {
                turns: [{ role: 'user', parts: [{ text: messageText }] }],
                turnComplete: true
              }
            });
            console.log("Text sent successfully via session.send");
          } catch (err2) {
            console.error("All text sending methods failed:", err2);
            setIsThinking(false);
            setError("Failed to send message to Jasper.");
          }
        }
      } else {
        console.error("No active session to send text to");
        setIsThinking(false);
      }
      
      // Safety timeout to clear thinking state if no response
      setTimeout(() => {
        setIsThinking(current => {
          if (current) {
            console.log("Thinking timeout reached");
            return false;
          }
          return current;
        });
      }, 15000);
      
    } catch (err) {
      console.error("Error in handleSendText:", err);
      setIsThinking(false);
      setError("An unexpected error occurred.");
    }
  };

  // Load history on mount
  useEffect(() => {
    const history = localStorage.getItem('jasper_history');
    if (history) {
      try {
        setSavedSessions(JSON.parse(history));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save current session to history
  useEffect(() => {
    if (chatHistory.length > 0) {
      const newSessions = [...savedSessions];
      const sessionIndex = newSessions.findIndex(s => s.id === currentSessionId);
      
      const sessionData = {
        id: currentSessionId,
        date: new Date().toLocaleString(),
        history: chatHistory
      };

      if (sessionIndex >= 0) {
        newSessions[sessionIndex] = sessionData;
      } else {
        newSessions.unshift(sessionData);
      }
      
      setSavedSessions(newSessions);
      localStorage.setItem('jasper_history', JSON.stringify(newSessions.slice(0, 20))); // Keep last 20 sessions
    }
  }, [chatHistory, currentSessionId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, userTranscript]);

  const startNewSession = () => {
    disconnectJasper();
    setChatHistory([]);
    setCurrentSessionId(Math.random().toString(36).substr(2, 9));
    setAiTranscript("");
    setUserTranscript("");
  };

  const loadSession = (session: any) => {
    disconnectJasper();
    setChatHistory(session.history);
    setCurrentSessionId(session.id);
    setShowHistory(false);
  };

  const disconnectJasper = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    audioProcessor.current.stopRecording();
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    setIsConnected(false);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
  };
  
  const toggleVideo = () => {
    if (isVideoEnabled) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  useEffect(() => {
    return () => {
      disconnectJasper();
      stopCamera();
    };
  }, []);

  // Start/stop frame streaming when connection state changes
  useEffect(() => {
    if (isConnected && isVideoEnabled) {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      // 1 frame per second is often more stable for vision tasks
      frameIntervalRef.current = setInterval(sendVideoFrame, 1000);
    } else {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    }
  }, [isConnected, isVideoEnabled]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-5xl mx-auto p-6">
      {/* Modals */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl">
                    <History className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Interaction History</h3>
                    <p className="text-zinc-500 text-sm">Your previous conversations with Jasper</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {savedSessions.length > 0 && (
                    <button 
                      onClick={() => {
                        if (confirm("Clear all history?")) {
                          setSavedSessions([]);
                          localStorage.removeItem('jasper_history');
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      Clear All
                    </button>
                  )}
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="p-3 hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {savedSessions.length === 0 ? (
                  <div className="text-center py-20 text-zinc-600 italic">
                    No history found yet. Start talking to Jasper!
                  </div>
                ) : (
                  savedSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadSession(session)}
                      className="w-full p-6 rounded-3xl bg-zinc-800/30 border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{session.date}</span>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-zinc-300 text-sm line-clamp-2">
                        {session.history.find(m => m.role === 'user')?.text || "Empty session"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between w-full mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold hover:bg-zinc-800 transition-all"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={startNewSession}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mr-2">Voice:</span>
          <div className="flex bg-zinc-900 p-1 rounded-full border border-zinc-800">
            {VOICE_OPTIONS.map((voice) => (
              <button
                key={voice.id}
                onClick={() => {
                  setSelectedVoice(voice);
                  if (isConnected) {
                    setError("Voice changed. Reconnect to apply.");
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  selectedVoice.id === voice.id 
                    ? 'bg-white text-black shadow-lg' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {voice.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl flex items-center gap-3 border border-red-400/20"
          >
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full aspect-video bg-zinc-950 rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-800 flex flex-col items-center justify-center group">
        
        {/* Camera Feed Overlay */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${isVideoEnabled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          
          {/* Thinking indicator over video */}
          <AnimatePresence>
            {isThinking && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-20"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                  </div>
                  <span className="text-emerald-400 font-bold text-xs uppercase tracking-[0.2em] drop-shadow-lg">Jasper is processing...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Visualizer Atmosphere (Visible when camera is off or as overlay) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-emerald-500/20 transition-opacity duration-1000 ${isConnected ? 'opacity-100' : 'opacity-0'}`} />
          <AnimatePresence>
            {isSpeaking && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-[80%] h-[80%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Jasper Avatar (Centered when camera is off) */}
        {!isVideoEnabled && (
          <div className="relative z-10 flex flex-col items-center gap-8">
            <div className="relative">
              <motion.div 
                animate={isConnected ? {
                  scale: isSpeaking ? [1, 1.1, 1] : isThinking ? [1, 1.05, 1] : 1,
                  boxShadow: isSpeaking ? ["0 0 20px rgba(99,102,241,0.2)", "0 0 50px rgba(99,102,241,0.5)", "0 0 20px rgba(99,102,241,0.2)"] : isThinking ? ["0 0 10px rgba(16,185,129,0.2)", "0 0 30px rgba(16,185,129,0.4)", "0 0 10px rgba(16,185,129,0.2)"] : "0 0 0px rgba(0,0,0,0)"
                } : {}}
                transition={{ repeat: Infinity, duration: isSpeaking ? 2 : 3 }}
                className={`w-32 h-32 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isConnected ? (isThinking ? 'border-emerald-500 bg-emerald-500/10' : 'border-indigo-500 bg-indigo-500/10') : 'border-zinc-700 bg-zinc-800'}`}
              >
                {isThinking ? (
                  <Loader2 className="w-16 h-16 text-emerald-400 animate-spin" />
                ) : (
                  <Sparkles className={`w-16 h-16 transition-colors duration-500 ${isConnected ? 'text-indigo-400' : 'text-zinc-600'}`} />
                )}
              </motion.div>

              {/* Recording Matrix / Visualizer */}
              <AnimatePresence>
                {isConnected && !isMuted && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-end gap-[2px] h-8 w-32 justify-center"
                  >
                    {audioLevels.map((level, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: `${Math.max(10, level * 100)}%` }}
                        className={`w-1 rounded-full transition-colors duration-200 ${level > 0.1 ? 'bg-indigo-500' : 'bg-zinc-800'}`}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center mt-4">
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {isThinking ? "Jasper is Thinking..." : isConnected ? "Jasper is Live" : isConnecting ? "Waking up Jasper..." : "Jasper is Offline"}
              </h2>
              {!isConnected && (
                <p className="text-zinc-400 text-sm font-medium">
                  Connect to start the challenge.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Status Indicators (Top Right) */}
        <div className="absolute top-6 right-6 flex gap-3 z-30">
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Connection
            </div>
          )}
          {isVideoEnabled && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${isSendingFrame ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'}`}>
              <Camera className={`w-3 h-3 ${isSendingFrame ? 'animate-pulse' : ''}`} />
              Vision {isSendingFrame ? 'Sending' : 'Active'}
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4 z-30 px-6">
          {!isConnected ? (
            <div className="flex gap-4">
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-all ${isVideoEnabled ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                title={isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"}
              >
                {isVideoEnabled ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </button>
              <button
                onClick={connectToJasper}
                disabled={isConnecting}
                className="px-10 py-4 bg-white text-black rounded-full font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-3 disabled:opacity-50 shadow-xl"
              >
                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                {isConnecting ? "Connecting..." : "Connect Jasper"}
              </button>
            </div>
          ) : (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-4 bg-zinc-900/80 backdrop-blur-xl p-2 rounded-full border border-zinc-800 shadow-2xl"
            >
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'hover:bg-zinc-800 text-zinc-400'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-all ${isVideoEnabled ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'hover:bg-zinc-800 text-zinc-400'}`}
              >
                {isVideoEnabled ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </button>
              <button
                onClick={() => {
                  bottomInputRef.current?.focus();
                  bottomInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="p-4 rounded-full transition-all hover:bg-zinc-800 text-zinc-400"
              >
                <MessageSquare className="w-6 h-6" />
              </button>
              <div className="w-px h-8 bg-zinc-800 mx-2" />
              <button
                onClick={disconnectJasper}
                className="px-8 py-3 bg-zinc-100 text-black rounded-full font-bold hover:bg-white transition-all text-sm"
              >
                End Session
              </button>
            </motion.div>
          )}
        </div>

        {/* Text Input Overlay Removed as per user request */}
      </div>

      {/* Transcript & Info Area */}
      <div className="mt-8 w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Chat History Section */}
          <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/50 backdrop-blur-sm flex flex-col h-[400px]">
            <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                Live Conversation
              </div>
              {isSpeaking && (
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 12, 4] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                      className="w-1 bg-indigo-500 rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
            >
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic text-sm gap-4">
                  <Sparkles className="w-8 h-8 opacity-20" />
                  <p>Start a conversation with Jasper...</p>
                </div>
              ) : (
                <>
                  {chatHistory.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700'
                      }`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1 flex items-center gap-2">
                          {msg.role === 'user' ? 'You' : 'Jasper'}
                          {msg.isPartial && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3].map(i => (
                                <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }} className="w-1 h-1 bg-white rounded-full" />
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}
                  {userTranscript && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm bg-indigo-600/40 text-white/70 rounded-tr-none border border-indigo-500/30 italic">
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-1 flex items-center gap-2">
                          You (Listening...)
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map(i => (
                              <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }} className="w-1 h-1 bg-white rounded-full" />
                            ))}
                          </div>
                        </div>
                        <p className="leading-relaxed">{userTranscript}</p>
                      </div>
                    </motion.div>
                  )}
                  {isThinking && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-zinc-800 text-zinc-400 px-4 py-2.5 rounded-2xl rounded-tl-none border border-zinc-700 text-xs flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Jasper is thinking...
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Inline Text Input for the Chat Section */}
            {isConnected && (
              <div className="p-4 border-t border-zinc-800/50">
                <form 
                  onSubmit={handleSendText}
                  className="relative flex items-center gap-2 bg-zinc-950/50 p-1.5 rounded-2xl border border-zinc-800"
                >
                  <input
                    ref={bottomInputRef}
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type to Jasper..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-white text-sm px-4 py-2"
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim()}
                    className="p-2 bg-indigo-500 text-white rounded-xl disabled:opacity-50 transition-all hover:bg-indigo-400"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/40 rounded-3xl p-8 border border-zinc-800/50 backdrop-blur-sm h-fit">
          <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Capabilities</h3>
          <ul className="space-y-4">
            {[
              { label: "Real-time Voice & Text", active: true },
              { label: "Live User Transcription", active: true },
              { label: "Vision-Enabled Tutoring", active: isVideoEnabled },
              { label: "Instant Interruption", active: true }
            ].map((cap, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${cap.active ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-zinc-800'}`} />
                <span className={`text-xs font-medium ${cap.active ? 'text-zinc-300' : 'text-zinc-600'}`}>{cap.label}</span>
              </li>
            ))}
          </ul>
          
          <div className="mt-8 pt-8 border-t border-zinc-800/50">
            <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
              Jasper is currently in Live mode. He responds to voice, video, and text simultaneously.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
