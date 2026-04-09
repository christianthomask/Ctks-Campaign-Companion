"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
  onUpdate: (updates: Partial<CharacterDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface ClassData {
  id: string;
  name: string;
  hit_die: number;
  primary_abilities: string;
  flavor: string;
  complexity: number; // 1-3
  archetype: string; // martial, skill, caster, hybrid
  skill_choices: string[];
  skill_count: number;
}

// Static PHB classes as fallback
const STATIC_CLASSES: ClassData[] = [
  {
    id: "fighter",
    name: "Fighter",
    hit_die: 10,
    primary_abilities: "STR or DEX, CON",
    flavor: "A master of martial combat, skilled with a variety of weapons and armor. You are the backbone of any adventuring party.",
    complexity: 1,
    archetype: "martial",
    skill_choices: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"],
    skill_count: 2,
  },
  {
    id: "wizard",
    name: "Wizard",
    hit_die: 6,
    primary_abilities: "INT",
    flavor: "A scholarly magic-user who commands reality through intense study and arcane formulae. Your spellbook is your greatest treasure.",
    complexity: 3,
    archetype: "caster",
    skill_choices: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"],
    skill_count: 2,
  },
  {
    id: "rogue",
    name: "Rogue",
    hit_die: 8,
    primary_abilities: "DEX, INT or CHA",
    flavor: "A scoundrel who uses stealth and trickery to overcome obstacles. You strike from the shadows and always have an escape plan.",
    complexity: 2,
    archetype: "skill",
    skill_choices: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"],
    skill_count: 4,
  },
  {
    id: "cleric",
    name: "Cleric",
    hit_die: 8,
    primary_abilities: "WIS, STR or CON",
    flavor: "A priestly champion who wields divine magic in service of a higher power. You are healer, protector, and holy warrior.",
    complexity: 2,
    archetype: "hybrid",
    skill_choices: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
    skill_count: 2,
  },
  {
    id: "ranger",
    name: "Ranger",
    hit_die: 10,
    primary_abilities: "DEX, WIS",
    flavor: "A warrior of the wilderness who uses martial prowess and nature magic to hunt the monsters that threaten civilization.",
    complexity: 2,
    archetype: "hybrid",
    skill_choices: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"],
    skill_count: 3,
  },
  {
    id: "barbarian",
    name: "Barbarian",
    hit_die: 12,
    primary_abilities: "STR, CON",
    flavor: "A fierce warrior who can enter a battle rage. Primal instincts and raw fury make you a devastating force on the battlefield.",
    complexity: 1,
    archetype: "martial",
    skill_choices: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"],
    skill_count: 2,
  },
  {
    id: "bard",
    name: "Bard",
    hit_die: 8,
    primary_abilities: "CHA, DEX",
    flavor: "An inspiring magician whose music and words weave spells of power. You know a little of everything and charm your way through any situation.",
    complexity: 3,
    archetype: "skill",
    skill_choices: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"],
    skill_count: 3,
  },
  {
    id: "druid",
    name: "Druid",
    hit_die: 8,
    primary_abilities: "WIS, CON",
    flavor: "A priest of the Old Faith, wielding the powers of nature and adopting animal forms. The natural world is your domain.",
    complexity: 3,
    archetype: "caster",
    skill_choices: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"],
    skill_count: 2,
  },
  {
    id: "monk",
    name: "Monk",
    hit_die: 8,
    primary_abilities: "DEX, WIS",
    flavor: "A master of martial arts, harnessing the power of ki to perform extraordinary feats. Speed and precision are your weapons.",
    complexity: 2,
    archetype: "martial",
    skill_choices: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"],
    skill_count: 2,
  },
  {
    id: "paladin",
    name: "Paladin",
    hit_die: 10,
    primary_abilities: "STR, CHA",
    flavor: "A holy warrior bound to a sacred oath. You combine martial might with divine spells to smite evil and protect the innocent.",
    complexity: 2,
    archetype: "hybrid",
    skill_choices: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"],
    skill_count: 2,
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    hit_die: 6,
    primary_abilities: "CHA, CON",
    flavor: "A spellcaster who draws on inherent magic from a gift or bloodline. Raw magical power flows through your veins.",
    complexity: 2,
    archetype: "caster",
    skill_choices: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"],
    skill_count: 2,
  },
  {
    id: "warlock",
    name: "Warlock",
    hit_die: 8,
    primary_abilities: "CHA, CON",
    flavor: "A wielder of magic derived from a bargain with an extraplanar entity. Your patron grants you eldritch power at a price.",
    complexity: 2,
    archetype: "caster",
    skill_choices: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"],
    skill_count: 2,
  },
];

const COMPLEXITY_LABELS = ["", "Simple", "Moderate", "Complex"];
const COMPLEXITY_COLORS = ["", "text-green-400", "text-yellow-400", "text-red-400"];

export function ClassStep({ draft, onUpdate, onNext, onBack }: Props) {
  const [classes, setClasses] = useState<ClassData[]>(STATIC_CLASSES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fetch classes from Supabase
  useEffect(() => {
    let cancelled = false;

    async function fetchClasses() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("ref_classes")
          .select("id, name, hit_die, primary_abilities, flavor, complexity, archetype, skill_choices, skill_count")
          .order("name");

        if (!cancelled && data && data.length > 0 && !error) {
          setClasses(data as ClassData[]);
        }
      } catch {
        // Keep static fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter by archetype (if set) and search query
  const filteredClasses = useMemo(() => {
    let result = classes;

    // Filter by archetype
    if (draft.archetype) {
      result = result.filter((c) => c.archetype === draft.archetype);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.primary_abilities.toLowerCase().includes(q) ||
          c.flavor.toLowerCase().includes(q)
      );
    }

    return result;
  }, [classes, draft.archetype, search]);

  // Get the currently selected class data
  const selectedClass = classes.find((c) => c.id === draft.class_id);

  const handleSelectClass = (cls: ClassData) => {
    // If switching classes, reset skill proficiencies
    const resetSkills = draft.class_id !== cls.id;
    onUpdate({
      class_id: cls.id,
      class_name: cls.name,
      hit_die: cls.hit_die,
      ...(resetSkills ? { skill_proficiencies: [] } : {}),
    });
  };

  const handleToggleSkill = (skill: string) => {
    if (!selectedClass) return;
    const current = draft.skill_proficiencies;

    if (current.includes(skill)) {
      onUpdate({ skill_proficiencies: current.filter((s) => s !== skill) });
    } else {
      // Enforce skill count limit
      if (current.length >= selectedClass.skill_count) return;
      onUpdate({ skill_proficiencies: [...current, skill] });
    }
  };

  const canContinue =
    draft.class_id &&
    selectedClass &&
    draft.skill_proficiencies.length === selectedClass.skill_count;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">Choose Your Class</h2>
        <p className="mt-1 text-sm text-gray-400">
          Your class defines your combat abilities, skills, and how you interact
          with the world.
          {draft.archetype && (
            <span className="text-gray-500">
              {" "}Filtered by your archetype selection.
            </span>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search classes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        {draft.archetype && (
          <button
            onClick={() => onUpdate({ archetype: null })}
            className="min-h-[44px] shrink-0 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
          >
            Show All
          </button>
        )}
      </div>

      {/* Class cards */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading classes...</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredClasses.map((cls) => {
            const isSelected = draft.class_id === cls.id;
            return (
              <button
                key={cls.id}
                onClick={() => handleSelectClass(cls)}
                className={`min-h-[44px] rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-950/30 ring-2 ring-amber-500/30"
                    : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/80"
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-100">
                    {cls.name}
                  </h3>
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                    d{cls.hit_die}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-amber-400">
                  {cls.primary_abilities}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {cls.flavor}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs font-medium ${COMPLEXITY_COLORS[cls.complexity]}`}>
                    {COMPLEXITY_LABELS[cls.complexity]}
                  </span>
                  <span className="text-xs text-gray-600">
                    {"*".repeat(cls.complexity)}
                  </span>
                </div>
              </button>
            );
          })}

          {filteredClasses.length === 0 && (
            <p className="col-span-full py-8 text-center text-gray-500">
              No classes match your filters.
            </p>
          )}
        </div>
      )}

      {/* Skill proficiency selection */}
      {selectedClass && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h3 className="mb-1 font-semibold text-gray-100">
            Skill Proficiencies
          </h3>
          <p className="mb-3 text-xs text-gray-400">
            Choose {selectedClass.skill_count} skill
            {selectedClass.skill_count !== 1 ? "s" : ""} from the list below.
            <span className="ml-1 text-amber-400">
              ({draft.skill_proficiencies.length}/{selectedClass.skill_count} selected)
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedClass.skill_choices.map((skill) => {
              const isChecked = draft.skill_proficiencies.includes(skill);
              const isDisabled =
                !isChecked &&
                draft.skill_proficiencies.length >= selectedClass.skill_count;
              return (
                <button
                  key={skill}
                  onClick={() => handleToggleSkill(skill)}
                  disabled={isDisabled}
                  className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm transition-all ${
                    isChecked
                      ? "border-amber-500 bg-amber-950/40 text-amber-300"
                      : isDisabled
                      ? "cursor-not-allowed border-gray-800 bg-gray-900/50 text-gray-600"
                      : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600 hover:text-gray-200"
                  }`}
                >
                  {isChecked && (
                    <span className="mr-1 text-amber-400" aria-hidden="true">
                      &#10003;
                    </span>
                  )}
                  {skill}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="min-h-[44px] rounded-lg border border-gray-700 bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
