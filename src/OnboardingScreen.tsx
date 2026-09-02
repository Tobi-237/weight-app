// @ts-nocheck
import React, { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  Dumbbell,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

const TEAL = "#1F5C5C";
const TEAL_DEEP = "#153F3F";
const GOLD = "#D8A93A";
const CREAM = "#F2EFE6";
const INK = "#1E2A28";

type Slide = {
  icon: React.ReactNode;
  title: string;
  text: string;
};

const SLIDES: Slide[] = [
  {
    icon: <Sparkles size={40} color={GOLD} strokeWidth={1.8} />,
    title: "Programme Minceur",
    text: "5 mois, un objectif clair, un accompagnement quotidien — du 1er septembre 2026 au 31 janvier 2027.",
  },
  {
    icon: <TrendingUp size={40} color={GOLD} strokeWidth={1.8} />,
    title: "Votre poids, semaine après semaine",
    text: "Entrez votre poids chaque semaine. Un graphique compare votre progression réelle à la trajectoire idéale.",
  },
  {
    icon: (
      <div className="flex items-center gap-2">
        <UtensilsCrossed size={34} color={GOLD} strokeWidth={1.8} />
        <Dumbbell size={34} color={GOLD} strokeWidth={1.8} />
      </div>
    ),
    title: "Repas, sport et journal, sans y penser",
    text: "Un plan de repas adapté à vos habitudes, un programme sportif qui monte en intensité sur 6 phases, et un journal simple pour noter calories, sommeil et énergie.",
  },
  {
    icon: <CalendarDays size={40} color={GOLD} strokeWidth={1.8} />,
    title: "Prêt à commencer ?",
    text: "Renseignez vos informations dans l'onglet Résumé pour calculer vos besoins caloriques, puis suivez votre parcours jour après jour.",
  },
];

export default function OnboardingScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;

  const next = () => {
    if (isLast) onComplete();
    else setStep((s) => s + 1);
  };

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden relative"
      style={{
        background: `linear-gradient(160deg, ${TEAL} 0%, ${TEAL_DEEP} 100%)`,
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <style>{`
        @keyframes onbBadgeIn {
          0% { opacity: 0; transform: scale(0.6); }
          60% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes onbFadeUp {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes onbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .onb-badge { animation: onbBadgeIn 600ms cubic-bezier(.34,1.56,.64,1) both,
                                 onbFloat 3.2s ease-in-out 700ms infinite; }
        .onb-title { animation: onbFadeUp 500ms ease 150ms both; }
        .onb-text  { animation: onbFadeUp 500ms ease 260ms both; }
        .onb-cta   { animation: onbFadeUp 500ms ease 380ms both; }
      `}</style>

      {!isLast && (
        <button
          onClick={onComplete}
          className="absolute top-5 right-5 z-10 text-sm px-3 py-1.5 rounded-full"
          style={{ color: CREAM, opacity: 0.75, background: "rgba(255,255,255,0.08)" }}
        >
          Passer
        </button>
      )}

      {/* Slides track */}
      <div className="flex-1 overflow-hidden">
        <div
          className="h-full flex"
          style={{
            width: `${SLIDES.length * 100}%`,
            transform: `translateX(-${step * (100 / SLIDES.length)}%)`,
            transition: "transform 480ms cubic-bezier(.65,0,.35,1)",
          }}
        >
          {SLIDES.map((s, i) => (
            <div
              key={i}
              className="h-full flex flex-col items-center justify-center px-8 text-center"
              style={{ width: `${100 / SLIDES.length}%` }}
            >
              {step === i && (
                <div key={step} className="flex flex-col items-center max-w-xs">
                  <div
                    className="onb-badge w-24 h-24 rounded-full flex items-center justify-center mb-7"
                    style={{
                      background: "rgba(216,169,58,0.12)",
                      border: `1.5px solid rgba(216,169,58,0.4)`,
                    }}
                  >
                    {s.icon}
                  </div>
                  <h1
                    className="onb-title text-2xl font-semibold mb-3 leading-snug"
                    style={{ color: CREAM }}
                  >
                    {s.title}
                  </h1>
                  <p
                    className="onb-text text-[15px] leading-relaxed"
                    style={{ color: "rgba(242,239,230,0.78)" }}
                  >
                    {s.text}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress dots + CTA */}
      <div className="shrink-0 flex flex-col items-center gap-6 pb-10 pt-4">
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                height: 6,
                width: i === step ? 22 : 6,
                background: i === step ? GOLD : "rgba(242,239,230,0.35)",
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="onb-cta flex items-center gap-2 px-7 py-3 rounded-full font-medium text-[15px] active:scale-95 transition-transform"
          style={{ background: GOLD, color: INK }}
        >
          {isLast ? "Commencer" : "Suivant"}
          <ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}