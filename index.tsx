/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import React, { useState, useEffect, useRef } from 'react';

// Advanced, high-performance syntax highlighting tokenizer for JARVIS theme
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightTokens(code: string, lang?: string): string {
  const normalizedLang = (lang || 'txt').toLowerCase();
  
  if (normalizedLang === 'txt' || normalizedLang === 'text' || normalizedLang === 'markdown' || normalizedLang === 'md') {
    return escapeHtml(code);
  }

  // Token regex patterns optimized for JavaScript, TypeScript, Python, JSON, HTML, Bash
  const tokenRegex = new RegExp(
    [
      // Comments (group 1)
      "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#[^\\n]*)",
      // Strings (group 2)
      "(\"(?:\\\\.|[^\"\\n])*\"|'(?:\\\\.|[^'\\n])*'|`(?:\\\\.|[^`])*`)",
      // Keywords & Booleans/Special (group 3)
      "\\b(const|let|var|function|return|import|export|from|class|default|extends|if|else|for|while|try|catch|finally|async|await|def|print|as|in|with|self|lambda|and|or|not|elif|pass|break|continue|yield|true|false|null|undefined|void)\\b",
      // Function execution/declaration names (group 4)
      "\\b(\\w+)(?=\\s*\\()",
      // Numbers (group 5)
      "\\b(\\d+(?:\\.\\d+)?)\\b",
      // Typenames/Objects/Capitalized things (group 6)
      "\\b([A-Z]\\w*)\\b"
    ].join('|'),
    'g'
  );

  let match;
  let lastIndex = 0;
  let resultHtml = '';

  while ((match = tokenRegex.exec(code)) !== null) {
    // Text before match
    const before = code.substring(lastIndex, match.index);
    resultHtml += escapeHtml(before);

    const [lex, comment, stringVal, keyword, funcCall, num, typeName] = match;

    if (comment !== undefined) {
      resultHtml += `<span class="text-gray-500 italic font-mono">${escapeHtml(comment)}</span>`;
    } else if (stringVal !== undefined) {
      resultHtml += `<span class="text-yellow-400/90 font-medium font-mono">${escapeHtml(stringVal)}</span>`;
    } else if (keyword !== undefined) {
      const isBoolOrSpecial = ['true', 'false', 'null', 'undefined'].includes(keyword);
      const colorClass = isBoolOrSpecial ? 'text-pink-400 font-bold font-mono' : 'text-pink-500 font-semibold font-mono';
      resultHtml += `<span class="${colorClass}">${escapeHtml(keyword)}</span>`;
    } else if (funcCall !== undefined) {
      resultHtml += `<span class="text-cyan-300 font-medium font-mono">${escapeHtml(funcCall)}</span>`;
    } else if (num !== undefined) {
      resultHtml += `<span class="text-purple-400 font-semibold font-mono">${escapeHtml(num)}</span>`;
    } else if (typeName !== undefined) {
      resultHtml += `<span class="text-amber-300 font-medium font-mono">${escapeHtml(typeName)}</span>`;
    } else {
      resultHtml += escapeHtml(lex);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // Remainder
  const remaining = code.substring(lastIndex);
  resultHtml += escapeHtml(remaining);

  return resultHtml;
}

// Inject custom renderer with COPY buttons and syntax highlighting into marked v15
marked.use({
  renderer: {
    code(codeObj: any) {
      const text = codeObj.text || '';
      const lang = codeObj.lang || '';
      const highlighted = highlightTokens(text, lang);
      return `
        <div class="my-4 border border-[#333] rounded-lg bg-[#05050a]/95 overflow-hidden shadow-2xl group flex flex-col">
          <div class="px-4 py-2 bg-[#111]/90 border-b border-[#222] flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-wider font-mono">
            <span class="flex items-center gap-1.5 font-bold tracking-widest text-[#888]">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              ${lang || 'CODE'}
            </span>
            <button 
              onclick="navigator.clipboard.writeText(this.getAttribute('data-code')).then(() => { 
                const s = this.textContent; 
                this.textContent = 'COPIED'; 
                this.style.color = '#10b981';
                setTimeout(() => { this.textContent = s; this.style.color = ''; }, 2000); 
              })" 
              data-code="${escapeHtml(text)}"
              class="hover:text-cyan-400 px-2.5 py-1 rounded border border-[#222] bg-[#0c0c14] transition-all cursor-pointer hover:border-cyan-400/30 font-bold active:scale-[0.98]"
            >
              COPY
            </button>
          </div>
          <pre class="p-4 overflow-x-auto text-xs font-mono leading-relaxed bg-[#05050a] text-gray-300"><code class="language-${lang}">${highlighted}</code></pre>
        </div>
      `;
    }
  }
});

import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { Activity, SquareTerminal, Volume2, VolumeX, ShieldCheck, Send, Terminal, Mic, MicOff, Paperclip, X, Image as ImageIcon, Database, ArrowRight, Bell, Cpu, MousePointer2, Zap, LayoutGrid, Server, Wrench, Paintbrush, ListTodo, Plus, Trash2, Play, AlertTriangle, Save, Sparkles, Check } from 'lucide-react';
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
);

const SystemStatusPanel = ({ isLoading, currentBuildVram = 0 }: { isLoading: boolean; currentBuildVram?: number }) => {
  const [latency, setLatency] = useState(18);
  const [dbLatency, setDbLatency] = useState(38);
  const [gpuLoad, setGpuLoad] = useState(24);
  const [gpuTemp, setGpuTemp] = useState(51);
  const [vramUsage, setVramUsage] = useState(12.4);

  useEffect(() => {
    const latencyInterval = setInterval(() => {
      setLatency(prev => {
        const base = isLoading ? 45 : 18;
        const fluct = Math.floor(Math.random() * 8) - 4;
        return Math.max(10, base + fluct);
      });
      setDbLatency(prev => {
        const base = isLoading ? 70 : 38;
        const fluct = Math.floor(Math.random() * 12) - 6;
        return Math.max(25, base + fluct);
      });
    }, 1500);

    return () => clearInterval(latencyInterval);
  }, [isLoading]);

  useEffect(() => {
    const gpuInterval = setInterval(() => {
      setGpuLoad(prev => {
        if (isLoading) {
          const target = 82 + Math.floor(Math.random() * 12);
          return Math.min(99, target);
        } else {
          const target = 18 + Math.floor(Math.random() * 10);
          return Math.max(8, target);
        }
      });

      setGpuTemp(prev => {
        if (isLoading) {
          return Math.min(79, prev + Number((Math.random() * 1.8).toFixed(1)));
        } else {
          if (prev > 54) {
            return Number((prev - (Math.random() * 1.2)).toFixed(1));
          } else if (prev < 48) {
            return Number((prev + (Math.random() * 0.6)).toFixed(1));
          }
          return Number((prev + (Math.random() * 0.6 - 0.3)).toFixed(1));
        }
      });

      setVramUsage(prev => {
        const baseVram = 11.8 + (currentBuildVram || 0);
        const drift = (Math.random() * 0.15) - 0.07;
        return Number((baseVram + drift).toFixed(2));
      });
    }, 1000);

    return () => clearInterval(gpuInterval);
  }, [isLoading, currentBuildVram]);

  const getTempColor = (temp: number) => {
    if (temp > 72) return 'text-red-500 font-bold';
    if (temp > 62) return 'text-yellow-500';
    return 'text-green-400';
  };

  const getLoadColor = (load: number) => {
    if (load > 80) return 'text-red-500 font-bold animate-pulse';
    if (load > 50) return 'text-yellow-500';
    return 'text-cyan-400';
  };

  return (
    <div className="bg-[#0a0a12]/80 backdrop-blur-md border border-[#333] rounded-xl p-4 flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.5)]">
      <h2 className="font-mono text-xs text-gray-400 mb-3 flex items-center gap-2 tracking-wider">
        <Server size={14} className="text-cyan-400 animate-pulse" />
        DIAGNOSTIC STATUS
      </h2>
      <div className="flex flex-col gap-3 font-mono text-xs">
        {/* Network section */}
        <div className="border-b border-[#222]/80 pb-2 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            <span>Gateway Traffic</span>
            <span className="text-green-400 text-[9px] px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 rounded">SECURE</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Hub Ping Latency</span>
            <span className="text-cyan-400 tracking-wider">{latency} ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Live DB Synclink</span>
            <span className="text-pink-500 tracking-wider">{dbLatency} ms</span>
          </div>
        </div>

        {/* Model Connectivity section */}
        <div className="border-b border-[#222]/80 pb-2 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            <span>AI Model Pipeline</span>
            <span className="text-cyan-400 text-[9px] px-1.5 py-0.5 bg-cyan-400/10 border border-cyan-400/20 rounded font-normal">CONNECTED</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">TTS Audio Output</span>
            <span className="text-green-450 text-[10px] text-green-400/90 font-bold">READY</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Cognitive Core Link</span>
            <span className="text-cyan-400/90 font-bold">{API_KEY ? 'SECURE_GATE' : 'CONNECTED_LOCAL'}</span>
          </div>
        </div>

        {/* GPU resources section */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            <span>Grid Virtual GPU (vGPU)</span>
            <span className="text-yellow-400 text-[9px] px-1.5 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded">COMPUTE</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-black/40 p-2 rounded border border-[#222] flex flex-col gap-1">
              <span className="text-gray-500 text-[9px] uppercase">vGPU Core Load</span>
              <span className={`font-bold tracking-wider ${getLoadColor(gpuLoad)}`}>{gpuLoad}%</span>
              <div className="w-full bg-[#1e1e1e] h-1 rounded overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${gpuLoad > 80 ? 'bg-red-500' : gpuLoad > 50 ? 'bg-yellow-500' : 'bg-cyan-400'}`} 
                  style={{ width: `${gpuLoad}%` }} 
                />
              </div>
            </div>
            <div className="bg-black/40 p-2 rounded border border-[#222] flex flex-col gap-1">
              <span className="text-gray-500 text-[9px] uppercase">Core Thermal</span>
              <span className={`font-bold tracking-wider ${getTempColor(gpuTemp)}`}>{gpuTemp}°C</span>
              <div className="w-full bg-[#1e1e1e] h-1 rounded overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${gpuTemp > 72 ? 'bg-red-500' : gpuTemp > 62 ? 'bg-yellow-500' : 'bg-green-400'}`} 
                  style={{ width: `${Math.max(5, Math.min(100, (gpuTemp - 30) / 60 * 100))}%` }} 
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-gray-300">VRAM Buffer Allocation</span>
              <span className="text-pink-400 font-bold tracking-wider">{vramUsage} / 24.00 GB</span>
            </div>
            <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-[#222] p-[1px]">
              <div 
                className="bg-gradient-to-r from-pink-500 to-pink-400 h-full rounded-full transition-all duration-700" 
                style={{ width: `${(vramUsage / 24) * 100}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

const WorkshopPanel = ({ onNotify }: { onNotify: (msg: string, type: 'info'|'success'|'warning') => void }) => {
  const [subroutines, setSubroutines] = useState<any[]>([
    { id: '1', name: 'Alpha Firewall Matrix', type: 'DEFENSE MATRIX', power: 'ARC REACTOR', vram: 18, freq: 3.2, date: '05/06/2026', ops: '57.6 TFLOPs' },
    { id: '2', name: 'Neural Sensory Link', type: 'COGNITIVE GATE', power: 'SUB-QUANTUM', vram: 12, freq: 4.0, date: '05/06/2026', ops: '48.0 TFLOPs' }
  ]);

  const [name, setName] = useState('DELTA_VECTOR_X');
  const [type, setType] = useState('DEFENSE MATRIX');
  const [power, setPower] = useState('ARC REACTOR');
  const [vram, setVram] = useState(16);
  const [freq, setFreq] = useState(3.5);
  const [progress, setProgress] = useState(-1);
  const [log, setLog] = useState<string[]>([]);

  const calculatedOps = (vram * freq).toFixed(1);

  const startCompilation = () => {
    if (!name.trim()) {
      onNotify('Subroutine identifier is invalid.', 'warning');
      return;
    }
    setProgress(0);
    setLog(['SYS_INIT // BOOTSTRAPPING RECONSTRUCTORS...']);

    const steps = [
      { prg: 20, msg: 'BUS CHANNEL ALLOCATION... [OK]' },
      { prg: 45, msg: `MEMORY MAPPING VRAM CORRIDORS: ${vram}GB ASSIGNED...` },
      { prg: 70, msg: `QUANTUM SPIN ROTORS LOCKED AT ${freq}GHz IN PHASE...` },
      { prg: 90, msg: `ENFORCING PROTOCOLS: TYPE=${type} POWER=${power}...` },
      { prg: 100, msg: 'COMPILATION SEQUENCE COMPLETED SUCCESSFULLY.' }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setProgress(step.prg);
        setLog(prev => [...prev, step.msg]);

        if (step.prg === 100) {
          setTimeout(() => {
            const newSub = {
              id: Date.now().toString(),
              name: name.trim().toUpperCase(),
              type,
              power,
              vram,
              freq,
              date: new Date().toLocaleDateString('en-GB'),
              ops: `${calculatedOps} TFLOPs`
            };
            setSubroutines(prev => [newSub, ...prev]);
            setProgress(-1);
            setLog([]);
            onNotify(`Core Module "${newSub.name}" Compiled & Registered.`, 'success');
          }, 600);
        }
      }, (idx + 1) * 350);
    });
  };

  const removeSubroutine = (id: string) => {
    setSubroutines(prev => prev.filter(s => s.id !== id));
    onNotify('Subroutine scrubbed from logical arrays.', 'info');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a12]/50 p-4 font-mono text-xs overflow-y-auto">
      <div className="border border-cyan-400/20 bg-cyan-400/5 p-3 rounded-xl mb-4 flex flex-col gap-3 relative">
        <div className="flex justify-between items-center">
          <span className="text-cyan-400 font-bold tracking-widest text-[10px] uppercase">🛠️ COMPILER WORKBENCH</span>
          <span className="text-pink-500 font-bold text-[8px] border border-pink-500/20 px-1 py-0.5 rounded bg-pink-500/5 uppercase">STATIC CODES</span>
        </div>

        {progress !== -1 ? (
          <div className="flex flex-col gap-2 py-4">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-cyan-400 animate-pulse font-bold">COMPILING SUB-CORE: {name}</span>
              <span className="text-cyan-400 font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-[#111] h-2 rounded border border-[#222] p-[1px]">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-pink-500 h-full rounded transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="bg-black/60 p-2 rounded border border-[#222] text-[9px] text-gray-400 min-h-[50px] font-mono whitespace-pre-line leading-relaxed">
              {log.join('\n')}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 text-[9px] uppercase">Logical Identifier</span>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value.replace(/\s+/g, '_'))}
                className="bg-black/50 border border-[#222] focus:border-cyan-400 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 text-[9px] uppercase">Symmetric Type</span>
                <select 
                  value={type} 
                  onChange={e => setType(e.target.value)}
                  className="bg-black/50 border border-[#222] focus:border-cyan-400 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
                >
                  <option>DEFENSE MATRIX</option>
                  <option>COGNITIVE GATE</option>
                  <option>TACTICAL VECTOR</option>
                  <option>RESONANCE CORE</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 text-[9px] uppercase">Power Gateway</span>
                <select 
                  value={power} 
                  onChange={e => setPower(e.target.value)}
                  className="bg-black/50 border border-[#222] focus:border-cyan-400 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
                >
                  <option>ARC REACTOR</option>
                  <option>SUB-QUANTUM</option>
                  <option>GRID DIRECT</option>
                  <option>SOLAR CELLS</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] uppercase">
                <span className="text-gray-500">Buffer Allocation</span>
                <span className="text-cyan-400 font-bold">{vram} GB VRAM</span>
              </div>
              <input 
                type="range" 
                min="4" 
                max="24" 
                value={vram} 
                onChange={e => setVram(parseInt(e.target.value))}
                className="w-full accent-cyan-400 bg-[#1e1e24] h-1 rounded cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] uppercase">
                <span className="text-gray-500">Compute Speed Range</span>
                <span className="text-pink-400 font-bold">{freq} GHz</span>
              </div>
              <input 
                type="range" 
                min="1.0" 
                max="6.0" 
                step="0.1" 
                value={freq} 
                onChange={e => setFreq(parseFloat(e.target.value))}
                className="w-full accent-pink-500 bg-[#1e1e24] h-1 rounded cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center text-[10px] border-t border-[#222] pt-2 mt-1">
              <span className="text-gray-400">Yield Potential:</span>
              <span className="text-gray-200 font-bold">{calculatedOps} TFLOPs</span>
            </div>

            <button 
              onClick={startCompilation}
              className="text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 hover:bg-cyan-400/20 active:scale-[0.98] transition-all px-3 py-2 rounded-lg font-bold tracking-wider mt-1 flex justify-center items-center gap-1.5 cursor-pointer uppercase"
            >
              <Cpu size={14} className="animate-pulse" />
              Compile Subroutine Core
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <h3 className="text-gray-500 uppercase text-[9px] tracking-wider font-bold">ACTIVE REGISTRY ARRAY ({subroutines.length})</h3>
        <div className="flex flex-col gap-2">
          {subroutines.map(sub => (
            <div key={sub.id} className="bg-black/40 border border-[#222]/80 p-2 rounded-lg hover:border-cyan-400/30 transition-colors flex justify-between items-start group">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold tracking-wider text-[11px] truncate">{sub.name}</span>
                  <span className="text-[7px] text-[#666]">{sub.date}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[8px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1 rounded uppercase">{sub.type}</span>
                  <span className="text-[8px] bg-[#222] text-gray-400 px-1 rounded">{sub.power}</span>
                  <span className="text-[8px] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1 rounded font-bold">{sub.ops}</span>
                </div>
              </div>
              <button 
                onClick={() => removeSubroutine(sub.id)}
                className="text-gray-500 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                title="De-register"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DrawingBoardPanel = ({ onNotify }: { onNotify: (msg: string, type: 'info'|'success'|'warning') => void }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'node'>('brush');
  const [color, setColor] = useState('#00f0ff');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [nodes, setNodes] = useState<{ id: string; x: number; y: number; name: string }[]>([]);
  const [links, setLinks] = useState<{ from: string; to: string }[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight - 42;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) tempCtx.drawImage(canvas, 0, 0);

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.drawImage(tempCanvas, 0, 0);
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [containerRef.current]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (tool === 'node') {
      const nodeName = `NODE_${String.fromCharCode(65 + (nodes.length % 26))}_${Math.floor(10 + Math.random() * 89)}`;
      const newNode = {
        id: Date.now().toString(),
        x: coords.x,
        y: coords.y,
        name: nodeName
      };
      setNodes(prev => [...prev, newNode]);
      onNotify(`Logic Node "${nodeName}" placed on Grid.`, 'success');
      return;
    }

    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = tool === 'eraser' ? '#05050a' : color;
      ctx.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize;
    }
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setNodes([]);
    setLinks([]);
    setSelectedNode(null);
    onNotify('Drafting array thoroughly scrubbed.', 'info');
  };

  const handleNodeClick = (nodeId: string, e: any) => {
    e.stopPropagation();
    if (selectedNode === null) {
      setSelectedNode(nodeId);
      onNotify('Source Node selected. Select target.', 'info');
    } else {
      if (selectedNode !== nodeId) {
        const exists = links.some(l => (l.from === selectedNode && l.to === nodeId) || (l.from === nodeId && l.to === selectedNode));
        if (exists) {
          setLinks(prev => prev.filter(l => !((l.from === selectedNode && l.to === nodeId) || (l.from === nodeId && l.to === selectedNode))));
          onNotify('Logical gate alignment broken.', 'info');
        } else {
          setLinks(prev => [...prev, { from: selectedNode, to: nodeId }]);
          onNotify('Logical gate vector linked.', 'success');
        }
      }
      setSelectedNode(null);
    }
  };

  const exportCanvas = () => {
    onNotify('Exporting grid vector blueprint...', 'info');
    setTimeout(() => {
      onNotify('Blueprint snap stored inside buffer arrays.', 'success');
    }, 800);
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 bg-[#05050a] h-full relative font-mono text-xs select-none">
      <div className="px-3 py-1.5 border-b border-[#222] bg-[#0c0c14] flex justify-between items-center gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setTool('brush')}
            className={`px-2 py-0.5 border rounded shrink-0 transition-all font-bold tracking-tighter ${tool === 'brush' ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10' : 'border-[#333] text-gray-500 hover:text-white'}`}
          >
            SKETCH
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={`px-2 py-0.5 border rounded shrink-0 transition-all font-bold tracking-tighter ${tool === 'eraser' ? 'border-pink-500 text-pink-500 bg-pink-500/10' : 'border-[#333] text-gray-500 hover:text-white'}`}
          >
            ERASE
          </button>
          <button 
            onClick={() => setTool('node')}
            className={`px-2 py-0.5 border rounded shrink-0 transition-all font-bold tracking-tighter ${tool === 'node' ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10' : 'border-[#333] text-gray-500 hover:text-white'}`}
          >
            +NODE
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[10px]">
          {tool !== 'eraser' && tool !== 'node' && (
            <div className="flex gap-1.5">
              {['#00f0ff', '#ec4899', '#facc15', '#ffffff'].map(c => (
                <button 
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-3.5 h-3.5 rounded-full border border-black cursor-pointer transition-transform ${color === c ? 'scale-125 shadow-[0_0_8px_rgba(0,240,255,0.4)]' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          <button onClick={clearBoard} className="text-gray-500 hover:text-pink-500 uppercase font-bold tracking-tighter cursor-pointer">
            wipe
          </button>
          <button onClick={exportCanvas} className="text-cyan-400 hover:text-white uppercase font-bold tracking-tighter cursor-pointer">
            snap
          </button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0 bg-[#05050a] cursor-crosshair overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-15 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }} />

        <canvas 
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 z-10 w-full h-full"
        />

        <svg className="absolute inset-0 z-20 pointer-events-none w-full h-full">
          {links.map((link, idx) => {
            const nodeA = nodes.find(n => n.id === link.from);
            const nodeB = nodes.find(n => n.id === link.to);
            if (!nodeA || !nodeB) return null;
            return (
              <motion.line 
                key={idx}
                x1={nodeA.x}
                y1={nodeA.y}
                x2={nodeB.x}
                y2={nodeB.y}
                stroke="#00f0ff"
                strokeWidth="1.5"
                strokeDasharray="4, 4"
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 5, ease: 'linear', repeat: Infinity }}
              />
            );
          })}
        </svg>

        {nodes.map(node => (
          <div 
            key={node.id}
            onClick={(e) => handleNodeClick(node.id, e)}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex flex-col items-center group touch-none"
            style={{ left: node.x, top: node.y }}
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedNode === node.id ? 'border-pink-500 bg-pink-500/20 scale-110 shadow-[0_0_12px_rgba(236,72,153,0.6)]' : 'border-yellow-400 bg-black hover:scale-105 hover:border-cyan-400'}`}>
              <div className={`w-2 h-2 rounded-full ${selectedNode === node.id ? 'bg-pink-500' : 'bg-yellow-400 group-hover:bg-cyan-400'}`} />
            </div>
            <span className={`text-[8px] px-1 py-0.5 rounded border border-[#333] bg-[#0c0c14]/90 text-gray-400 pointer-events-none mt-1 font-mono group-hover:text-cyan-300 group-hover:border-cyan-400/30 ${selectedNode === node.id ? 'border-pink-500 text-pink-400' : ''}`}>
              {node.name}
            </span>
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="absolute inset-x-4 top-1/3 text-center text-gray-600 italic pointer-events-none font-mono">
            DRAFT BOARD DISENGAGED.<br/>
            <span className="text-[10px] text-cyan-400/50 mt-1 block">Toggle [+NODE] to map alignments or draw directly.</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectManagerPanel = ({ onNotify }: { onNotify: (msg: string, type: 'info'|'success'|'warning') => void }) => {
  const [projects, setProjects] = useState<any[]>([
    { 
      id: '1', 
      title: 'PROJECT MARK-XLV', 
      priority: 'CRITICAL', 
      cpu: 35, 
      vram: 8, 
      state: 'COMPILING',
      tasks: [
        { id: 't1', text: 'Seal cooling sub-baffles', done: true },
        { id: 't2', text: 'Calibrate central core links', done: true },
        { id: 't3', text: 'Enforce gateway routing', done: false }
      ]
    },
    { 
      id: '2', 
      title: 'NEST CLOUD CORRIDOR', 
      priority: 'HIGH', 
      cpu: 25, 
      vram: 6, 
      state: 'STABLE',
      tasks: [
        { id: 't4', text: 'Deploy Spanner indices', done: true },
        { id: 't5', text: 'Secure remote socket logs', done: false }
      ]
    }
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('STANDARD');
  const [newCpu, setNewCpu] = useState(20);
  const [newVram, setNewVram] = useState(4);
  const [newTaskTexts, setNewTaskTexts] = useState<{[key: string]: string}>({});

  const totalCpuAllocated = projects.reduce((sum, p) => sum + p.cpu, 0);
  const totalVramAllocated = projects.reduce((sum, p) => sum + p.vram, 0);
  const isOverloaded = totalCpuAllocated > 100 || totalVramAllocated > 24;

  const createProject = () => {
    if (!newTitle.trim()) {
      onNotify('Configure a valid protocol title.', 'warning');
      return;
    }
    const newProj = {
      id: Date.now().toString(),
      title: newTitle.trim().toUpperCase(),
      priority: newPriority,
      cpu: newCpu,
      vram: newVram,
      state: 'INITIALIZED',
      tasks: []
    };
    setProjects(prev => [...prev, newProj]);
    setNewTitle('');
    onNotify(`Project protocol "${newProj.title}" online.`, 'success');
  };

  const removeProject = (id: string, name: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    onNotify(`Project protocol "${name}" archived.`, 'info');
  };

  const toggleTask = (projId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projId) return p;
      return {
        ...p,
        tasks: p.tasks.map((t: any) => t.id === taskId ? { ...t, done: !t.done } : t)
      };
    }));
  };

  const addTask = (projId: string) => {
    const text = newTaskTexts[projId] || '';
    if (!text.trim()) return;

    setProjects(prev => prev.map(p => {
      if (p.id !== projId) return p;
      return {
        ...p,
        tasks: [...p.tasks, { id: Date.now().toString(), text: text.trim(), done: false }]
      };
    }));

    setNewTaskTexts(prev => ({ ...prev, [projId]: '' }));
    onNotify('Milestone task added to registry.', 'info');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a12]/50 p-4 font-mono text-xs overflow-y-auto">
      {isOverloaded && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-xl mb-4 font-bold tracking-tight animate-pulse flex items-center gap-2 text-[10px]">
          <AlertTriangle size={14} className="shrink-0" />
          <div>
            CRITICAL THROTTLING DEPLOYED: COMPUTE CONGESTION
            <div className="text-[9px] font-normal text-red-500/80 mt-0.5">
              Allocated resources exceed grid hardware capacity. Archiving old pipelines recommended.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4 bg-black/50 border border-[#222] p-2.5 rounded-xl text-[10px]">
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 uppercase">Core Load Allocation</span>
          <span className={`font-bold ${totalCpuAllocated > 100 ? 'text-red-500' : 'text-cyan-400'}`}>{totalCpuAllocated}% CPU load</span>
          <div className="w-full bg-[#111] h-1.5 rounded overflow-hidden p-[1px] border border-[#222]">
            <div 
              className={`h-full rounded ${totalCpuAllocated > 100 ? 'bg-red-500' : 'bg-cyan-400'}`}
              style={{ width: `${Math.min(100, totalCpuAllocated)}%` }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 border-l border-[#222] pl-2">
          <span className="text-gray-500 uppercase font-mono">VRAM Allocated</span>
          <span className={`font-bold ${totalVramAllocated > 24 ? 'text-red-500' : 'text-pink-400'}`}>{totalVramAllocated} / 24 GB</span>
          <div className="w-full bg-[#111] h-1.5 rounded overflow-hidden p-[1px] border border-[#222]">
            <div 
              className={`h-full rounded ${totalVramAllocated > 24 ? 'bg-red-500' : 'bg-pink-400'}`}
              style={{ width: `${Math.min(100, (totalVramAllocated / 24) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="border border-cyan-400/20 bg-cyan-400/5 p-3 rounded-xl mb-4 flex flex-col gap-2.5">
        <span className="text-cyan-400 font-bold tracking-wider text-[10px] uppercase">📋 LINK NEW SCHEMATIC</span>
        
        <div className="flex flex-col gap-1">
          <span className="text-gray-500 text-[9px] uppercase">Symmetric Core Name</span>
          <input 
            type="text" 
            placeholder="e.g. PROJECT OUTRIDER"
            value={newTitle} 
            onChange={e => setNewTitle(e.target.value)}
            className="bg-black/50 border border-[#222] focus:border-cyan-400 text-white rounded px-2.5 py-1 text-xs focus:outline-none placeholder-gray-600"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col col-span-1 gap-1">
            <span className="text-gray-500 text-[9px] uppercase">Priority</span>
            <select 
              value={newPriority} 
              onChange={e => setNewPriority(e.target.value)}
              className="bg-black/50 border border-[#222] focus:border-cyan-400 text-white rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option>STANDARD</option>
              <option>HIGH</option>
              <option>CRITICAL</option>
            </select>
          </div>
          <div className="flex flex-col col-span-1 gap-1">
            <span className="text-gray-500 text-[9px] uppercase">CPU Load %</span>
            <input 
              type="number" 
              min="5" 
              max="100" 
              value={newCpu} 
              onChange={e => setNewCpu(Math.max(5, parseInt(e.target.value) || 0))}
              className="bg-black/50 border border-[#222] focus:border-cyan-400 text-white rounded px-2 py-1 text-xs focus:outline-none"
            />
          </div>
          <div className="flex flex-col col-span-1 gap-1">
            <span className="text-gray-500 text-[9px] uppercase">VRAM (GB)</span>
            <input 
              type="number" 
              min="1" 
              max="24" 
              value={newVram} 
              onChange={e => setNewVram(Math.max(1, parseInt(e.target.value) || 0))}
              className="bg-black/50 border border-[#222] focus:border-cyan-400 text-white rounded px-2 py-1 text-xs focus:outline-none"
            />
          </div>
        </div>

        <button 
          onClick={createProject}
          className="bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-400/50 py-1.5 rounded font-bold uppercase transition-all tracking-wider flex items-center justify-center gap-1 mt-1 cursor-pointer"
        >
          <Plus size={12} />
          Create Protocol
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-gray-500 uppercase text-[9px] tracking-wider font-bold">ACTIVE WORKSPACE PROJECTS</h3>
        <div className="flex flex-col gap-3">
          {projects.map(proj => {
            const completedCount = proj.tasks?.length ? proj.tasks.filter((t: any) => t.done).length : 0;
            const progressPct = proj.tasks?.length ? Math.round((completedCount / proj.tasks.length) * 100) : 0;
            const prioColor = proj.priority === 'CRITICAL' ? 'text-red-500 font-bold border-red-500/20 bg-red-500/5' : proj.priority === 'HIGH' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' : 'text-gray-400 border-[#222] bg-[#111]';

            return (
              <div key={proj.id} className="bg-black/40 border border-[#222]/90 rounded-xl p-3 flex flex-col gap-2 hover:border-cyan-400/20 transition-all relative">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-cyan-400 font-semibold tracking-wider text-[11px] truncate md:max-w-[200px]">{proj.title}</span>
                    <span className={`text-[8px] uppercase px-1 py-0.5 border rounded w-max mt-1 font-bold ${prioColor}`}>{proj.priority}</span>
                  </div>
                  <button 
                    onClick={() => removeProject(proj.id, proj.title)}
                    className="text-gray-500 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>

                <div className="flex flex-col gap-1 text-[9px] mt-1">
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Task Progression:</span>
                    <span className="text-gray-300 font-bold">{progressPct}% ({completedCount}/{proj.tasks?.length || 0})</span>
                  </div>
                  <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden p-[1px] border border-[#222]">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all duration-500`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-[#222] text-[9px]">
                  <span className="text-gray-500 uppercase tracking-widest font-bold">Tasks checklist</span>
                  <div className="flex flex-col gap-1">
                    {proj.tasks?.map((task: any) => (
                      <div 
                        key={task.id} 
                        onClick={() => toggleTask(proj.id, task.id)}
                        className="flex items-center gap-2 hover:text-white text-gray-400 cursor-pointer transition-colors p-1 rounded hover:bg-white/5"
                      >
                        <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center shrink-0 transition-colors ${task.done ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-[#333]'}`}>
                          {task.done && <Check size={10} />}
                        </div>
                        <span className={`truncate ${task.done ? 'line-through text-gray-600' : ''}`} title={task.text}>{task.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1.5 mt-1.5">
                    <input 
                      type="text" 
                      placeholder="Insert task details..."
                      value={newTaskTexts[proj.id] || ''}
                      onChange={e => setNewTaskTexts(prev => ({ ...prev, [proj.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addTask(proj.id)}
                      className="bg-black/60 border border-[#222] focus:border-cyan-400 text-white rounded-md px-2 py-1 text-[9px] flex-1 focus:outline-none"
                    />
                    <button 
                      onClick={() => addTask(proj.id)}
                      className="bg-[#111] text-cyan-400 hover:text-white border border-[#222] px-2 rounded-md hover:border-cyan-400/30 transition-colors text-[9px] font-bold uppercase cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const IntelligenceCore = ({ 
  code, 
  result, 
  isLoading,
  onNotify 
}: { 
  code?: string; 
  result?: string; 
  isLoading: boolean;
  onNotify: (msg: string, type: 'info'|'success'|'warning') => void;
}) => {
  const [activeTab, setActiveTab] = useState<'forge' | 'workshop' | 'drawing' | 'projects'>('forge');

  useEffect(() => {
    if (code) {
      setActiveTab('forge');
    }
  }, [code, result]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a12]/80 backdrop-blur-md overflow-hidden">
      <div className="border-b border-[#333] bg-[#111]/80 backdrop-blur-md flex items-center justify-between shrink-0 p-1.5">
        <div className="flex gap-1 flex-wrap">
          <button 
            onClick={() => setActiveTab('forge')}
            className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] tracking-tight transition-all font-bold cursor-pointer uppercase ${activeTab === 'forge' ? 'text-pink-500 bg-pink-500/10 border border-pink-500/20' : 'text-gray-500 hover:text-white hover:bg-gray-500/5'}`}
          >
            Forge
          </button>
          <button 
            onClick={() => setActiveTab('workshop')}
            className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] tracking-tight transition-all font-bold cursor-pointer uppercase ${activeTab === 'workshop' ? 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20' : 'text-gray-500 hover:text-white hover:bg-gray-500/5'}`}
          >
            Workshop
          </button>
          <button 
            onClick={() => setActiveTab('drawing')}
            className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] tracking-tight transition-all font-bold cursor-pointer uppercase ${activeTab === 'drawing' ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' : 'text-gray-500 hover:text-white hover:bg-gray-500/5'}`}
          >
            Drawing
          </button>
          <button 
            onClick={() => setActiveTab('projects')}
            className={`px-2.5 py-1.5 rounded-lg font-mono text-[10px] tracking-tight transition-all font-bold cursor-pointer uppercase ${activeTab === 'projects' ? 'text-green-400 bg-green-400/10 border border-green-400/20' : 'text-gray-500 hover:text-white hover:bg-gray-500/5'}`}
          >
            Scheduler
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2 font-mono text-[8px] text-cyan-400/50 uppercase select-none shrink-0 pr-3 font-semibold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Intel-Grid Linked
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-[#05050a]/20">
        <AnimatePresence mode="wait">
          {activeTab === 'forge' && (
            <motion.div 
              key="forge" 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="h-full"
            >
              <TheForge code={code} result={result} />
            </motion.div>
          )}

          {activeTab === 'workshop' && (
            <motion.div 
              key="workshop" 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="h-full"
            >
              <WorkshopPanel onNotify={onNotify} />
            </motion.div>
          )}

          {activeTab === 'drawing' && (
            <motion.div 
              key="drawing" 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="h-full"
            >
              <DrawingBoardPanel onNotify={onNotify} />
            </motion.div>
          )}

          {activeTab === 'projects' && (
            <motion.div 
              key="projects" 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="h-full"
            >
              <ProjectManagerPanel onNotify={onNotify} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

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
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kinetic_command_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [tempInput, setTempInput] = useState<string>('');
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
  const latestBuildMessage = [...messages].reverse().find(m => m.pcBuild);
  const currentBuildVram = latestBuildMessage?.pcBuild?.metrics?.vram_total || 0;

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
    
    if (userMsg.trim()) {
      setCommandHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1] === userMsg.trim()) {
          setHistoryIndex(-1);
          setTempInput('');
          return prev;
        }
        const updated = [...prev, userMsg.trim()].slice(-100);
        try {
          localStorage.setItem('kinetic_command_history', JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save command history to localStorage:", e);
        }
        setHistoryIndex(-1);
        setTempInput('');
        return updated;
      });
    } else {
      setHistoryIndex(-1);
      setTempInput('');
    }
    
    if (!user) {
      setMessages(prev => [...prev, { id: newMsgId, role: 'user', content: userMsg, attachmentUrl: currentAttachment?.url }]);
    } else {
      const userMsgData: any = {
        uid: user.uid,
        role: 'user',
        content: userMsg,
        createdAt: serverTimestamp()
      };
      if (currentAttachment?.url) {
        if (currentAttachment.url.length < 500000) {
           userMsgData.attachmentUrl = currentAttachment.url;
        } else {
           console.warn("Attachment too large to save to Firestore. Skipping persistence for this attachment.");
        }
      }
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
          content: textContent ? textContent.slice(0, 500000) : '',
          createdAt: serverTimestamp()
        };
        if (codeContent) aiMsg.code = codeContent.slice(0, 200000);
        if (execResult) aiMsg.result = execResult.slice(0, 200000);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      
      let nextIndex = historyIndex;
      if (historyIndex === -1) {
        // Start cycling: save what user is typing as a draft
        setTempInput(input);
        nextIndex = commandHistory.length - 1;
      } else {
        nextIndex = Math.max(0, historyIndex - 1);
      }
      setHistoryIndex(nextIndex);
      setInput(commandHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      
      let nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        // Reached end, restore draft
        setHistoryIndex(-1);
        setInput(tempInput);
        setTempInput('');
      } else {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
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
          <SystemStatusPanel isLoading={isLoading} currentBuildVram={currentBuildVram} />
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
                onKeyDown={handleKeyDown}
                placeholder="Enter command directive (↑/↓ for history)..."
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

        {/* Right Panel: Intelligence Core (Workshop, Drawing Board, Project Manager, The Forge) */}
        <div className="hidden md:flex lg:col-span-4 flex-col min-h-0 border border-[#333] rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          <IntelligenceCore 
            code={latestExecution?.code} 
            result={latestExecution?.result} 
            isLoading={isLoading}
            onNotify={showNotification}
          />
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
