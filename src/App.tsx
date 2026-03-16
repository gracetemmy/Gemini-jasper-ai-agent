import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { JasperAgent } from './components/JasperAgent';
import { Documentation, PrivacyPolicy, TermsOfService } from './components/LegalPages';
import { motion, AnimatePresence } from 'motion/react';
import { Github, Twitter, Sparkles, Cpu } from 'lucide-react';

type View = 'landing' | 'agent' | 'docs' | 'privacy' | 'terms';

export default function App() {
  const [view, setView] = useState<View>('landing');

  const Logo = () => (
    <div 
      className="flex items-center gap-2 cursor-pointer group"
      onClick={() => setView('landing')}
    >
      <div className="relative w-10 h-10 flex items-center justify-center">
        <div className="absolute inset-0 bg-indigo-600 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-300" />
        <div className="absolute inset-0 bg-zinc-900 rounded-xl -rotate-3 group-hover:-rotate-6 transition-transform duration-300 border border-zinc-800" />
        <Sparkles className="relative w-5 h-5 text-indigo-400" />
      </div>
      <div className="flex flex-col -space-y-1">
        <span className="font-black text-xl tracking-tighter text-white">JASPER</span>
        <span className="text-[10px] font-bold tracking-[0.3em] text-indigo-500 uppercase">Intelligence</span>
      </div>
    </div>
  );

  const renderView = () => {
    switch (view) {
      case 'agent':
        return <JasperAgent />;
      case 'docs':
        return <Documentation onBack={() => setView('landing')} />;
      case 'privacy':
        return <PrivacyPolicy onBack={() => setView('landing')} />;
      case 'terms':
        return <TermsOfService onBack={() => setView('landing')} />;
      default:
        return <LandingPage onStart={() => setView('agent')} onDocs={() => setView('docs')} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center bg-gradient-to-b from-black via-black/80 to-transparent backdrop-blur-sm">
        <Logo />
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6 mr-4">
            <button onClick={() => setView('docs')} className="text-sm text-zinc-400 hover:text-white transition-colors">Docs</button>
            <a href="https://x.com/grace_0001" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
          </div>
          <button 
            onClick={() => setView('agent')}
            className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:bg-indigo-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/5"
          >
            Launch Agent
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-16 px-6 bg-zinc-950/50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 flex flex-col gap-6">
            <Logo />
            <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
              The next generation of real-time AI interaction. Built for Jasper's Live AI agent, pushing the boundaries of what's possible with Gemini.
            </p>
            <div className="flex gap-4">
              <a href="https://x.com/grace_0001" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors border border-zinc-800">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://github.com/gracetemmy" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors border border-zinc-800">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-widest">Resources</h4>
            <div className="flex flex-col gap-2 text-sm text-zinc-500">
              <button onClick={() => setView('docs')} className="text-left hover:text-white transition-colors">Documentation</button>
              <button onClick={() => setView('agent')} className="text-left hover:text-white transition-colors">Live Agent</button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-widest">Legal</h4>
            <div className="flex flex-col gap-2 text-sm text-zinc-500">
              <button onClick={() => setView('privacy')} className="text-left hover:text-white transition-colors">Privacy Policy</button>
              <button onClick={() => setView('terms')} className="text-left hover:text-white transition-colors">Terms of Service</button>
              <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-600 text-xs">© 2026 Jasper Intelligence. Part of Jasper's Live AI agent.</p>
          <div className="flex items-center gap-2 text-zinc-600 text-xs">
            <Cpu className="w-3 h-3" />
            <span>Powered by Gemini Live API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
