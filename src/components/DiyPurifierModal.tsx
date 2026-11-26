import { CheckCircle2, Fan, IndianRupee, Layers, ShieldCheck, X } from 'lucide-react';
import { useEffect } from 'react';

interface DiyPurifierModalProps {
  open: boolean;
  outdoorPm25: number;
  onClose: () => void;
}

const PARTS_LIST = [
  {
    item: '4× MERV-13 Pleated Filters (50×50×2.5 cm)',
    costInr: '₹1,800',
    note: 'Captures >85% of 0.3–1 µm winter smog & diesel soot',
  },
  {
    item: '1× Standard 45–50 cm Box / Exhaust Fan (55W)',
    costInr: '₹1,150',
    note: 'Low-wattage continuous airflow; ~₹180/mo electricity',
  },
  {
    item: 'Duct Tape Roll + Packaging Cardboard Shroud',
    costInr: '₹250',
    note: 'Seals corner air leaks to boost Clean Air Delivery Rate',
  },
];

const BUILD_STEPS = [
  'Arrange the 4 MERV-13 filters into a hollow square with airflow arrows pointing INWARD.',
  'Tape every vertical seam tightly from outside and inside so zero unfiltered smog bypasses the media.',
  'Cut a cardboard square for the bottom base and seal it cleanly to the bottom edges of the 4 filters.',
  'Mount the fan on top blowing UPWARD, tape the perimeter, and mask the 4 outer corner triangles of the fan face with a cardboard shroud to stop backflow.',
];

/**
 * Accessible step-by-step visual assembly guide for a low-cost Indian-rupee
 * Corsi-Rosenthal clean-air cube.
 */
export function DiyPurifierModal({
  open,
  outdoorPm25,
  onClose,
}: DiyPurifierModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const estimatedBedroomAfter = Math.max(8, Math.round(outdoorPm25 * 0.22));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diy-purifier-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-emerald-500/40 bg-slate-900 p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <Fan className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="diy-purifier-title"
                className="text-base font-bold text-white"
              >
                ₹3,200 DIY Corsi-Rosenthal Clean-Air Cube Blueprint
              </h2>
              <p className="text-xs text-slate-400">
                15-minute assembly • ~450 CFM CADR • Outperforms ₹25,000 retail
                units
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close DIY purifier blueprint"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Impact Banner */}
        <div className="mt-4 grid gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 sm:grid-cols-3">
          <div>
            <div className="text-[11px] text-emerald-200/80">Total Build Cost</div>
            <div className="flex items-center gap-1 font-mono text-lg font-extrabold text-emerald-300">
              <IndianRupee className="h-4 w-4" aria-hidden="true" />
              3,200
            </div>
          </div>
          <div>
            <div className="text-[11px] text-emerald-200/80">
              Bedroom PM2.5 Drop
            </div>
            <div className="font-mono text-lg font-extrabold text-cyan-300">
              {outdoorPm25} → ~{estimatedBedroomAfter} µg/m³
            </div>
          </div>
          <div>
            <div className="text-[11px] text-emerald-200/80">
              Power Draw (24h)
            </div>
            <div className="font-mono text-lg font-extrabold text-amber-300">
              ~55W (~₹6/day)
            </div>
          </div>
        </div>

        {/* Parts List */}
        <div className="mt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase">
            <Layers className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            Bill of Materials (India Local Hardware / Online)
          </h3>
          <div className="space-y-2">
            {PARTS_LIST.map((p) => (
              <div
                key={p.item}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/75 px-3.5 py-2.5"
              >
                <div>
                  <div className="text-xs font-semibold text-white">
                    {p.item}
                  </div>
                  <div className="text-[11px] text-slate-400">{p.note}</div>
                </div>
                <span className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300">
                  {p.costInr}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Assembly Steps */}
        <div className="mt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase">
            <ShieldCheck
              className="h-3.5 w-3.5 text-emerald-400"
              aria-hidden="true"
            />
            4-Step Assembly
          </h3>
          <ol className="space-y-2">
            {BUILD_STEPS.map((step, idx) => (
              <li
                key={step}
                className="flex items-start gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs text-slate-200"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 font-mono text-[11px] font-bold text-cyan-300">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Replace filters every 6–9 months (~₹1,800)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
