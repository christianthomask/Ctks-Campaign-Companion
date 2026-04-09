"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WelcomeStep } from "@/components/character/WelcomeStep";
import { ConceptStep } from "@/components/character/ConceptStep";
import { RaceStep } from "@/components/character/RaceStep";
import { ClassStep } from "@/components/character/ClassStep";
import { AbilityScoresStep } from "@/components/character/AbilityScoresStep";
import { BackgroundStep } from "@/components/character/BackgroundStep";
import { EquipmentStep } from "@/components/character/EquipmentStep";
import { SpellsStep } from "@/components/character/SpellsStep";
import { BackstoryStep } from "@/components/character/BackstoryStep";
import { ReviewStep } from "@/components/character/ReviewStep";
import { CharacterPreview } from "@/components/character/CharacterPreview";

export interface CharacterDraft {
  // Step 1-3
  archetype: string | null;
  race_id: string | null;
  race_name: string;
  class_id: string | null;
  class_name: string;
  hit_die: number;
  skill_proficiencies: string[];

  // Step 4
  str_base: number;
  dex_base: number;
  con_base: number;
  int_base: number;
  wis_base: number;
  cha_base: number;
  ability_score_method: string;

  // Step 5
  background_id: string | null;
  background_name: string;
  personality_traits: string;
  ideals: string;
  bonds: string;
  flaws: string;

  // Step 6
  equipment: Array<{ item_id: string; name: string; quantity: number; equipped: boolean }>;

  // Step 7
  cantrips_known: string[];
  spells_known: string[];

  // Step 8
  name: string;
  appearance: string;
  backstory: string;
  book_donation: string;
  motivation: string;
}

const INITIAL_DRAFT: CharacterDraft = {
  archetype: null,
  race_id: null,
  race_name: "",
  class_id: null,
  class_name: "",
  hit_die: 8,
  skill_proficiencies: [],
  str_base: 10,
  dex_base: 10,
  con_base: 10,
  int_base: 10,
  wis_base: 10,
  cha_base: 10,
  ability_score_method: "standard_array",
  background_id: null,
  background_name: "",
  personality_traits: "",
  ideals: "",
  bonds: "",
  flaws: "",
  equipment: [],
  cantrips_known: [],
  spells_known: [],
  name: "",
  appearance: "",
  backstory: "",
  book_donation: "",
  motivation: "",
};

const STEP_NAMES = [
  "Welcome",
  "Concept",
  "Race",
  "Class",
  "Abilities",
  "Background",
  "Equipment",
  "Spells",
  "Backstory",
  "Review",
];

export default function CreateCharacterPage() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CharacterDraft>(INITIAL_DRAFT);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const updateDraft = useCallback(
    (updates: Partial<CharacterDraft>) => {
      setDraft((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const nextStep = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEP_NAMES.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const prevStep = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goToStep = useCallback((s: number) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  async function handleFinalize() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get campaign
      const { data: membership } = await supabase
        .from("campaign_members")
        .select("campaign_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      const campaignId = membership?.campaign_id;
      if (!campaignId) {
        alert("No campaign found. Ask your DM to invite you.");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("characters").insert({
        user_id: user.id,
        campaign_id: campaignId,
        name: draft.name || "Unnamed Hero",
        status: "complete",
        race_id: draft.race_id,
        class_id: draft.class_id,
        background_id: draft.background_id,
        level: 1,
        str_base: draft.str_base,
        dex_base: draft.dex_base,
        con_base: draft.con_base,
        int_base: draft.int_base,
        wis_base: draft.wis_base,
        cha_base: draft.cha_base,
        ability_score_method: draft.ability_score_method,
        skill_proficiencies: draft.skill_proficiencies,
        equipment: draft.equipment,
        cantrips_known: draft.cantrips_known,
        spells_known: draft.spells_known,
        personality_traits: draft.personality_traits,
        ideals: draft.ideals,
        bonds: draft.bonds,
        flaws: draft.flaws,
        backstory: draft.backstory,
        book_donation: draft.book_donation,
        motivation: draft.motivation,
        appearance: draft.appearance,
      });

      if (error) {
        console.error("Failed to save character:", error);
        alert("Failed to save character: " + error.message);
      } else {
        router.push("/player/character");
        router.refresh();
      }
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  }

  // Determine if spells step should be shown
  const isCaster = ["wizard", "sorcerer", "warlock", "bard", "cleric", "druid", "paladin", "ranger"].includes(
    draft.class_id || ""
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep onNext={nextStep} />;
      case 1:
        return <ConceptStep draft={draft} onUpdate={updateDraft} onNext={nextStep} onBack={prevStep} />;
      case 2:
        return <RaceStep draft={draft} onUpdate={updateDraft} onNext={nextStep} onBack={prevStep} />;
      case 3:
        return <ClassStep draft={draft} onUpdate={updateDraft} onNext={nextStep} onBack={prevStep} />;
      case 4:
        return <AbilityScoresStep draft={draft} onUpdate={updateDraft} onNext={nextStep} onBack={prevStep} />;
      case 5:
        return <BackgroundStep draft={draft} onUpdate={updateDraft} onNext={nextStep} onBack={prevStep} />;
      case 6:
        return <EquipmentStep draft={draft} onUpdate={updateDraft} onNext={isCaster ? nextStep : () => goToStep(8)} onBack={prevStep} />;
      case 7:
        return <SpellsStep draft={draft} onUpdate={updateDraft} onNext={nextStep} onBack={prevStep} />;
      case 8:
        return <BackstoryStep draft={draft} onUpdate={updateDraft} onNext={nextStep} onBack={isCaster ? prevStep : () => goToStep(6)} />;
      case 9:
        return <ReviewStep draft={draft} onBack={prevStep} onFinalize={handleFinalize} onGoToStep={goToStep} saving={saving} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full">
      {/* Progress bar */}
      <div className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
        <div className="px-4 py-3">
          <div className="mx-auto max-w-4xl">
            <div className="mb-2 flex items-center justify-between">
              <h1 className="text-sm font-semibold text-amber-400">
                Create Character
              </h1>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-gray-400 hover:text-gray-200 md:hidden"
              >
                {showPreview ? "Hide" : "Show"} Preview
              </button>
            </div>
            {/* Step indicators */}
            <div className="flex gap-1">
              {STEP_NAMES.map((name, i) => (
                <button
                  key={name}
                  onClick={() => goToStep(i)}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i === step
                      ? "bg-amber-400"
                      : i < step
                      ? "bg-amber-600/50"
                      : "bg-gray-800"
                  }`}
                  title={name}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Step {step + 1}: {STEP_NAMES[step]}
            </p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-2xl">{renderStep()}</div>
        </main>

        {/* Desktop preview sidebar */}
        <aside className="hidden w-72 shrink-0 border-l border-gray-800 bg-gray-900 md:block">
          <div className="sticky top-[73px] max-h-[calc(100vh-73px)] overflow-y-auto p-4">
            <CharacterPreview draft={draft} />
          </div>
        </aside>
      </div>

      {/* Mobile preview panel */}
      {showPreview && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPreview(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-gray-700 bg-gray-900 p-4">
            <div className="mb-3 flex justify-center">
              <div className="h-1 w-8 rounded-full bg-gray-600" />
            </div>
            <CharacterPreview draft={draft} />
          </div>
        </div>
      )}
    </div>
  );
}
