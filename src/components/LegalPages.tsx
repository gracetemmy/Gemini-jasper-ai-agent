import React from 'react';
import { motion } from 'motion/react';
import { Book, Shield, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface PageProps {
  onBack: () => void;
}

export const Documentation: React.FC<PageProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </button>

      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
          <Book className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
          <p className="text-zinc-500">Everything you need to know about Jasper AI.</p>
        </div>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">Getting Started</h2>
          <p className="text-zinc-400 leading-relaxed mb-4">
            Jasper is a next-generation AI agent built using the Gemini Live API. Unlike traditional chatbots, Jasper interacts in real-time using audio and vision, allowing for a more human-like experience.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Connect your microphone for voice interaction",
              "Enable camera for vision-based tutoring",
              "Speak naturally without waiting for turns",
              "Interrupt Jasper at any time"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm text-zinc-300">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-white">Core Features</h2>
          <div className="space-y-6">
            <div className="p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800">
              <h3 className="text-lg font-medium text-indigo-400 mb-2">Real-time Translation</h3>
              <p className="text-zinc-400 text-sm">Jasper can translate conversations on the fly. Simply say "Jasper, translate this conversation to Spanish" and he will switch modes instantly.</p>
            </div>
            <div className="p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800">
              <h3 className="text-lg font-medium text-emerald-400 mb-2">Vision-Enabled Tutoring</h3>
              <p className="text-zinc-400 text-sm">By enabling your camera, Jasper can "see" your screen or physical documents. He can help solve math problems, explain diagrams, or proofread handwritten notes.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export const PrivacyPolicy: React.FC<PageProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </button>

      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
          <Shield className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-zinc-500">How we handle your data and privacy.</p>
        </div>
      </div>

      <div className="prose prose-invert max-w-none text-zinc-400 space-y-6">
        <p>Last Updated: March 14, 2026</p>
        <h2 className="text-white">1. Data Collection</h2>
        <p>Jasper AI processes audio and video data in real-time to provide its services. This data is streamed directly to Google's Gemini API for processing. We do not store your raw audio or video recordings on our servers.</p>
        
        <h2 className="text-white">2. Use of Information</h2>
        <p>The information processed is used solely to generate AI responses and improve the interaction quality. We do not sell your data to third parties.</p>

        <h2 className="text-white">3. Security</h2>
        <p>We implement industry-standard security measures to protect your data during transmission. All connections are encrypted via SSL/TLS.</p>
      </div>
    </div>
  );
};

export const TermsOfService: React.FC<PageProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </button>

      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 rounded-2xl bg-zinc-500/10 flex items-center justify-center border border-zinc-500/20">
          <FileText className="w-6 h-6 text-zinc-400" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-zinc-500">The rules for using Jasper AI.</p>
        </div>
      </div>

      <div className="prose prose-invert max-w-none text-zinc-400 space-y-6">
        <h2 className="text-white">1. Acceptance of Terms</h2>
        <p>By accessing Jasper AI, you agree to be bound by these terms. If you do not agree, please do not use the service.</p>

        <h2 className="text-white">2. Use License</h2>
        <p>Permission is granted to temporarily use Jasper AI for personal, non-commercial transitory viewing only.</p>

        <h2 className="text-white">3. Disclaimer</h2>
        <p>Jasper AI is provided "as is". We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability.</p>
      </div>
    </div>
  );
};
