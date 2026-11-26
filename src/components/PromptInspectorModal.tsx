import { Check, Code2, Copy, KeyRound, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PromptArtifact } from '../types/airQuality';

interface PromptInspectorModalProps {
  open: boolean;
  artifact: PromptArtifact;
  geminiApiKey: string;
  onSaveApiKey: (key: string) => void;
  onClose: () => void;
}

export function PromptInspectorModal({
  open,
  artifact,
  geminiApiKey,
  onSaveApiKey,
  onClose,
}: PromptInspectorModalProps) {
  const [draftKey, setDraftKey] = useState(geminiApiKey);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const fullPromptText = `${artifact.systemPrompt}\n\n--- LIVE GROUNDED CONTEXT ---\n${artifact.contextPayload}`;

  function handleCopy() {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(fullPromptText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700/90 bg-slate-900 p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Code2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="prompt-modal-title" className="text-base font-bold text-white">
                GenAI Prompt Engineering &amp; Gemini API Config
              </h2>
              <p className="text-xs text-slate-400">
                Inspect how live telemetry + household context ground every
                recommendation
              </p>
            </div>
          </div>
          <button
            type="button"
            autoFocus
            aria-label="Close prompt inspector"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Optional Live Gemini API Key */}
        <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
          <label
            htmlFor="gemini-api-key-input"
            className="flex items-center gap-2 text-xs font-bold text-indigo-200"
          >
            <KeyRound className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            Optional: Connect Live Google Gemini 2.5 Flash API
          </label>
          <p className="mt-1 text-xs text-slate-300">
            The app works out-of-the-box with its built-in grounded synthesis
            engine. Paste a Gemini API key below (stored only in your browser’s{' '}
            <code>localStorage</code>) to route plans &amp; Q&amp;A live through{' '}
            <code>gemini-2.5-flash</code>.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="gemini-api-key-input"
              type="password"
              autoComplete="off"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                onSaveApiKey(draftKey.trim());
                onClose();
              }}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-400"
            >
              {draftKey.trim() ? 'Save & Activate Gemini' : 'Use Built-In Engine'}
            </button>
            {geminiApiKey && (
              <button
                type="button"
                aria-label="Clear saved Gemini API key"
                onClick={() => {
                  setDraftKey('');
                  onSaveApiKey('');
                }}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/25"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Prompt Architecture Viewer */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
              Active Grounded Prompt ({artifact.modelLabel})
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" aria-hidden="true" />
                  Copy Prompt
                </>
              )}
            </button>
          </div>

          <pre className="max-h-72 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-cyan-200">
            {fullPromptText}
          </pre>
        </div>
      </div>
    </div>
  );
}
