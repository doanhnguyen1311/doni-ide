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

      <div className="mt-4 grid gap-3">
        {variant.plan.length ? (
          <div className="rounded-2xl border border-white/10 bg-ink/50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Các bước Doni sẽ làm</div>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
              {variant.plan.map((step, index) => <li key={`${index}-${step}`}>{index + 1}. {step}</li>)}
            </ol>
          </div>
        ) : null}

        {variant.suggestedFiles.length ? (
          <div className="rounded-2xl border border-white/10 bg-ink/50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">File nên đọc/sửa</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {variant.suggestedFiles.map((filePath) => (
                <span key={filePath} className="max-w-full truncate rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-mono text-slate-300">
                  {filePath}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {variant.tradeoffs.length ? (
          <div className="rounded-2xl border border-white/10 bg-ink/50 p-4 text-sm leading-6 text-slate-400">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Đánh đổi</div>
            {variant.tradeoffs.join(' ')}
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-ink/60 p-4 text-sm leading-6 text-slate-300">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Prompt cuối</div>
          {variant.prompt}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(variant.id)}
        className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-mint/50 hover:text-mint"
      >
        {isSelected ? 'Đang chạy hướng này' : 'OK, chạy hướng này'}
      </button>
    </article>
  );
}
