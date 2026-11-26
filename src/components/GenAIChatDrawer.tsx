import { Bot, Send, Sparkles, User } from 'lucide-react';
import { useState } from 'react';
import { askAetherGuardAdvisor } from '../services/genAiService';
import type {
  AirQualitySnapshot,
  ChatMessage,
  GenAIPlan,
  HouseholdProfile,
  LocationProfile,
} from '../types/airQuality';

interface GenAIChatDrawerProps {
  location: LocationProfile;
  snapshot: AirQualitySnapshot;
  profile: HouseholdProfile;
  plan: GenAIPlan;
  geminiApiKey?: string;
}

const STARTER_PROMPTS = [
  'Should we open windows today?',
  'Can kids walk to school safely?',
  'How to build a $38 DIY purifier?',
  'Best apartment HOA winter pact?',
];

export function GenAIChatDrawer({
  location,
  snapshot,
  profile,
  plan,
  geminiApiKey,
}: GenAIChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I’m monitoring ${location.name} (US AQI ${snapshot.usAqi}, PM2.5 ${snapshot.pm25} µg/m³). Ask me about school commutes, safe window opening, DIY filtration, or neighborhood clean-air actions.`,
      impactSummary: `Best outdoor window today: ${plan.bestOutdoorWindow.startLabel}–${plan.bestOutdoorWindow.endLabel}`,
      timestamp: 'Now',
      mode: geminiApiKey ? 'gemini-live' : 'contextual-engine',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  async function submitQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    const reply = await askAetherGuardAdvisor(
      trimmed,
      location,
      snapshot,
      profile,
      plan,
      geminiApiKey
    );
    setMessages((prev) => [...prev, reply]);
    setSending(false);
  }

  return (
    <section className="flex flex-col rounded-2xl border border-slate-800/90 bg-slate-900/65 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Ask AetherGuard AI Advisor
            </h2>
            <p className="text-[11px] text-slate-400">
              Grounded in {location.name} telemetry &amp; your household profile
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-200">
          <Sparkles className="h-2.5 w-2.5" />
          {geminiApiKey ? 'Gemini 2.5 Flash' : 'Context Engine'}
        </span>
      </div>

      {/* Starter Prompt Chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {STARTER_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void submitQuestion(q)}
            className="rounded-full border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-200"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="mb-3 max-h-72 space-y-2.5 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${
              m.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                m.role === 'user'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-indigo-500/20 text-indigo-300'
              }`}
            >
              {m.role === 'user' ? (
                <User className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-xl border px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-50'
                  : 'border-slate-800 bg-slate-950/80 text-slate-200'
              }`}
            >
              <p>{m.content}</p>
              {m.impactSummary && (
                <div className="mt-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
                  Direct Impact: {m.impactSummary}
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="text-xs text-slate-400 italic">
            AetherGuard AI is analyzing atmospheric &amp; household impact...
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitQuestion(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about commutes, cooking, asthma safety, community steps..."
          className="flex-1 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          Ask
        </button>
      </form>
    </section>
  );
}
