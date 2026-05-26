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
import { Activity, SquareTerminal, Volume2, VolumeX, ShieldCheck, Send, Terminal, Mic, MicOff, Paperclip, X, Image as ImageIcon, Database, ArrowRight, Bell, Cpu, MousePointer2, Zap, LayoutGrid } from 'lucide-react';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Globe } from './components/ui/globe';
import mockVendorData from './mockVendorData.json';

// Suppress React 19 defaultProps warnings caused by Recharts
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
    return;
  }
  originalConsoleError(...args);
};

const API_KEY = process.env.GEMINI_API_KEY;
const NODE_ID = 'gen-lang-client-0011954453';

const JARVIS_CONTEXT = `
You are JARVIS, an advanced AI protocol assistant.
Your interface is a high-tech HUD.
You have access to a Python execution sandbox ("The Forge").

### DUAL-BRAIN ARCHITECTURE: ARCHITECT & LOREWEAVER
When generating hardware solutions (PC builds), you operate as two distinct entities:

1. THE ARCHITECT: Responsible for deterministic hardware validation.
   - You MUST select parts ONLY from the VENDOR DATABASE (including CPUs, GPUs, motherboards, PSUs, Cases, RAM, Storage). No inventing non-existent models.
   - You MUST prioritize VRAM for AI-centric tasks (Local LLM orchestration, Vision synthesis).
   - Component Compatibility Requirements:
     * Motherboard Socket Matching: You MUST pair any select CPU with a compatible motherboard sharing the exact same socket/platform:
       - AMD Ryzen 9 7950X / AMD Ryzen 7 7800X3D (Socket AM5) require an AM5 Motherboard (e.g., ASUS ROG STRIX X670E-F / MSI MAG B650).
       - Intel Core i9-14900K / Intel Core i7-14700K (Socket LGA1700) require an LGA1700 Motherboard (e.g., ASUS ROG MAXIMUS Z790 / MSI PRO Z790-A).
     * Power Unit (PSU) Sizing Overhead: Compute the estimated peak system draw = (CPU Wattage + GPU Wattage + 50W auxiliary load). The selected PSU's rated wattage MUST be at least 1.3x higher than this sum.
   - Output Section 1: The Build (Strict JSON) inside a code block with language "json-build".

2. THE LOREWEAVER: Responsible for continuous narrative justification.
   - Frame the hardware choices as a journey (Scout -> Observer -> Remnant).
   - Justify the "why" behind parts (e.g., why 24GB VRAM over faster clock speeds, why the chosen motherboard and chipset suits the CPU, and why the PSU can easily withstand transit spikes and peak load profiles).
   - Output Section 2: The Continuity Anchor (Markdown narrative).

### JSON-BUILD SCHEMA
{
  "build_codename": "String",
  "phase": "Scout | Observer | Remnant",
  "components": {
    "cpu": {"sku": "Exact Name", "price": 0.00},
    "motherboard": {"sku": "Exact Name", "price": 0.00},
    "gpu": {"sku": "Exact Name", "vram_gb": 0, "price": 0.00},
    "ram": {"sku": "Exact Name", "capacity_gb": 0, "price": 0.00},
    "storage": {"sku": "Exact Name", "price": 0.00},
    "psu": {"sku": "Exact Name", "wattage": 0, "price": 0.00},
    "case": {"sku": "Exact Name", "price": 0.00}
  },
  "metrics": {
    "total_cost": 0.00,
    "estimated_wattage_draw": 0,
    "vram_total": 0
  }
}

Keep responses technically precise, authoritative, and immersive.
`;

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  code?: string;
  result?: string;
  attachmentUrl?: string;
  pcBuild?: any;
};

type NotificationType = {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
};

const NotificationBanner = ({ notification }: { notification: NotificationType | null }) => {
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-[#0a0a12]/90 backdrop-blur-md border border-[#333] rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)]"
        >
          <div className="relative flex items-center justify-center w-3 h-3">
            <div className={`absolute w-full h-full rounded-full animate-ping ${notification.type === 'warning' ? 'bg-yellow-400' : notification.type === 'success' ? 'bg-green-400' : 'bg-cyan-400'}`} />
            <div className={`w-2 h-2 rounded-full ${notification.type === 'warning' ? 'bg-yellow-400' : notification.type === 'success' ? 'bg-green-400' : 'bg-cyan-400'}`} />
          </div>
          <span className="font-mono text-xs text-gray-200 tracking-wider">{notification.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Web Speech API setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const TelemetryPanel = () => {
  const [fpsData, setFpsData] = useState<{time: number, fps: number}[]>(Array(20).fill({time: 0, fps: 60}));
  
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFpsData(prev => [...prev.slice(1), { time: Date.now(), fps: frameCount }]);
        frameCount = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="bg-[#0a0a12]/80 backdrop-blur-md border border-[#333] rounded-xl p-4 h-48 flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.5)]">
      <h2 className="font-mono text-xs text-gray-400 mb-2 flex items-center gap-2 tracking-wider"><Activity size={14} className="text-pink-500"/> SYSTEM TELEMETRY (FPS)</h2>
      <div className="flex-1 -ml-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={fpsData}>
            <YAxis domain={[0, 120]} hide />
            <Line type="stepAfter" dataKey="fps" stroke="#00f0ff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const ActiveProtocols = () => (
  <div className="bg-[#0a0a12]/80 backdrop-blur-md border border-[#333] rounded-xl p-4 flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.5)]">
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
        <span className="text-gray-300">Kinetic PC Builder</span>
        <span className="text-cyan-400 px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded">ONLINE</span>
      </div>
      <div className="flex justify-between items-center border-b border-[#222] pb-2">
        <span className="text-gray-300">Voice Synthesis (TTS)</span>
        <span className="text-cyan-400 px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded">ONLINE</span>
      </div>
      <div className="flex justify-between items-center border-b border-[#222] pb-2">
        <span className="text-gray-300">Global Network (Search)</span>
        <span className="text-cyan-400 px-2 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded">ONLINE</span>
      </div>
      <div className="flex justify-between items-center border-b border-[#222] pb-2">
        <span className="text-gray-300">Connected Node ID</span>
        <span className="text-pink-500/80 font-mono text-[10px] tracking-tighter truncate ml-4" title={NODE_ID}>{NODE_ID}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-500">Optical Sensor (Vision)</span>
        <span className="text-yellow-400 px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded">STANDBY</span>
      </div>
    </div>
  </div>
)

const PCBuildCard = ({ build }: { build: any }) => {
  if (!build) return null;

  const phaseColors: any = {
    'Scout': 'text-green-400',
    'Observer': 'text-cyan-400',
    'Remnant': 'text-pink-500'
  };

  // Compatibility validation logic based on selected parts
  const selectedCpuSku = build.components?.cpu?.sku;
  const selectedMoboSku = build.components?.motherboard?.sku;
  const selectedGpuSku = build.components?.gpu?.sku;
  const selectedPsuSku = build.components?.psu?.sku;

  const cpuData = mockVendorData.cpus.find((c: any) => c.name === selectedCpuSku);
  const moboData = mockVendorData.motherboards.find((m: any) => m.name === selectedMoboSku);
  const gpuData = mockVendorData.gpus.find((g: any) => g.name === selectedGpuSku);
  const psuData = mockVendorData.psus.find((p: any) => p.name === selectedPsuSku);

  // 1. Socket compatibility calculation
  const cpuSocket = cpuData?.socket;
  const moboSocket = moboData?.socket;
  const socketCompatible = cpuSocket && moboSocket ? (cpuSocket === moboSocket) : null;

  // 2. Headroom overhead calculations
  const cpuPower = cpuData?.wattage || 0;
  const gpuPower = gpuData?.wattage || 0;
  const estimatedActualDraw = cpuPower + gpuPower + 50; // Auxiliary margin for storage, memory modules

  const psuWatts = psuData?.wattage || build.components?.psu?.wattage || 0;
  const headroomRatio = estimatedActualDraw > 50 && psuWatts > 0 ? (psuWatts / estimatedActualDraw) : 0;
  const isPsuSufficient = headroomRatio >= 1.3;

  // 3. VRM temperature calculation / simulation
  const baseVrmTemp = moboData 
    ? (moboData.price > 400 ? 38 : moboData.price > 220 ? 44 : 48) 
    : 45;
  const loadOffset = (cpuPower / 250) * 18; // heavier CPU produces higher baseline load temps
  const targetTempBaseline = baseVrmTemp + loadOffset;

  const [vrmTemp, setVrmTemp] = useState(targetTempBaseline);

  useEffect(() => {
    // Sync starting value with new build choices immediately
    setVrmTemp(targetTempBaseline);
  }, [targetTempBaseline]);

  useEffect(() => {
    // Simulate active sensor polling with subtle real-time fluctuations
    const interval = setInterval(() => {
      setVrmTemp(prev => {
        const driftRange = 0.8;
        const currentDiff = prev - targetTempBaseline;
        const randomDelta = (Math.random() - 0.5) * 0.3;
        
        // Slight gravitational pull towards target baseline to keep it stable
        const correction = currentDiff > driftRange ? -0.05 : currentDiff < -driftRange ? 0.05 : 0;
        
        return Number((prev + randomDelta + correction).toFixed(1));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [targetTempBaseline]);

  // Determine severity style properties
  let vrmColor = 'text-green-400';
  let statusLabel = 'NOMINAL';
  let pulseClass = 'bg-green-500 animate-pulse';

  if (vrmTemp > 75) {
    vrmColor = 'text-red-500 font-extrabold';
    statusLabel = 'CRITICAL OVERHEAT';
    pulseClass = 'bg-red-500 animate-ping';
  } else if (vrmTemp > 58) {
    vrmColor = 'text-yellow-400';
    statusLabel = 'ELEVATED';
    pulseClass = 'bg-yellow-400 animate-pulse';
  } else if (vrmTemp > 45) {
    vrmColor = 'text-cyan-400';
    statusLabel = 'OPTIMAL';
    pulseClass = 'bg-cyan-400';
  } else {
    vrmColor = 'text-green-400';
    statusLabel = 'COOL/STANDBY';
    pulseClass = 'bg-green-400';
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0a0a12]/90 border border-cyan-400/40 rounded-xl p-4 font-mono text-xs flex flex-col gap-3 shadow-[0_0_20px_rgba(0,240,255,0.15)] my-4 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-1 bg-cyan-400/10 border-b border-l border-cyan-400/20 text-[8px] text-cyan-400/50">
        KINETIC_VALIDATED
      </div>

      <div className="flex justify-between items-center border-b border-cyan-400/20 pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="text-cyan-400" size={16} />
          <div>
            <h3 className="text-cyan-400 font-bold uppercase tracking-widest">{build.build_codename || 'JARVIS KINETIC BUILD'}</h3>
            {build.phase && <span className={`text-[9px] uppercase font-bold ${phaseColors[build.phase] || 'text-gray-500'}`}>{build.phase} ARC PHASE</span>}
          </div>
        </div>
        <div className="text-right">
          <span className="text-gray-500 text-[10px] block">SECURITY_LAYER</span>
          <span className="text-green-500 text-[9px]">ENFORCED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        {Object.entries(build.components).map(([key, comp]: [string, any]) => {
          if (!comp) return null;
          let socketSpec = '';
          let chipsetSpec = '';
          if (key === 'cpu' && cpuData?.socket) {
            socketSpec = cpuData.socket;
          }
          if (key === 'motherboard' && moboData) {
            socketSpec = moboData.socket;
            chipsetSpec = moboData.chipset;
          }

          return (
            <div key={key} className="flex flex-col gap-1 bg-black/40 p-2 rounded border border-[#333] hover:border-cyan-400/20 transition-colors">
              <span className="text-gray-500 uppercase text-[10px]">{key}</span>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-300 truncate mr-2" title={comp.sku}>{comp.sku}</span>
                <span className="text-cyan-400/80">${comp.price ? comp.price.toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {comp.vram_gb && <span className="text-[9px] text-pink-500/80 px-1 bg-pink-500/10 rounded">VRAM: {comp.vram_gb}GB</span>}
                {comp.wattage && <span className="text-[9px] text-yellow-500/80 px-1 bg-yellow-500/10 rounded">DR: {comp.wattage}W</span>}
                {comp.capacity_gb && <span className="text-[9px] text-green-500/80 px-1 bg-green-500/10 rounded">MEM: {comp.capacity_gb}GB</span>}
                {socketSpec && <span className="text-[9px] text-blue-400 px-1 bg-blue-500/10 rounded">SOCKET: {socketSpec}</span>}
                {chipsetSpec && <span className="text-[9px] text-purple-400 px-1 bg-purple-500/10 rounded">CHIPSET: {chipsetSpec}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Compatibility Verification telemetry panel */}
      <div className="border border-cyan-400/20 bg-cyan-400/5 p-2 rounded mt-1 flex flex-col gap-1.5">
        <span className="text-cyan-400 text-[10px] uppercase tracking-wider font-bold">🛠️ COMPATIBILITY TELEMETRY REPORT</span>
        
        {/* Socket matching visualization */}
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-gray-400">Platform Alignment ({cpuSocket || 'UNKNOWN'} / {moboSocket || 'UNKNOWN'}):</span>
          {socketCompatible === true ? (
            <span className="text-green-400 font-bold">✓ ALIGNED ({cpuSocket})</span>
          ) : socketCompatible === false ? (
            <span className="text-red-500 font-bold animate-pulse">✗ MISMATCH ERROR</span>
          ) : (
            <span className="text-yellow-400">⚡ INCOMPLETE SYSTEM</span>
          )}
        </div>

        {/* Real-time power margin telemetry */}
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-gray-400">Power Overhead Sizing ({psuWatts}W vs {estimatedActualDraw}W actual sum):</span>
          {isPsuSufficient ? (
            <span className="text-green-400 font-bold">✓ STABLE ({headroomRatio.toFixed(1)}x overhead)</span>
          ) : psuWatts > 0 ? (
            <span className="text-yellow-400 font-bold animate-pulse">⚠ LOW OVERHEAD ({headroomRatio.toFixed(1)}x)</span>
          ) : (
            <span className="text-gray-500">AWAITING POWER UNIT</span>
          )}
        </div>

        {/* VRM Motherboard Temperature Display */}
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-gray-400">Motherboard VRM Temp (Thermal Sensor #VRM1):</span>
          {selectedMoboSku ? (
            <div className="flex items-center gap-1.5">
              <span className={`font-bold transition-colors duration-300 ${vrmColor}`}>
                {vrmTemp.toFixed(1)}°C
              </span>
              <span className="text-[8px] text-gray-400 uppercase">
                ({statusLabel})
              </span>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${pulseClass}`} />
            </div>
          ) : (
            <span className="text-gray-500">NO MOTHERBOARD MOUNTED</span>
          )}
        </div>
      </div>

      <div className="border-t border-cyan-400/20 pt-2 grid grid-cols-3 gap-2 text-center bg-cyan-400/5 -mx-4 -mb-4 p-3 mt-1">
        <div className="flex flex-col">
          <span className="text-gray-500 text-[10px]">TOTAL BUDGET</span>
          <span className="text-cyan-400 font-bold">${build.metrics.total_cost.toFixed(2)}</span>
        </div>
        <div className="flex flex-col border-x border-white/5">
          <span className="text-gray-500 text-[10px]">PEAK DRAW</span>
          <span className="text-yellow-400 font-bold">{build.metrics.estimated_wattage_draw || estimatedActualDraw}W</span>
        </div>
        <div className="flex flex-col">
          <span className="text-gray-500 text-[10px]">BUFFER (VRAM)</span>
          <span className="text-pink-500 font-bold">{build.metrics.vram_total}GB</span>
        </div>
      </div>
    </motion.div>
  );
};

const DiagnosticPanel = ({ onNotify, onTestAudio, onSetInput }: { onNotify: (msg: string, type: 'info'|'success'|'warning') => void, onTestAudio: () => void, onSetInput: (val: string) => void }) => (
  <div className="bg-[#0a0a12]/80 backdrop-blur-md border border-[#333] rounded-xl p-4 flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.5)]">
    <div className="flex justify-between items-center mb-4">
      <h2 className="font-mono text-xs text-gray-400 flex items-center gap-2 tracking-wider"><Zap size={14} className="text-yellow-400"/> SYSTEM DIAGNOSTIC</h2>
      <span className="text-[10px] font-mono text-cyan-400/50">v2.1.4</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <button 
        onClick={() => onNotify('System pulse clear. Logic stable.', 'success')}
        className="bg-black/40 border border-[#333] hover:border-green-500/50 p-2 rounded flex flex-col items-center gap-1 transition-all group"
      >
        <Bell size={14} className="text-green-500 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">Notif. OK</span>
      </button>
      <button 
        onClick={() => onNotify('Warning: Kinetic shield at 24% capacity.', 'warning')}
        className="bg-black/40 border border-[#333] hover:border-yellow-500/50 p-2 rounded flex flex-col items-center gap-1 transition-all group"
      >
        <Bell size={14} className="text-yellow-500 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">Notif. Err</span>
      </button>
      <button 
        onClick={onTestAudio}
        className="bg-black/40 border border-[#333] hover:border-cyan-500/50 p-2 rounded flex flex-col items-center gap-1 transition-all group"
      >
        <Volume2 size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">Audio Ping</span>
      </button>
      <button 
        onClick={() => window.location.reload()}
        className="bg-black/40 border border-[#333] hover:border-pink-500/50 p-2 rounded flex flex-col items-center gap-1 transition-all group"
      >
        <LayoutGrid size={14} className="text-pink-500 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">Reboot UI</span>
      </button>
      <button 
        onClick={() => {
          onNotify('Protocol Sequence: Kinetic Builder Initialized.', 'info');
          onSetInput('I need a high-end PC build for local AI training and 3D rendering. My budget is $3000. Prioritize VRAM.');
        }}
        className="bg-cyan-400/10 border border-cyan-400/30 hover:border-cyan-400 p-2 rounded flex flex-col items-center gap-1 transition-all group lg:col-span-2"
      >
        <Cpu size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-tighter">Request PC Build</span>
      </button>
    </div>
  </div>
);

const MemoryCore = ({ messages, user, onNotify }: { messages: Message[], user: User | null, onNotify: (msg: string, type: 'info'|'success'|'warning') => void }) => {
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    if (!user) {
      setSummary('');
      return;
    }
    const fetchSummary = async () => {
      try {
        const docRef = doc(db, `users/${user.uid}/summary/latest`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSummary(docSnap.data().content);
        }
      } catch (e) {
        console.error("Failed to fetch summary", e);
      }
    };
    fetchSummary();
  }, [user]);

  const generateSummary = async () => {
    if (!user || messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const chatLog = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      const prompt = `You are JARVIS. Summarize the following chat log, extracting only the most important interactions, decisions, or facts. Keep it concise, use bullet points, and maintain a high-tech, analytical HUD aesthetic.\n\nCHAT LOG:\n${chatLog}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });
      
      const newSummary = response.text || 'No significant data extracted.';
      setSummary(newSummary);
      
      await setDoc(doc(db, `users/${user.uid}/summary/latest`), {
        uid: user.uid,
        content: newSummary,
        updatedAt: serverTimestamp()
      });
      onNotify('Memory Core synced successfully.', 'success');
    } catch (error) {
      console.error("Summarization failed", error);
      onNotify('Memory Core sync failed.', 'warning');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="bg-[#0a0a12]/80 backdrop-blur-md border border-[#333] rounded-xl p-4 flex-1 flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.5)] min-h-[250px]">
      <div className="flex justify-between items-center mb-4 border-b border-[#222] pb-2">
        <h2 className="font-mono text-xs text-gray-400 flex items-center gap-2 tracking-wider"><Database size={14} className="text-cyan-400"/> MEMORY CORE</h2>
        <button 
          onClick={generateSummary} 
          disabled={isSummarizing || !user} 
          className="text-[10px] font-mono text-cyan-400 border border-cyan-400/30 px-2 py-1 rounded hover:bg-cyan-400/10 disabled:opacity-50 transition-colors"
        >
          {isSummarizing ? 'SYNCING...' : 'SUMMARIZE'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-xs text-gray-300 markdown-body pr-2">
        {!user ? (
          <div className="text-gray-600 italic text-center mt-8">LOGIN REQUIRED FOR MEMORY SYNC</div>
        ) : summary ? (
          <div dangerouslySetInnerHTML={{ __html: marked.parse(summary) }} />
        ) : (
          <div className="text-gray-600 italic text-center mt-8">No summary data available.</div>
        )}
      </div>
    </div>
  );
}

const TheForge = ({ code, result }: { code?: string, result?: string }) => (
  <div className="flex flex-col h-full bg-[#0a0a12]/80 backdrop-blur-md">
    <div className="p-3 border-b border-[#333] bg-[#111]/80 backdrop-blur-md flex items-center gap-2 shrink-0">
      <SquareTerminal size={16} className="text-pink-500" />
      <h2 className="font-mono text-xs text-gray-400 tracking-wider">THE FORGE // SANDBOX</h2>
    </div>
    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs flex flex-col gap-4 relative">
      {code ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={code}>
          <div className="text-gray-500 mb-1.5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></div>
            INPUT.py
          </div>
          <pre className="bg-[#05050a]/80 backdrop-blur-sm p-3 rounded border border-[#333] text-cyan-300 overflow-x-auto whitespace-pre-wrap break-all">
            {code}
          </pre>
        </motion.div>
      ) : (
        <div className="text-gray-600 italic text-center mt-10 flex flex-col items-center gap-2">
          <SquareTerminal size={32} className="opacity-20" />
          Awaiting execution sequence...
          <span className="animate-pulse text-cyan-400/50 mt-2">_</span>
        </div>
      )}
      
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} key={result}>
          <div className="text-gray-500 mb-1.5 flex items-center gap-2 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
            OUTPUT.log
          </div>
          <pre className="bg-[#05050a]/80 backdrop-blur-sm p-3 rounded border border-[#333] text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
            {result}
          </pre>
        </motion.div>
      )}
    </div>
  </div>
)

const compressImage = (dataUrl: string, maxWidth = 500, maxHeight = 500): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
  });
};

function HUD({ onExit }: { onExit: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<{data: string, mimeType: string, url: string} | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const prevUserRef = useRef<User | null>(null);
  const showNotificationRef = useRef<(message: string, type?: 'info' | 'success' | 'warning') => void>(() => {});

  const showNotification = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setNotification({ id, message, type });
    setTimeout(() => {
      setNotification(prev => prev?.id === id ? null : prev);
    }, 4000);
  };

  useEffect(() => {
    showNotificationRef.current = showNotification;
  });

  const latestExecution = [...messages].reverse().find(m => m.code || m.result);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (!u) {
        setMessages([
          {
            id: 'init',
            role: 'ai',
            content: '**Protocol Artifact Loaded.**\n\nExisting Modules:\n- Vertical Grid Lines (Notification Filtering)\n- Glowing Cubes (VIP Prioritization)\n\nAwaiting directive. Please LOGIN to sync memory.'
          }
        ]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthReady) {
      if (user && !prevUserRef.current) {
        showNotification('User authenticated. Memory sync active.', 'success');
      } else if (!user && prevUserRef.current) {
        showNotification('User disconnected. Memory sync offline.', 'warning');
      }
    }
    prevUserRef.current = user;
  }, [user, isAuthReady]);

  useEffect(() => {
    if (!isAuthReady || !user) return;
    const q = query(collection(db, `users/${user.uid}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          role: data.role,
          content: data.content,
          code: data.code,
          result: data.result,
          attachmentUrl: data.attachmentUrl,
          pcBuild: data.pcBuild
        });
      });
      if (msgs.length === 0) {
        addDoc(collection(db, `users/${user.uid}/messages`), {
          uid: user.uid,
          role: 'ai',
          content: '**Protocol Artifact Loaded.**\n\nExisting Modules:\n- Vertical Grid Lines (Notification Filtering)\n- Glowing Cubes (VIP Prioritization)\n\nAwaiting directive.',
          createdAt: serverTimestamp()
        }).catch(err => {
          console.error("Failed to add initial welcome message:", err);
        });
      } else {
        setMessages(msgs);
      }
    }, (error) => {
      console.error("Firestore Error: ", error);
    });
    return () => unsubscribe();
  }, [user, isAuthReady]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          showNotificationRef.current?.('Microphone permission blocked. Please grant access in your browser or try opening Jarvis in a new tab.', 'warning');
        } else if (event.error === 'no-speech') {
          showNotificationRef.current?.('No speech detected. Please try again.', 'info');
        } else {
          showNotificationRef.current?.(`Speech recognition error: ${event.error}`, 'warning');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition start failed:", err);
        showNotification('Failed to start speech recognition. Please verify permissions.', 'warning');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const originalUrl = reader.result as string;
      compressImage(originalUrl, 500, 500).then((compressedUrl) => {
        const base64String = compressedUrl.split(',')[1];
        setAttachment({ data: base64String, mimeType: 'image/jpeg', url: compressedUrl });
      }).catch((err) => {
        console.error("Image compression failed, using original", err);
        const base64String = originalUrl.split(',')[1];
        setAttachment({ data: base64String, mimeType: file.type, url: originalUrl });
      });
    };
    reader.readAsDataURL(file);
  };

  const playAudio = (base64: string) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audio.volume = isMuted ? 0 : volume;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Audio play interrupted or blocked by browser:", err);
        });
      }
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || isLoading) return;

    const userMsg = input;
    const currentAttachment = attachment;
    const newMsgId = Date.now().toString();
    
    if (!user) {
      setMessages(prev => [...prev, { id: newMsgId, role: 'user', content: userMsg, attachmentUrl: currentAttachment?.url }]);
    } else {
      const userMsgData: any = {
        uid: user.uid,
        role: 'user',
        content: userMsg,
        createdAt: serverTimestamp()
      };
      if (currentAttachment?.url) userMsgData.attachmentUrl = currentAttachment.url;
      addDoc(collection(db, `users/${user.uid}/messages`), userMsgData).catch(err => {
        console.error("Failed to add user message to firestore:", err);
        showNotificationRef.current?.("Failed to save message to database.", "warning");
      });
    }
    
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      const parts: any[] = [{ text: userMsg || "Analyze this image." }];
      if (currentAttachment) {
        parts.push({
          inlineData: {
            data: currentAttachment.data,
            mimeType: currentAttachment.mimeType
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: parts,
        config: {
          systemInstruction: JARVIS_CONTEXT + `\n\n### VENDOR DATABASE\n${JSON.stringify(mockVendorData, null, 2)}`,
          tools: [{ codeExecution: {} }, { googleSearch: {} }],
        },
      });

      let textContent = '';
      let codeContent = '';
      let execResult = '';
      let pcBuildData: any = null;

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            // Detect JSON build block
            const buildMatch = part.text.match(/```json-build\n([\s\S]*?)```/);
            if (buildMatch) {
              try {
                pcBuildData = JSON.parse(buildMatch[1]);
                // Kinetic Shield Validation
                const cpuName = pcBuildData.components?.cpu?.sku;
                const moboName = pcBuildData.components?.motherboard?.sku;
                const psuObj = pcBuildData.components?.psu;
                
                const dbCpu = mockVendorData.cpus.find((c: any) => c.name === cpuName);
                const dbMobo = mockVendorData.motherboards.find((m: any) => m.name === moboName);
                
                if (dbCpu && dbMobo && dbCpu.socket !== dbMobo.socket) {
                  showNotification('KINETIC SHIELD: CPU/Motherboard Socket Mismatch!', 'warning');
                } else if (psuObj && pcBuildData.metrics?.estimated_wattage_draw) {
                  if (psuObj.wattage < pcBuildData.metrics.estimated_wattage_draw * 1.3) {
                    showNotification('KINETIC SHIELD: PSU WATTAGE LOW (HEADROOM < 1.3X)', 'warning');
                  }
                }
                textContent += part.text.replace(/```json-build\n([\s\S]*?)```/, '(PC BUILD SPECIFICATIONS EXTRACTED)');
              } catch (e) {
                console.error("Failed to parse pc-build json", e);
                textContent += part.text;
              }
            } else {
              textContent += part.text;
            }
          }
          if (part.executableCode) codeContent = part.executableCode.code;
          if (part.codeExecutionResult) execResult = part.codeExecutionResult.output;
        }
      }
      
      if (!textContent && !codeContent) {
        textContent = response.text || 'Protocol Executed. No text output.';
      }

      if (pcBuildData) {
        showNotification('Kinetic Builder: Design synchronized.', 'success');
      }

      if (execResult) {
        showNotification('Forge execution completed.', 'success');
      }

      if (user) {
        const aiMsg: any = {
          uid: user.uid,
          role: 'ai',
          content: textContent,
          createdAt: serverTimestamp()
        };
        if (codeContent) aiMsg.code = codeContent;
        if (execResult) aiMsg.result = execResult;
        if (pcBuildData) aiMsg.pcBuild = pcBuildData;
        addDoc(collection(db, `users/${user.uid}/messages`), aiMsg).catch(err => {
          console.error("Failed to save AI response in Firestore:", err);
          showNotificationRef.current?.("Failed to sync AI response to database.", "warning");
        });
      } else {
        setMessages(prev => [...prev, { 
          id: Date.now().toString() + 'ai', 
          role: 'ai', 
          content: textContent,
          code: codeContent,
          result: execResult,
          pcBuild: pcBuildData
        }]);
      }

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
    <div className="min-h-screen bg-[#05050a] text-white p-4 md:p-6 font-sans flex flex-col h-screen overflow-hidden relative">
      <div className="scanlines" />
      <NotificationBanner notification={notification} />
      
      <header className="flex justify-between items-center mb-6 border-b border-[#333] pb-4 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8">
            <ShieldCheck className="text-cyan-400 w-6 h-6 absolute z-10" />
            {isLoading && (
              <motion.div 
                className="absolute w-8 h-8 border-2 border-cyan-400 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <h1 className="font-mono text-xl text-cyan-400 tracking-[0.2em] uppercase cursor-pointer" onClick={onExit} style={{ textShadow: '0 0 10px rgba(0,240,240,0.4)' }}>
            Jarvis Protocol <span className="text-xs text-gray-500 tracking-normal">// {NODE_ID}</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          {user ? (
            <button onClick={logout} className="text-xs font-mono text-gray-400 hover:text-pink-500 transition-colors">LOGOUT</button>
          ) : (
            <button onClick={loginWithGoogle} className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors" style={{ textShadow: '0 0 5px rgba(0,240,255,0.5)' }}>LOGIN</button>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-cyan-400 transition-colors" title={isMuted ? "Unmute TTS" : "Mute TTS"}>
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={isMuted ? 0 : volume} 
              onChange={(e) => {
                const newVol = parseFloat(e.target.value);
                setVolume(newVol);
                if (isMuted && newVol > 0) setIsMuted(false);
                if (!isMuted && newVol === 0) setIsMuted(true);
              }} 
              className="w-20 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
          <div className="font-mono text-xs text-yellow-400 border border-yellow-400/50 px-3 py-1.5 rounded bg-yellow-400/10" style={{ boxShadow: '0 0 10px rgba(255,215,0,0.2)' }}>
            SYSTEM ONLINE
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 relative z-10">
        {/* Left Panel: Telemetry & Protocols */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-6 min-h-0 overflow-y-auto pb-4">
          <TelemetryPanel />
          <ActiveProtocols />
          <DiagnosticPanel 
            onNotify={showNotification} 
            onSetInput={setInput}
            onTestAudio={async () => {
              if (isMuted) {
                showNotification('Audio muted. Diagnostic ping suppressed.', 'warning');
                return;
              }
              showNotification('Broadcasting diagnostic ping...', 'info');
              try {
                const ai = new GoogleGenAI({ apiKey: API_KEY });
                const ttsResponse = await ai.models.generateContent({
                  model: "gemini-2.5-flash-preview-tts",
                  contents: [{ parts: [{ text: "System diagnostic ping. All audio modules reporting optimal performance." }] }],
                  config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
                    }
                  }
                });
                const audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (audioBase64) playAudio(audioBase64);
              } catch (e) {
                console.error(e);
                showNotification('Audio diagnostic failed.', 'warning');
              }
            }}
          />
          <MemoryCore messages={messages} user={user} onNotify={showNotification} />
        </div>

        {/* Center Panel: Main Terminal */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-[#0a0a12]/80 backdrop-blur-md border border-[#333] rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          <div className="p-3 border-b border-[#333] bg-[#111]/80 backdrop-blur-md flex items-center gap-2 shrink-0">
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
                    <div className="bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 p-3 rounded-lg rounded-tr-none shadow-[0_0_10px_rgba(0,240,255,0.1)] flex flex-col gap-2">
                      {msg.attachmentUrl && (
                        <img src={msg.attachmentUrl} alt="Upload" className="max-w-xs rounded border border-cyan-400/30" />
                      )}
                      {msg.content}
                    </div>
                  ) : (
                    <div className="text-gray-200 markdown-body">
                      {msg.pcBuild && <PCBuildCard build={msg.pcBuild} />}
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

          <div className="p-4 border-t border-[#333] bg-[#0d0d14]/90 backdrop-blur-md shrink-0 flex flex-col gap-2">
            {attachment && (
              <div className="flex items-center gap-2 bg-[#1a1a24] border border-cyan-400/30 rounded p-2 w-max">
                <ImageIcon size={14} className="text-cyan-400" />
                <span className="text-xs text-cyan-400 font-mono">Image Attached</span>
                <button onClick={() => setAttachment(null)} className="text-gray-400 hover:text-pink-500 ml-2">
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg border border-[#333] bg-[#1a1a24] text-gray-400 hover:text-cyan-400 hover:border-cyan-400/50 transition-colors flex items-center justify-center"
                title="Attach Image"
              >
                <Paperclip size={18} />
              </button>
              <button 
                onClick={toggleListening}
                className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${isListening ? 'bg-pink-500/20 border-pink-500 text-pink-500 animate-pulse' : 'bg-[#1a1a24] border-[#333] text-gray-400 hover:text-cyan-400 hover:border-cyan-400/50'}`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Enter command directive..."
                className="flex-1 bg-[#1a1a24] border border-[#333] rounded-lg px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
                disabled={isLoading}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !attachment)}
                className="bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-400/50 rounded-lg px-4 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,240,255,0.1)]"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: The Forge (Code Execution) */}
        <div className="hidden md:flex lg:col-span-4 flex-col min-h-0 border border-[#333] rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          <TheForge code={latestExecution?.code} result={latestExecution?.result} />
        </div>
      </div>
    </div>
  );
}

function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-screen bg-[#05050a] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <div className="scanlines z-20 pointer-events-none" />
      
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40">
        <Globe />
      </div>

      <div className="z-10 flex flex-col items-center gap-8 bg-[#0a0a12]/60 p-12 rounded-2xl backdrop-blur-md border border-[#333] shadow-[0_0_30px_rgba(0,240,255,0.1)]">
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck className="text-cyan-400 w-16 h-16 mb-4" style={{ filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.5))' }} />
          <h1 className="font-mono text-4xl md:text-6xl text-cyan-400 tracking-[0.2em] uppercase text-center" style={{ textShadow: '0 0 20px rgba(0,240,255,0.4)' }}>
            Jarvis
          </h1>
          <p className="font-mono text-gray-400 tracking-widest text-sm md:text-base mt-2">GLOBAL INTELLIGENCE NETWORK</p>
        </div>

        <button 
          onClick={onEnter}
          className="group relative px-8 py-4 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-400/50 rounded-lg font-mono tracking-widest transition-all duration-300 overflow-hidden flex items-center gap-3"
        >
          <span className="relative z-10">INITIALIZE HUD</span>
          <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          <div className="absolute inset-0 bg-cyan-400/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        </button>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState<'landing' | 'hud'>('landing');

  return (
    <AnimatePresence mode="wait">
      {view === 'landing' ? (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5 }}>
          <LandingPage onEnter={() => setView('hud')} />
        </motion.div>
      ) : (
        <motion.div key="hud" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="h-screen">
          <HUD onExit={() => setView('landing')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
