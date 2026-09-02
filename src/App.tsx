// @ts-nocheck
import OnboardingScreen from "./OnboardingScreen";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Flame, Scale, CalendarDays, UtensilsCrossed, Dumbbell, Sparkles,
  Droplets, Moon, ChevronRight, Check, Loader2, TrendingDown,
} from "lucide-react";

/* ---------------------------------------------------------
   Fonts
--------------------------------------------------------- */
function useGoogleFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}

/* ---------------------------------------------------------
   Constants / defaults
--------------------------------------------------------- */
const PROFILES = {
  pns: {
    label: "Pns",
    defaults: { sex: "H", age: 41, height: 184, weight: 110, goalWeight: 95, activity: 1.375 },
  },
  epouse: {
    label: "Épouse",
    defaults: { sex: "F", age: 42, height: 174, weight: 97, goalWeight: 87, activity: 1.375 },
  },
};
const START_DATE = "2026-09-01";
const END_DATE = "2027-01-31";
const MS_DAY = 86400000;
const MS_WEEK = MS_DAY * 7;

const PHASES = [
  { label: "Phase 1 — Mise en route", weeks: [1, 2], cardio: "Marche 20-30 min, 3-4x/semaine", muscu: "Aucun (étirements facultatifs)" },
  { label: "Phase 2 — Ancrage", weeks: [3, 4], cardio: "Marche 30-40 min, 4-5x/semaine", muscu: "2x/semaine, poids du corps, 15-20 min" },
  { label: "Phase 3 — Montée en puissance", weeks: [5, 8], cardio: "Marche rapide/vélo 35-45 min, 4-5x/sem", muscu: "3x/semaine, charges légères, 25-30 min" },
  { label: "Phase 4 — Consolidation", weeks: [9, 14], cardio: "Cardio 40-50 min, 4-5x/semaine", muscu: "3-4x/semaine, charges progressives, 30-35 min" },
  { label: "Phase 5 — Régime de croisière", weeks: [15, 18], cardio: "Cardio 45-50 min + une activité plaisir", muscu: "3-4x/semaine, 30-40 min" },
  { label: "Phase 6 — Dernière ligne droite", weeks: [19, 22], cardio: "Cardio régulier maintenu", muscu: "3-4x/semaine maintenues" },
];

const TIPS = [
  "Pèse-toi une fois par semaine, dans les mêmes conditions : le poids fluctue au jour le jour.",
  "Note aussi ce qui ne se voit pas sur la balance : énergie, sommeil, tour de taille, vêtements.",
  "Un écart n'annule rien : on reprend le rythme au repas suivant, sans compenser en sautant un repas.",
  "Vise la régularité plutôt que la perfection : 80% du temps bien suivi vaut mieux que 2 semaines parfaites puis l'abandon.",
  "Prépare tes repas à l'avance quand tu peux, pour réduire les décisions du quotidien.",
  "Dors 7h ou plus : le manque de sommeil augmente la faim et complique la perte de poids.",
];

const ADJUSTMENTS = [
  { situ: "Plateau de 2-3 semaines", action: "Vérifie les portions réelles, ajoute une séance d'activité avant de baisser encore les calories." },
  { situ: "Faim difficile à gérer", action: "Augmente protéines et légumes à volume égal, ou élargis la fenêtre d'1h temporairement." },
  { situ: "Perte plus rapide que prévu", action: "Ajoute +100-150 kcal/j pour préserver muscle et énergie sur la durée." },
  { situ: "Fatigue, irritabilité", action: "Remonte les calories de 100-200 kcal/j et réévalue après une semaine." },
  { situ: "Motivation en baisse", action: "Reviens à un seul objectif à la fois, varie les activités, embarque un proche." },
];

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const iso = (d) => d.toISOString().slice(0, 10);
const fmtDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
const round = (n, dp = 0) => Math.round(n * 10 ** dp) / 10 ** dp;

function computeTargets(s) {
  const bmr =
    s.sex === "F"
      ? 10 * s.weight + 6.25 * s.height - 5 * s.age - 161
      : 10 * s.weight + 6.25 * s.height - 5 * s.age + 5;
  const tdee = bmr * s.activity;
  const start = new Date(START_DATE);
  const end = new Date(END_DATE);
  const weeksAvailable = (end - start) / MS_WEEK;
  const kgToLose = s.weight - s.goalWeight;
  const weeklyLossNeeded = kgToLose / weeksAvailable;
  const deficit = (weeklyLossNeeded * 7700) / 7;
  const targetCal = Math.max(tdee - deficit, 1600);
  const protein = (targetCal * 0.3) / 4;
  const fat = (targetCal * 0.29) / 9;
  const carbs = (targetCal - protein * 4 - fat * 9) / 4;
  const imc = s.weight / (s.height / 100) ** 2;
  return {
    bmr: round(bmr), tdee: round(tdee), imc: round(imc, 1),
    weeksAvailable: round(weeksAvailable, 1), kgToLose: round(kgToLose, 1),
    weeklyLossNeeded: round(weeklyLossNeeded, 2), deficit: round(deficit),
    targetCal: round(targetCal), protein: round(protein), fat: round(fat), carbs: round(carbs),
    nWeeks: Math.ceil(weeksAvailable),
  };
}

function buildWeeks(n) {
  const start = new Date(START_DATE);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start.getTime() + i * MS_WEEK);
    return { week: i + 1, date: iso(d) };
  });
}

function currentPhase(weekNum) {
  return PHASES.find((p) => weekNum >= p.weeks[0] && weekNum <= p.weeks[1]) || PHASES[PHASES.length - 1];
}

function weeksElapsedToday() {
  const start = new Date(START_DATE);
  const today = new Date();
  const diff = Math.floor((today - start) / MS_WEEK) + 1;
  return Math.min(Math.max(diff, 1), 22);
}

/* ---------------------------------------------------------
   Small UI atoms
--------------------------------------------------------- */
function StatCard({ icon: Icon, label, value, unit, accent }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-stone-500">
        <Icon size={16} strokeWidth={2} style={{ color: accent }} />
        <span className="text-[13px]">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-serif text-3xl font-semibold text-stone-800">{value}</span>
        {unit && <span className="text-sm text-stone-400">{unit}</span>}
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1, suffix }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] text-stone-500">{label}</span>
      <div className="flex items-center bg-white border border-stone-200 rounded-lg px-3 py-2 focus-within:border-teal-600 transition-colors">
        <input
          type="number"
          value={value === 0 || value ? value : ""}
          step={step}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange("");
              return;
            }
            const parsed = parseFloat(raw);
            onChange(Number.isNaN(parsed) ? "" : parsed);
          }}
          className="w-full outline-none text-stone-800 font-medium bg-transparent"
        />
        {suffix && <span className="text-stone-400 text-sm">{suffix}</span>}
      </div>
    </label>
  );
}

function SaveIndicator({ status }) {
  if (status === "idle") return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-stone-400">
      {status === "saving" ? (
        <>
          <Loader2 size={12} className="animate-spin" /> Enregistrement…
        </>
      ) : (
        <>
          <Check size={12} className="text-emerald-600" /> Enregistré
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Main App
--------------------------------------------------------- */
export default function App() {
  useGoogleFonts();

  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem("pm_onboarding_done") !== "true"
  );

  const [profileKey, setProfileKey] = useState("pns");
  const [tab, setTab] = useState("resume");
  const [settings, setSettings] = useState(PROFILES.pns.defaults);
  const [weekly, setWeekly] = useState({});
  const [dailyLog, setDailyLog] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [todayForm, setTodayForm] = useState({
    calories: "", protein: "", windowRespected: "", water: "", sleep: "", energy: "", notes: "",
  });

  const todayIso = iso(new Date());

  /* Load profile data */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const defaults = PROFILES[profileKey].defaults;
      const s = localStorage.getItem(`profile:${profileKey}:settings`);
      if (!cancelled) setSettings(s ? JSON.parse(s) : defaults)
       const w = localStorage.getItem(`profile:${profileKey}:weekly`);
      if (!cancelled) setWeekly(w ? JSON.parse(w) : {});
     const d = localStorage.getItem(`profile:${profileKey}:daily-log`);
      if (!cancelled) setDailyLog(d ? JSON.parse(d) : {});
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [profileKey]);

  /* Prefill today's form from stored log */
  useEffect(() => {
    if (dailyLog[todayIso]) {
      setTodayForm(dailyLog[todayIso]);
    } else {
      setTodayForm({ calories: "", protein: "", windowRespected: "", water: "", sleep: "", energy: "", notes: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey, loading]);

  const persist = useCallback(async (key, value) => {
    setSaveStatus("saving");
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1200);
    } catch {
      setSaveStatus("idle");
    }
  }, []);

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    persist(`profile:${profileKey}:settings`, next);
  };

  const updateWeekly = (weekNum, patch) => {
    const next = { ...weekly, [weekNum]: { ...weekly[weekNum], ...patch } };
    setWeekly(next);
    persist(`profile:${profileKey}:weekly`, next);
  };

  const saveTodayForm = (patch) => {
    const next = { ...todayForm, ...patch };
    setTodayForm(next);
    const nextLog = { ...dailyLog, [todayIso]: next };
    setDailyLog(nextLog);
    persist(`profile:${profileKey}:daily-log`, nextLog);
  };

  const targets = useMemo(() => computeTargets(settings), [settings]);
  const weeks = useMemo(() => buildWeeks(targets.nWeeks || 22), [targets.nWeeks]);
  const startWeight = weekly[1]?.weight ?? settings.weight;

  const chartData = weeks.map((w) => {
    const entry = weekly[w.week];
    const idealLoss = targets.weeklyLossNeeded * (w.week - 1);
    return {
      label: `S${w.week}`,
      poids: entry?.weight ? Number(entry.weight) : null,
      objectif: round(startWeight - idealLoss, 1),
    };
  });

  const wk = weeksElapsedToday();
  const phase = currentPhase(wk);

  const TABS = [
    { id: "resume", label: "Résumé", icon: Flame },
    { id: "hebdo", label: "Semaines", icon: Scale },
    { id: "quotidien", label: "Aujourd'hui", icon: CalendarDays },
    { id: "repas", label: "Repas", icon: UtensilsCrossed },
    { id: "activite", label: "Activité", icon: Dumbbell },
    { id: "motivation", label: "Motivation", icon: Sparkles },
  ];

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onComplete={() => {
          localStorage.setItem("pm_onboarding_done", "true");
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{ background: "#F2EFE6", fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {/* Header */}
      <div style={{ background: "#1F5C5C" }} className="px-5 pt-6 pb-5 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p
              className="text-white/60 text-[12px] tracking-wide"
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              01/09/2026 → 31/01/2027
            </p>
            <h1
              className="text-white text-2xl font-semibold"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Programme minceur
            </h1>
          </div>
          <SaveIndicator status={saveStatus} />
        </div>
        <div className="flex gap-2">
          {Object.entries(PROFILES).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setProfileKey(key)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={
                profileKey === key
                  ? { background: "#D8A93A", color: "#1C2321" }
                  : { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-stone-400 gap-2">
          <Loader2 className="animate-spin" size={18} /> Chargement…
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex overflow-x-auto no-scrollbar border-b border-stone-200 bg-[#F2EFE6] shrink-0 px-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex flex-col items-center gap-1 px-3.5 py-3 shrink-0 relative"
                >
                  <Icon size={17} style={{ color: active ? "#1F5C5C" : "#A8A196" }} />
                  <span
                    className="text-[11px]"
                    style={{ color: active ? "#1F5C5C" : "#A8A196", fontWeight: active ? 600 : 400 }}
                  >
                    {t.label}
                  </span>
                  {active && (
                    <span
                      className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                      style={{ background: "#D8A93A" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 pb-16">
            <div className="max-w-xl mx-auto">
              {tab === "resume" && (
                <ResumeTab settings={settings} updateSettings={updateSettings} targets={targets} />
              )}
              {tab === "hebdo" && (
                <HebdoTab weeks={weeks} weekly={weekly} updateWeekly={updateWeekly} chartData={chartData} targets={targets} startWeight={startWeight} />
              )}
              {tab === "quotidien" && (
                <QuotidienTab
                  todayIso={todayIso}
                  targets={targets}
                  todayForm={todayForm}
                  saveTodayForm={saveTodayForm}
                  dailyLog={dailyLog}
                />
              )}
              {tab === "repas" && <RepasTab targets={targets} />}
              {tab === "activite" && <ActiviteTab currentWeek={wk} phase={phase} />}
              {tab === "motivation" && <MotivationTab />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Résumé tab
--------------------------------------------------------- */
function ResumeTab({ settings, updateSettings, targets }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-serif text-lg text-stone-800 mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
          Tes données
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Âge" value={settings.age} onChange={(v) => updateSettings({ age: v })} suffix="ans" />
          <NumberField label="Taille" value={settings.height} onChange={(v) => updateSettings({ height: v })} suffix="cm" />
          <NumberField label="Poids actuel" value={settings.weight} step={0.1} onChange={(v) => updateSettings({ weight: v })} suffix="kg" />
          <NumberField label="Poids visé" value={settings.goalWeight} step={0.1} onChange={(v) => updateSettings({ goalWeight: v })} suffix="kg" />
        </div>
        <label className="flex flex-col gap-1 mt-3">
          <span className="text-[13px] text-stone-500">Niveau d'activité</span>
          <select
            value={settings.activity}
            onChange={(e) => updateSettings({ activity: parseFloat(e.target.value) })}
            className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-800 font-medium outline-none"
          >
            <option value={1.2}>Sédentaire</option>
            <option value={1.375}>Légèrement actif</option>
            <option value={1.55}>Modérément actif</option>
            <option value={1.725}>Très actif</option>
          </select>
        </label>
      </div>

      <div>
        <h2 className="font-serif text-lg text-stone-800 mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
          Ton objectif calorique
        </h2>
        <div
          className="rounded-2xl p-5 mb-3 flex items-center justify-between"
          style={{ background: "#1F5C5C" }}
        >
          <div>
            <p className="text-white/60 text-[13px]">Calories par jour</p>
            <p className="text-white font-serif text-4xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>
              {targets.targetCal}
            </p>
          </div>
          <TrendingDown size={36} color="#D8A93A" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard icon={Flame} label="Protéines" value={targets.protein} unit="g" accent="#1F5C5C" />
          <StatCard icon={Flame} label="Lipides" value={targets.fat} unit="g" accent="#D8A93A" />
          <StatCard icon={Flame} label="Glucides" value={targets.carbs} unit="g" accent="#2F5233" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Scale} label="IMC actuel" value={targets.imc} accent="#1F5C5C" />
          <StatCard icon={TrendingDown} label="Rythme visé" value={targets.weeklyLossNeeded} unit="kg/sem" accent="#2F5233" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-4 text-[13px] text-stone-500 leading-relaxed">
        Métabolisme de base : <b className="text-stone-700">{targets.bmr} kcal</b> · Dépense totale (TDEE) :{" "}
        <b className="text-stone-700">{targets.tdee} kcal</b> · Déficit quotidien : <b className="text-stone-700">{targets.deficit} kcal</b>.
        Sur {targets.weeksAvailable} semaines, il reste <b className="text-stone-700">{targets.kgToLose} kg</b> à
        perdre pour atteindre l'objectif. Ces chiffres se recalculent dès que tu modifies ton poids ci-dessus —
        pense à le faire une fois par mois.
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Suivi hebdomadaire tab
--------------------------------------------------------- */
function HebdoTab({ weeks, weekly, updateWeekly, chartData, targets, startWeight }) {
  const [openWeek, setOpenWeek] = useState(weeksElapsedToday());

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-stone-200 p-3">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#EDE9DE" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#A8A196" }} interval={2} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#A8A196" }} domain={["dataMin - 2", "dataMax + 2"]} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #EDE9DE" }} />
            <Line type="monotone" dataKey="objectif" stroke="#D8A93A" strokeDasharray="4 4" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="poids" stroke="#1F5C5C" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 justify-center text-[11px] text-stone-500 mt-1">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#1F5C5C" }} /> Ton poids</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#D8A93A" }} /> Trajectoire cible</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {weeks.map((w) => {
          const entry = weekly[w.week] || {};
          const prevWeight = w.week > 1 ? weekly[w.week - 1]?.weight : startWeight;
          const variation = entry.weight && prevWeight ? round(entry.weight - prevWeight, 1) : null;
          const isOpen = openWeek === w.week;
          return (
            <div key={w.week} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <button
                onClick={() => setOpenWeek(isOpen ? null : w.week)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: "#EDE9DE", color: "#1F5C5C" }}
                  >
                    S{w.week}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-stone-800">{fmtDate(w.date)}</p>
                    <p className="text-[12px] text-stone-400">
                      {entry.weight ? `${entry.weight} kg` : "Pas encore pesé"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {variation !== null && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: variation <= 0 ? "#E4EFE6" : "#FBEAEA",
                        color: variation <= 0 ? "#2F5233" : "#B3453D",
                      }}
                    >
                      {variation > 0 ? "+" : ""}{variation} kg
                    </span>
                  )}
                  <ChevronRight size={16} className="text-stone-300" style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 flex flex-col gap-3 border-t border-stone-100 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Poids (kg)"
                      step={0.1}
                      value={entry.weight ?? ""}
                      onChange={(v) => updateWeekly(w.week, { weight: v })}
                    />
                    <label className="flex flex-col gap-1">
                      <span className="text-[13px] text-stone-500">Ressenti</span>
                      <select
                        value={entry.feeling ?? ""}
                        onChange={(e) => updateWeekly(w.week, { feeling: e.target.value })}
                        className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 outline-none"
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
                      </select>
                    </label>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[13px] text-stone-500">Activité réalisée cette semaine</span>
                    <input
                      value={entry.activity ?? ""}
                      onChange={(e) => updateWeekly(w.week, { activity: e.target.value })}
                      className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 outline-none"
                      placeholder="ex. marche 4x, muscu 2x"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[13px] text-stone-500">Notes</span>
                    <textarea
                      value={entry.notes ?? ""}
                      onChange={(e) => updateWeekly(w.week, { notes: e.target.value })}
                      className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 outline-none resize-none"
                      rows={2}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Suivi quotidien tab
--------------------------------------------------------- */
function QuotidienTab({ todayIso, targets, todayForm, saveTodayForm, dailyLog }) {
  const recent = Object.entries(dailyLog)
    .filter(([d]) => d !== todayIso)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-lg text-stone-800 mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
          Aujourd'hui
        </h2>
        <p className="text-[13px] text-stone-400 mb-3">
          {new Date(todayIso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · objectif {targets.targetCal} kcal
        </p>

        <div className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Calories" value={todayForm.calories} onChange={(v) => saveTodayForm({ calories: v })} suffix="kcal" />
            <NumberField label="Protéines" value={todayForm.protein} onChange={(v) => saveTodayForm({ protein: v })} suffix="g" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[13px] text-stone-500 flex items-center gap-1"><Droplets size={13} /> Eau</span>
              <div className="flex items-center bg-white border border-stone-200 rounded-lg px-3 py-2">
                <input
                  type="number" step={0.25} value={todayForm.water}
                  onChange={(e) => saveTodayForm({ water: e.target.value })}
                  className="w-full outline-none text-stone-800 font-medium bg-transparent"
                />
                <span className="text-stone-400 text-sm">L</span>
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[13px] text-stone-500 flex items-center gap-1"><Moon size={13} /> Sommeil</span>
              <div className="flex items-center bg-white border border-stone-200 rounded-lg px-3 py-2">
                <input
                  type="number" step={0.5} value={todayForm.sleep}
                  onChange={(e) => saveTodayForm({ sleep: e.target.value })}
                  className="w-full outline-none text-stone-800 font-medium bg-transparent"
                />
                <span className="text-stone-400 text-sm">h</span>
              </div>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-stone-500">Fenêtre alimentaire respectée</span>
            <div className="flex gap-2">
              {["Oui", "Non"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => saveTodayForm({ windowRespected: opt })}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border"
                  style={
                    todayForm.windowRespected === opt
                      ? { background: "#1F5C5C", color: "white", borderColor: "#1F5C5C" }
                      : { background: "white", color: "#78716C", borderColor: "#E7E2D6" }
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-stone-500">Énergie / satiété (1-5)</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => saveTodayForm({ energy: n })}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border"
                  style={
                    Number(todayForm.energy) === n
                      ? { background: "#D8A93A", color: "#1C2321", borderColor: "#D8A93A" }
                      : { background: "white", color: "#78716C", borderColor: "#E7E2D6" }
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] text-stone-500">Notes</span>
            <textarea
              value={todayForm.notes}
              onChange={(e) => saveTodayForm({ notes: e.target.value })}
              rows={2}
              className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-800 outline-none resize-none"
            />
          </label>
        </div>
      </div>

      {recent.length > 0 && (
        <div>
          <h3 className="text-[13px] text-stone-500 mb-2">Derniers jours</h3>
          <div className="flex flex-col gap-1.5">
            {recent.map(([d, entry]) => (
              <div key={d} className="bg-white rounded-lg border border-stone-200 px-3 py-2 flex items-center justify-between text-sm">
                <span className="text-stone-500">{fmtDate(d)}</span>
                <span className="text-stone-700 font-medium">{entry.calories || "—"} kcal</span>
                <span className="text-stone-400 text-[12px]">{entry.windowRespected || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Plan repas tab
--------------------------------------------------------- */
function RepasTab({ targets }) {
  const meals = [
    { time: "10h00", name: "Repas 1 — rupture du jeûne", desc: "Œufs + avocat + pain complet, ou bouillie de mil/soja + fruit", pct: 0.3 },
    { time: "13h00", name: "Collation", desc: "Yaourt nature + amandes, ou fruit + œuf dur", pct: 0.11 },
    { time: "16h30", name: "Repas 2", desc: "Poulet/poisson grillé + légumes + ndolé ou haricots + un peu de riz", pct: 0.34 },
    { time: "19h30", name: "Repas 3 — avant fermeture", desc: "Soupe/légumes + protéine légère + salade", pct: 0.25 },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-stone-200 p-4 text-[13px] text-stone-500 leading-relaxed">
        Fenêtre 10h-20h (12h-22h en transition les 2 premières semaines). Répartition indicative pour ton objectif
        de <b className="text-stone-700">{targets.targetCal} kcal</b> / <b className="text-stone-700">{targets.protein} g</b> de protéines.
      </div>
      <div className="flex flex-col gap-2">
        {meals.map((m) => (
          <div key={m.time} className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium" style={{ color: "#D8A93A" }}>{m.time}</span>
              <span className="text-[12px] text-stone-400">~{round(targets.targetCal * m.pct)} kcal</span>
            </div>
            <p className="text-sm font-medium text-stone-800">{m.name}</p>
            <p className="text-[13px] text-stone-500 mt-0.5">{m.desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col gap-2">
        <p className="text-sm font-medium text-stone-800 mb-1">Principes clés</p>
        {[
          "Protéines à chaque repas — rassasient et protègent le muscle.",
          "Légumes à volonté, sans obsession du comptage au gramme près.",
          "Aucun aliment interdit : on privilégie plutôt qu'on restreint.",
          "Hydratation régulière (1,5 à 2,5 L/j) ; eau, thé, café non sucrés autorisés hors fenêtre.",
        ].map((p, i) => (
          <p key={i} className="text-[13px] text-stone-500 flex gap-2">
            <span style={{ color: "#1F5C5C" }}>•</span> {p}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Activité tab
--------------------------------------------------------- */
function ActiviteTab({ currentWeek, phase }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-4" style={{ background: "#1F5C5C" }}>
        <p className="text-white/60 text-[12px]">Semaine {currentWeek}</p>
        <p className="text-white font-serif text-lg font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>
          {phase.label}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {PHASES.map((p) => {
          const active = p.label === phase.label;
          return (
            <div
              key={p.label}
              className="rounded-xl border p-4"
              style={active ? { background: "#EDE9DE", borderColor: "#D8A93A" } : { background: "white", borderColor: "#E7E2D6" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-stone-800">{p.label}</p>
                <span className="text-[11px] text-stone-400">Sem. {p.weeks[0]}-{p.weeks[1]}</span>
              </div>
              <p className="text-[13px] text-stone-500"><b className="text-stone-600">Cardio · </b>{p.cardio}</p>
              <p className="text-[13px] text-stone-500 mt-1"><b className="text-stone-600">Muscu · </b>{p.muscu}</p>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-4 text-[13px] text-stone-500 leading-relaxed">
        Aucun souci de santé connu : cette progression convient à un démarrage autonome. En cas d'essoufflement
        inhabituel, de douleur ou de gêne, ralentis et consulte un médecin avant de poursuivre.
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Motivation tab
--------------------------------------------------------- */
function MotivationTab() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-lg text-stone-800 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
          Pour tenir la distance
        </h2>
        <div className="flex flex-col gap-2">
          {TIPS.map((t, i) => (
            <div key={i} className="bg-white rounded-lg border border-stone-200 p-3 text-[13px] text-stone-600 flex gap-2">
              <span style={{ color: "#D8A93A" }}>•</span> {t}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-serif text-lg text-stone-800 mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
          Quand et comment ajuster
        </h2>
        <div className="flex flex-col gap-2">
          {ADJUSTMENTS.map((a, i) => (
            <div key={i} className="bg-white rounded-xl border border-stone-200 p-3">
              <p className="text-sm font-medium text-stone-800">{a.situ}</p>
              <p className="text-[13px] text-stone-500 mt-0.5">{a.action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}