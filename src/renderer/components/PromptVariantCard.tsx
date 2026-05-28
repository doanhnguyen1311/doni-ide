import type { PromptVariant, PromptVariantId } from '../../shared/types';

interface PromptVariantCardProps {
  variant: PromptVariant;
  isSelected: boolean;
  onSelect: (variantId: PromptVariantId) => void;
}

export function PromptVariantCard({ variant, isSelected, onSelect }: PromptVariantCardProps): JSX.Element {
  return (
    <article
      className={`flex min-h-[17rem] flex-col rounded-lg border p-4 transition ${
        isSelected ? 'border-mint/60 bg-mint/10 shadow-glow' : 'border-white/10 bg-white/[0.04] hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 inline-flex rounded-md border border-mint/30 bg-mint/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-mint">
            {isSelected ? 'Selected' : 'Recommended'}
          </div>
          <h3 className="line-clamp-2 font-display text-base font-semibold text-white">{variant.title}</h3>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{variant.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-bold uppercase text-slate-300">{variant.estimatedRisk}</span>
        </div>
      </div>

      <div className="mt-3 grid flex-1 gap-3">
        {variant.plan.length ? (
          <div className="rounded-md border border-white/10 bg-ink/50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Plan</div>
            <ol className="mt-3 space-y-1.5 text-xs leading-5 text-slate-400">
              {variant.plan.slice(0, 3).map((step, index) => <li key={`${index}-${step}`}>{index + 1}. {step}</li>)}
            </ol>
          </div>
        ) : null}

        {variant.suggestedFiles.length ? (
          <div className="rounded-md border border-white/10 bg-ink/50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Files</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {variant.suggestedFiles.slice(0, 4).map((filePath) => (
                <span key={filePath} className="max-w-full truncate rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-mono text-slate-300">
                  {filePath}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {variant.tradeoffs.length ? (
          <div className="rounded-md border border-white/10 bg-ink/50 p-3 text-xs leading-5 text-slate-400">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Tradeoffs</div>
            {variant.tradeoffs.join(' ')}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onSelect(variant.id)}
        className="mt-3 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint"
      >
        {isSelected ? 'Running this strategy' : 'Run strategy'}
      </button>
    </article>
  );
}
