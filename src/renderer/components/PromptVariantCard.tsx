import type { PromptVariant, PromptVariantId } from '../../shared/types';

interface PromptVariantCardProps {
  variant: PromptVariant;
  isSelected: boolean;
  onSelect: (variantId: PromptVariantId) => void;
}

export function PromptVariantCard({ variant, isSelected, onSelect }: PromptVariantCardProps): JSX.Element {
  return (
    <article
      className={`rounded-3xl border p-5 transition ${
        isSelected ? 'border-mint/60 bg-mint/10 shadow-glow' : 'border-white/10 bg-white/[0.04] hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">{variant.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{variant.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold uppercase text-slate-300">{variant.estimatedRisk} rủi ro</span>
          {isSelected ? <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-ink">Đã chọn</span> : null}
        </div>
      </div>

      {variant.plan.length ? (
        <ol className="mt-4 space-y-2 text-sm leading-6 text-slate-400">
          {variant.plan.map((step, index) => <li key={`${index}-${step}`}>{index + 1}. {step}</li>)}
        </ol>
      ) : null}

      {variant.tradeoffs.length ? <div className="mt-4 text-xs leading-5 text-slate-500">{variant.tradeoffs.join(' ')}</div> : null}

      <div className="mt-4 rounded-2xl border border-white/10 bg-ink/60 p-4 text-sm leading-6 text-slate-300">
        {variant.prompt}
      </div>

      <button
        type="button"
        onClick={() => onSelect(variant.id)}
        className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint"
      >
        Chọn chiến lược
      </button>
    </article>
  );
}
