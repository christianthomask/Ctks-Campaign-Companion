"use client";

import { useState, useMemo } from "react";
import type { CharacterDraft } from "@/app/player/character/create/page";

interface Props {
  draft: CharacterDraft;
  onUpdate: (updates: Partial<CharacterDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
}

// Starting equipment pools by class
const CLASS_EQUIPMENT: Record<string, EquipmentItem[]> = {
  fighter: [
    { id: "chain-mail", name: "Chain Mail", category: "Armor" },
    { id: "leather-armor-f", name: "Leather Armor", category: "Armor" },
    { id: "shield", name: "Shield", category: "Armor" },
    { id: "longsword", name: "Longsword", category: "Weapons" },
    { id: "greatsword", name: "Greatsword", category: "Weapons" },
    { id: "longbow", name: "Longbow", category: "Weapons" },
    { id: "handaxe-f", name: "Handaxe (x2)", category: "Weapons" },
    { id: "light-crossbow-f", name: "Light Crossbow", category: "Weapons" },
    { id: "dungeoneer-pack-f", name: "Dungeoneer's Pack", category: "Gear" },
    { id: "explorer-pack-f", name: "Explorer's Pack", category: "Gear" },
  ],
  wizard: [
    { id: "quarterstaff", name: "Quarterstaff", category: "Weapons" },
    { id: "dagger-w", name: "Dagger", category: "Weapons" },
    { id: "component-pouch-w", name: "Component Pouch", category: "Gear" },
    { id: "arcane-focus-w", name: "Arcane Focus", category: "Gear" },
    { id: "scholar-pack", name: "Scholar's Pack", category: "Gear" },
    { id: "explorer-pack-w", name: "Explorer's Pack", category: "Gear" },
    { id: "spellbook", name: "Spellbook", category: "Gear" },
  ],
  rogue: [
    { id: "rapier-r", name: "Rapier", category: "Weapons" },
    { id: "shortsword-r", name: "Shortsword", category: "Weapons" },
    { id: "shortbow", name: "Shortbow", category: "Weapons" },
    { id: "dagger-r", name: "Dagger (x2)", category: "Weapons" },
    { id: "leather-armor-r", name: "Leather Armor", category: "Armor" },
    { id: "thieves-tools", name: "Thieves' Tools", category: "Gear" },
    { id: "burglar-pack", name: "Burglar's Pack", category: "Gear" },
    { id: "dungeoneer-pack-r", name: "Dungeoneer's Pack", category: "Gear" },
    { id: "explorer-pack-r", name: "Explorer's Pack", category: "Gear" },
  ],
  cleric: [
    { id: "mace", name: "Mace", category: "Weapons" },
    { id: "warhammer", name: "Warhammer", category: "Weapons" },
    { id: "scale-mail-c", name: "Scale Mail", category: "Armor" },
    { id: "leather-armor-c", name: "Leather Armor", category: "Armor" },
    { id: "chain-mail-c", name: "Chain Mail", category: "Armor" },
    { id: "shield-c", name: "Shield", category: "Armor" },
    { id: "light-crossbow-c", name: "Light Crossbow", category: "Weapons" },
    { id: "holy-symbol-c", name: "Holy Symbol", category: "Gear" },
    { id: "priest-pack", name: "Priest's Pack", category: "Gear" },
    { id: "explorer-pack-c", name: "Explorer's Pack", category: "Gear" },
  ],
  ranger: [
    { id: "scale-mail-rng", name: "Scale Mail", category: "Armor" },
    { id: "leather-armor-rng", name: "Leather Armor", category: "Armor" },
    { id: "longbow-rng", name: "Longbow", category: "Weapons" },
    { id: "shortsword-rng", name: "Shortsword (x2)", category: "Weapons" },
    { id: "dungeoneer-pack-rng", name: "Dungeoneer's Pack", category: "Gear" },
    { id: "explorer-pack-rng", name: "Explorer's Pack", category: "Gear" },
  ],
  barbarian: [
    { id: "greataxe", name: "Greataxe", category: "Weapons" },
    { id: "handaxe-b", name: "Handaxe (x2)", category: "Weapons" },
    { id: "javelin-b", name: "Javelin (x4)", category: "Weapons" },
    { id: "explorer-pack-b", name: "Explorer's Pack", category: "Gear" },
  ],
  bard: [
    { id: "rapier-bd", name: "Rapier", category: "Weapons" },
    { id: "longsword-bd", name: "Longsword", category: "Weapons" },
    { id: "dagger-bd", name: "Dagger", category: "Weapons" },
    { id: "leather-armor-bd", name: "Leather Armor", category: "Armor" },
    { id: "lute", name: "Lute", category: "Gear" },
    { id: "diplomat-pack", name: "Diplomat's Pack", category: "Gear" },
    { id: "entertainer-pack", name: "Entertainer's Pack", category: "Gear" },
  ],
  druid: [
    { id: "wooden-shield", name: "Wooden Shield", category: "Armor" },
    { id: "scimitar", name: "Scimitar", category: "Weapons" },
    { id: "club", name: "Club", category: "Weapons" },
    { id: "leather-armor-d", name: "Leather Armor", category: "Armor" },
    { id: "druidic-focus", name: "Druidic Focus", category: "Gear" },
    { id: "explorer-pack-d", name: "Explorer's Pack", category: "Gear" },
    { id: "herbalism-kit", name: "Herbalism Kit", category: "Gear" },
  ],
  monk: [
    { id: "shortsword-mk", name: "Shortsword", category: "Weapons" },
    { id: "handaxe-mk", name: "Handaxe", category: "Weapons" },
    { id: "dart-mk", name: "Dart (x10)", category: "Weapons" },
    { id: "dungeoneer-pack-mk", name: "Dungeoneer's Pack", category: "Gear" },
    { id: "explorer-pack-mk", name: "Explorer's Pack", category: "Gear" },
  ],
  paladin: [
    { id: "longsword-p", name: "Longsword", category: "Weapons" },
    { id: "greatsword-p", name: "Greatsword", category: "Weapons" },
    { id: "javelin-p", name: "Javelin (x5)", category: "Weapons" },
    { id: "shield-p", name: "Shield", category: "Armor" },
    { id: "chain-mail-p", name: "Chain Mail", category: "Armor" },
    { id: "holy-symbol-p", name: "Holy Symbol", category: "Gear" },
    { id: "priest-pack-p", name: "Priest's Pack", category: "Gear" },
    { id: "explorer-pack-p", name: "Explorer's Pack", category: "Gear" },
  ],
  sorcerer: [
    { id: "light-crossbow-s", name: "Light Crossbow", category: "Weapons" },
    { id: "dagger-s", name: "Dagger (x2)", category: "Weapons" },
    { id: "component-pouch-s", name: "Component Pouch", category: "Gear" },
    { id: "arcane-focus-s", name: "Arcane Focus", category: "Gear" },
    { id: "dungeoneer-pack-s", name: "Dungeoneer's Pack", category: "Gear" },
    { id: "explorer-pack-s", name: "Explorer's Pack", category: "Gear" },
  ],
  warlock: [
    { id: "light-crossbow-wl", name: "Light Crossbow", category: "Weapons" },
    { id: "rapier-wl", name: "Rapier", category: "Weapons" },
    { id: "dagger-wl", name: "Dagger (x2)", category: "Weapons" },
    { id: "leather-armor-wl", name: "Leather Armor", category: "Armor" },
    { id: "component-pouch-wl", name: "Component Pouch", category: "Gear" },
    { id: "arcane-focus-wl", name: "Arcane Focus", category: "Gear" },
    { id: "scholar-pack-wl", name: "Scholar's Pack", category: "Gear" },
    { id: "dungeoneer-pack-wl", name: "Dungeoneer's Pack", category: "Gear" },
  ],
};

// Default equipment for unknown classes
const DEFAULT_EQUIPMENT: EquipmentItem[] = [
  { id: "dagger", name: "Dagger", category: "Weapons" },
  { id: "quarterstaff-def", name: "Quarterstaff", category: "Weapons" },
  { id: "leather-armor", name: "Leather Armor", category: "Armor" },
  { id: "explorer-pack", name: "Explorer's Pack", category: "Gear" },
  { id: "torch", name: "Torch (x5)", category: "Gear" },
  { id: "rope", name: "Hempen Rope (50 ft)", category: "Gear" },
  { id: "rations", name: "Rations (10 days)", category: "Gear" },
  { id: "waterskin", name: "Waterskin", category: "Gear" },
];

export function EquipmentStep({ draft, onUpdate, onNext, onBack }: Props) {
  const [search, setSearch] = useState("");

  const availableEquipment = useMemo(() => {
    return CLASS_EQUIPMENT[draft.class_id || ""] || DEFAULT_EQUIPMENT;
  }, [draft.class_id]);

  // Group items by category, filtered by search
  const grouped = useMemo(() => {
    const items = search.trim()
      ? availableEquipment.filter((item) =>
          item.name.toLowerCase().includes(search.toLowerCase())
        )
      : availableEquipment;

    const groups: Record<string, EquipmentItem[]> = {};
    for (const item of items) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [availableEquipment, search]);

  const selectedIds = new Set(draft.equipment.map((e) => e.item_id));

  const handleToggle = (item: EquipmentItem) => {
    if (selectedIds.has(item.id)) {
      onUpdate({
        equipment: draft.equipment.filter((e) => e.item_id !== item.id),
      });
    } else {
      onUpdate({
        equipment: [
          ...draft.equipment,
          { item_id: item.id, name: item.name, quantity: 1, equipped: true },
        ],
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-amber-400">Equipment</h2>
        <p className="mt-1 text-sm text-gray-400">
          Select your starting equipment.
          {draft.class_name && (
            <span className="text-gray-500">
              {" "}Showing options for {draft.class_name}.
            </span>
          )}
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search equipment..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />

      {/* Selected count */}
      <div className="text-sm text-gray-400">
        {draft.equipment.length} item{draft.equipment.length !== 1 ? "s" : ""}{" "}
        selected
      </div>

      {/* Equipment by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
            {category}
          </h3>
          <div className="space-y-2">
            {items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleToggle(item)}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-amber-500/50 bg-amber-950/20"
                      : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/80"
                  }`}
                >
                  {/* Checkbox indicator */}
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected
                        ? "border-amber-500 bg-amber-600"
                        : "border-gray-600 bg-gray-800"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      isSelected ? "text-amber-300" : "text-gray-200"
                    }`}
                  >
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div className="py-8 text-center text-gray-500">
          No equipment items match your search.
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
          className="min-h-[44px] rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
