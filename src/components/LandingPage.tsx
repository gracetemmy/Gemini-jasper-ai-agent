import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Zap, Shield, Cpu } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onDocs: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onDocs }) => {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="py-20 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
            <Sparkles className="w-3 h-3" />
            Jasper's Live AI agent
          </div>
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 tracking-tighter">
            Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Jasper.</span>
          </h1>
          <p className="text-zinc-400 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Experience the next generation of real-time interaction. Jasper isn't just an AI; he's a conversational partner who hears, understands, and responds instantly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStart}
              className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 overflow-hidden w-full sm:w-auto justify-center"
            >
              <span className="relative z-10">Talk to Jasper</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={onDocs}
              className="px-8 py-4 bg-zinc-900 text-white rounded-full font-bold text-lg border border-zinc-800 hover:bg-zinc-800 transition-all w-full sm:w-auto"
            >
              Read Docs
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 w-full max-w-6xl px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: <Zap className="w-6 h-6 text-amber-400" />,
            title: "Zero Latency",
            description: "Powered by advanced technology for near-instant voice responses."
          },
          {
            icon: <Cpu className="w-6 h-6 text-indigo-400" />,
            title: "Advanced Reasoning",
            description: "Jasper handles complex queries with sophisticated logic and wit."
          },
          {
            icon: <Shield className="w-6 h-6 text-emerald-400" />,
            title: "Secure & Private",
            description: "Built with privacy-first architecture for Jasper's Live AI agent."
          }
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6">
              {feature.icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
            <p className="text-zinc-500 leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
};
