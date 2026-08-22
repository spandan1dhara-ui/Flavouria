import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ListChecks, Check } from "lucide-react";

export function CookMode({ open, onClose, title, ingredients = [], method = [] }) {
  const [step, setStep] = useState(0);
  const [showIng, setShowIng] = useState(false);
  const wakeRef = useRef(null);
  const touchX = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setShowIng(false);
    async function lock() {
      try {
        if ("wakeLock" in navigator) wakeRef.current = await navigator.wakeLock.request("screen");
      } catch {}
    }
    lock();
    const onVis = () => { if (document.visibilityState === "visible") lock(); };
    document.addEventListener("visibilitychange", onVis);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.body.style.overflow = prevOverflow;
      try { wakeRef.current && wakeRef.current.release(); } catch {}
      wakeRef.current = null;
    };
  }, [open]);

  const total = method.length;
  const next = () => setStep((s) => (s >= total - 1 ? s : s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, total]);

  if (!open) return null;

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -50) next();
    else if (dx > 50) prev();
    touchX.current = null;
  };

  const last = step >= total - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-ink text-white flex flex-col"
      data-testid="cook-mode"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="relative z-20 flex items-center justify-between gap-3 px-5 sm:px-8 py-4 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-coral">Cook Mode · screen stays on</p>
          <h2 className="font-heading text-lg sm:text-xl font-black truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowIng((s) => !s)} data-testid="cook-mode-ingredients" className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 px-4 h-11 font-bold transition-colors">
            <ListChecks size={18} /> <span className="hidden sm:inline">Ingredients</span>
          </button>
          <button onClick={onClose} data-testid="cook-mode-close" className="grid place-items-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 transition-colors" aria-label="Exit cook mode">
            <X size={20} />
          </button>
        </div>
      </header>

      {total === 0 ? (
        <div className="flex-1 grid place-items-center text-white/70">No steps available for this recipe.</div>
      ) : (
        <>
          <div className="px-5 sm:px-8 pt-4">
            <div className="flex items-center justify-between text-sm font-bold text-white/60 mb-2">
              <span>Step {step + 1} of {total}</span>
              <span>{Math.round(((step + 1) / total) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-coral transition-all duration-300" style={{ width: `${((step + 1) / total) * 100}%` }} />
            </div>
          </div>

          <div className="flex-1 grid place-items-center px-6 sm:px-10">
            <div className="max-w-3xl text-center" data-testid="cook-mode-step">
              <span className="font-heading text-7xl sm:text-8xl font-black text-coral/30">{String(step + 1).padStart(2, "0")}</span>
              <p className="mt-4 text-2xl sm:text-4xl font-heading font-black leading-snug">{method[step]}</p>
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 px-5 sm:px-8 py-5 border-t border-white/10">
            <button onClick={prev} disabled={step === 0} data-testid="cook-mode-prev" className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 px-6 h-14 font-bold disabled:opacity-30 transition-colors">
              <ChevronLeft size={20} /> Back
            </button>
            {last ? (
              <button onClick={onClose} data-testid="cook-mode-done" className="inline-flex items-center gap-2 rounded-full bg-leaf hover:brightness-95 px-8 h-14 font-black transition">
                <Check size={20} /> Done cooking
              </button>
            ) : (
              <button onClick={next} data-testid="cook-mode-next" className="inline-flex items-center gap-2 rounded-full bg-coral hover:bg-coral-hover px-8 h-14 font-black transition-colors">
                Next <ChevronRight size={20} />
              </button>
            )}
          </footer>
        </>
      )}

      {showIng && (
        <div className="absolute inset-0 z-30 bg-ink/95 backdrop-blur p-6 sm:p-10 overflow-y-auto pt-24" data-testid="cook-mode-ingredients-panel">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-2xl font-black">Ingredients</h3>
              <button onClick={() => setShowIng(false)} data-testid="cook-mode-ingredients-close" className="grid place-items-center w-11 h-11 rounded-full bg-white/10"><X size={20} /></button>
            </div>
            <ul className="space-y-2">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-lg font-semibold">
                  <span className="w-2 h-2 rounded-full bg-coral shrink-0" /> {ing}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
