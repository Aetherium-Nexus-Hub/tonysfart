/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Activity, SquareTerminal, Volume2, VolumeX, ShieldCheck, Send, Terminal } from 'lucide-react';

// Suppress React 19 defaultProps warnings caused by Recharts
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
    return;
  }
  originalConsoleError(...args);
};

const API_KEY = process.env.GEMINI_API_KEY;

const JARVIS_CONTEXT = `
You are JARVIS, an advanced AI protocol assistant.
Your interface is a high-tech HUD.
You have access to a Python execution sandbox ("The Forge").
When asked to perform tasks, write Python code to execute them if applicable.
Keep your text responses concise, technical, and aligned with a cyber/HUD aesthetic.
Do not output markdown code blocks for Python if you are using the codeExecution tool, the tool will handle it.
`;

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  code?: string;
  result?: string;
};

const TelemetryPanel = () => {
  const [data, setData] = useState(Array.from({length: 20}, (_, i) => ({ time: i, value: 40 + Math.random() * 20 })));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1), { time: prev[prev.length - 1].time + 1, value: 30 + Math.random() * 50 }];
        return newData;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0a0a12] border border-[#333] rounded-xl p-4 h-48 flex flex-col shadow-lg">
      <h2 className="font-mono text-xs text-gray-400 mb-2 flex items-center gap-2 tracking-wider"><Activity size={14} className="text-pink-500"/> SYSTEM TELEMETRY</h2>
      <div className="flex-1 -ml-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis domain={[0, 100]} hide />
            <Line type="stepAfter" dataKey="value" stroke="#00f0ff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const ActiveProtocols = () => (
  <div className="bg-[#0a0a12] border border-[#333] rounded-xl p-4 flex-1 flex flex-col shadow-lg">
    <h2 className="font-mono text-xs text-gray-400 mb-4 flex items-center gap-2 tracking-wider"><ShieldCheck size={14} style={{ color: '#ffd700' }}/> ACTIVE PROTOCOLS</h2>
    <div className="flex flex-col gap-4 font-mono text-xs">
      <div className="flex justify-between items-center border-b border-[#222] pb-2">
        <span className="text-gray-300">Neural Net Routing</span>
        <span className="text-cyan-400 px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded">ONLINE</span>
      </div>
      <div className="flex justify-between items-center border-b border-[#222] pb-2">
        <span className="text-gray-300">Code Execution Sandbox</span>
        <span className="text-cyan-400 px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded">ONLINE</span>
      </div>
      <div className="flex justify-between items-center border-b border-[#222] pb-2">
        <span className="text-gray-300">Voice Synthesis (TTS)</span>
        <span className="text-cyan-400 px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded">ONLINE</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-500">Blackout Filter</span>
        <span className="text-yellow-400 px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded">STANDBY</span>
      </div>
    </div>
  </div>
)

const TheForge = ({ code, result }: { code?: string, result?: string }) => (
  <div className="flex flex-col h-full">
    <div className="p-3 border-b border-[#333] bg-[#111] flex items-center gap-2 shrink-0">
      <SquareTerminal size={16} className="text-pink-500" />
      <h2 className="font-mono text-xs text-gray-400 tracking-wider">THE FORGE // SANDBOX</h2>
    </div>
    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs flex flex-col gap-4">
      {code ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={code}>
          <div className="text-gray-500 mb-1.5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
            INPUT.py
          </div>
          <pre className="bg-[#05050a] p-3 rounded border border-[#333] text-cyan-300 overflow-x-auto whitespace-pre-wrap break-all">
            {code}
          </pre>
        </motion.div>
      ) : (
        <div className="text-gray-600 italic text-center mt-10 flex flex-col items-center gap-2">
          <SquareTerminal size={32} className="opacity-20" />
          Awaiting execution sequence...
        </div>
      )}
      
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} key={result}>
          <div className="text-gray-500 mb-1.5 flex items-center gap-2 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
            OUTPUT.log
          </div>
          <pre className="bg-[#05050a] p-3 rounded border border-[#333] text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
            {result}
          </pre>
        </motion.div>
      )}
    </div>
  </div>
)

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'ai',
      content: '**Protocol Artifact Loaded.**\n\nExisting Modules:\n- Vertical Grid Lines (Notification Filtering)\n- Glowing Cubes (VIP Prioritization)\n\nAwaiting directive.'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const latestExecution = [...messages].reverse().find(m => m.code || m.result);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const playAudio = (base64: string) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audio.play();
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    const newMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: newMsgId, role: 'user', content: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: userMsg,
        config: {
          systemInstruction: JARVIS_CONTEXT,
          tools: [{ codeExecution: {} }],
        },
      });

      let textContent = '';
      let codeContent = '';
      let execResult = '';

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) textContent += part.text;
          if (part.executableCode) codeContent = part.executableCode.code;
          if (part.codeExecutionResult) execResult = part.codeExecutionResult.output;
        }
      }
      
      if (!textContent && !codeContent) {
        textContent = response.text || 'Protocol Executed. No text output.';
      }

      setMessages(prev => [...prev, { 
        id: Date.now().toString() + 'ai', 
        role: 'ai', 
        content: textContent,
        code: codeContent,
        result: execResult
      }]);

      if (!isMuted && textContent) {
        const cleanText = textContent.replace(/[*#`]/g, '').substring(0, 300);
        if (cleanText.trim()) {
          const ttsResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: cleanText }] }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
              }
            }
          });
          const audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (audioBase64) playAudio(audioBase64);
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString() + 'err', role: 'ai', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05050a] text-white p-4 md:p-6 font-sans flex flex-col h-screen overflow-hidden">
      <header className="flex justify-between items-center mb-6 border-b border-[#333] pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-cyan-400 w-6 h-6" />
          <h1 className="font-mono text-xl text-cyan-400 tracking-[0.2em] uppercase" style={{ textShadow: '0 0 10px rgba(0,240,255,0.4)' }}>
            Jarvis Protocol <span className="text-xs text-gray-500 tracking-normal">// HUD v2.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-cyan-400 transition-colors" title={isMuted ? "Unmute TTS" : "Mute TTS"}>
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="font-mono text-xs text-yellow-400 border border-yellow-400/50 px-3 py-1.5 rounded bg-yellow-400/10" style={{ boxShadow: '0 0 10px rgba(255,215,0,0.2)' }}>
            SYSTEM ONLINE
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Panel: Telemetry & Protocols */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-6 min-h-0">
          <TelemetryPanel />
          <ActiveProtocols />
        </div>

        {/* Center Panel: Main Terminal */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-[#0a0a12] border border-[#333] rounded-xl overflow-hidden relative shadow-lg">
          <div className="p-3 border-b border-[#333] bg-[#111] flex items-center gap-2 shrink-0">
            <Terminal size={16} className="text-cyan-400" />
            <h2 className="font-mono text-xs text-gray-400 tracking-wider">COMM-LINK // TERMINAL</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[90%] font-mono text-sm leading-relaxed ${msg.role === 'user' ? 'self-end' : 'self-start'}`}
                >
                  {msg.role === 'user' ? (
                    <div className="bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 p-3 rounded-lg rounded-tr-none">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="text-gray-200 markdown-body">
                      <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-cyan-400/50 font-mono text-xs flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                Processing logic streams...
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-[#333] bg-[#0d0d14] shrink-0">
            <div className="flex gap-2">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Enter command directive..."
                className="flex-1 bg-[#1a1a24] border border-[#333] rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400 transition-colors"
                disabled={isLoading}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-400/50 rounded-lg px-4 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: The Forge (Code Execution) */}
        <div className="hidden md:flex lg:col-span-4 flex-col min-h-0 bg-[#0a0a12] border border-[#333] rounded-xl overflow-hidden shadow-lg">
          <TheForge code={latestExecution?.code} result={latestExecution?.result} />
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
