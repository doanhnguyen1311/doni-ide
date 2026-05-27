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
        {isSelected ? <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-ink">Selected</span> : null}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-ink/60 p-4 text-sm leading-6 text-slate-300">
        {variant.prompt}
      </div>

      <button
        type="button"
        onClick={() => onSelect(variant.id)}
        className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint"
      >
        Select
      </button>
    </article>
  );
}