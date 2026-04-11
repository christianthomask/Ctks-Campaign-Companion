"use client";

import { memo, useState, useCallback } from "react";
import type { StatBlock as StatBlockType, Threat } from "@/lib/types/session";

function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function hpColor(current: number, max: number): string {
  const pct = max > 0 ? current / max : 0;
  if (current <= 0) return "text-gray-500";
  if (pct <= 0.25) return "text-red-400";
  if (pct <= 0.5) return "text-yellow-400";
  return "text-green-400";
}

function hpBarColor(current: number, max: number): string {
  const pct = max > 0 ? current / max : 0;
  if (current <= 0) return "bg-gray-600";
  if (pct <= 0.25) return "bg-red-500";
  if (pct <= 0.5) return "bg-yellow-500";
  return "bg-green-500";
}

interface Props {
  threat: Threat;
}

export const StatBlockCard = memo(function StatBlockCard({ threat }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [currentHp, setCurrentHp] = useState(threat.stat_block.hp);
  const [showDamageInput, setShowDamageInput] = useState(false);
  const [damageInput, setDamageInput] = useState("");
  const sb = threat.stat_block;

  const adjustHp = useCallback((amount: number) => {
    setCurrentHp((prev) => Math.max(0, Math.min(sb.hp, prev + amount)));
  }, [sb.hp]);

  function applyDamage() {
    const val = parseInt(damageInput);
    if (!isNaN(val) && val > 0) {
      adjustHp(-val);
    }
    setDamageInput("");
    setShowDamageInput(false);
  }

  function applyHealing() {
    const val = parseInt(damageInput);
    if (!isNaN(val) && val > 0) {
      adjustHp(val);
    }
    setDamageInput("");
    setShowDamageInput(false);
  }

  const isDead = currentHp <= 0;

  return (
    <div className={`my-3 rounded-lg border ${isDead ? "border-gray-800 opacity-60" : "border-gray-700"} bg-gray-800 overflow-hidden`}>
      {/* Collapsed header with HP tracker */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className={`font-semibold ${isDead ? "text-gray-500 line-through" : "text-gray-100"}`}>
            {sb.name}
          </span>
          {isDead && <span className="text-xs">💀</span>}
        </button>

        <span className="text-xs text-gray-400">
          AC <span className="font-mono text-gray-200">{sb.ac}</span>
        </span>

        {/* HP display with buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); adjustHp(-1); }}
            className="flex h-7 w-7 items-center justify-center rounded bg-red-900/50 text-xs font-bold text-red-300 hover:bg-red-900/80 active:scale-95"
            title="Subtract 1 HP (long press for custom)"
            onContextMenu={(e) => { e.preventDefault(); setShowDamageInput(true); }}
          >
            -
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDamageInput(!showDamageInput); }}
            className={`min-w-[60px] rounded px-1.5 py-0.5 text-center font-mono text-sm font-bold ${hpColor(currentHp, sb.hp)}`}
          >
            {currentHp}/{sb.hp}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); adjustHp(1); }}
            className="flex h-7 w-7 items-center justify-center rounded bg-green-900/50 text-xs font-bold text-green-300 hover:bg-green-900/80 active:scale-95"
            title="Add 1 HP"
          >
            +
          </button>
        </div>

        <span className="text-xs text-gray-400">
          CR <span className="font-mono text-gray-200">{sb.cr}</span>
        </span>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
      </div>

      {/* HP bar */}
      <div className="mx-3 mb-2 h-1 rounded-full bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${hpBarColor(currentHp, sb.hp)}`}
          style={{ width: `${Math.max(0, (currentHp / sb.hp) * 100)}%` }}
        />
      </div>

      {/* Damage/healing input */}
      {showDamageInput && (
        <div className="mx-3 mb-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="number"
            value={damageInput}
            onChange={(e) => setDamageInput(e.target.value)}
            placeholder="Amount"
            autoFocus
            className="w-20 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-center font-mono text-sm text-gray-100 focus:border-amber-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") applyDamage();
              if (e.key === "Escape") setShowDamageInput(false);
            }}
          />
          <button onClick={applyDamage} className="rounded bg-red-900/60 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-900/80">
            Damage
          </button>
          <button onClick={applyHealing} className="rounded bg-green-900/60 px-2 py-1 text-xs font-medium text-green-300 hover:bg-green-900/80">
            Heal
          </button>
          <button onClick={() => { setCurrentHp(sb.hp); setShowDamageInput(false); }} className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-400 hover:bg-gray-600">
            Reset
          </button>
        </div>
      )}

      {/* Expanded stat block */}
      {expanded && (
        <div className="border-t border-gray-700 px-4 py-3">
          {/* AC, HP, Speed */}
          <div className="mb-3 space-y-1 text-sm">
            <p>
              <span className="font-semibold text-gray-300">Armor Class</span>{" "}
              <span className="font-mono text-gray-100">{sb.ac}</span>
              {sb.ac_note && <span className="text-gray-400"> ({sb.ac_note})</span>}
            </p>
            <p>
              <span className="font-semibold text-gray-300">Hit Points</span>{" "}
              <span className={`font-mono font-bold ${hpColor(currentHp, sb.hp)}`}>{currentHp}/{sb.hp}</span>
              <span className="text-gray-400"> ({sb.hp_formula})</span>
            </p>
            <p>
              <span className="font-semibold text-gray-300">Speed</span>{" "}
              <span className="text-gray-100">{sb.speed}</span>
            </p>
          </div>

          {/* Ability scores */}
          {sb.abilities && (
            <div className="mb-3 grid grid-cols-6 gap-1 rounded bg-gray-900 p-2 text-center text-xs">
              {(["str", "dex", "con", "int", "wis", "cha"] as const).map((ability) => (
                <div key={ability}>
                  <div className="font-semibold uppercase text-gray-400">{ability}</div>
                  <div className="font-mono text-gray-100">{sb.abilities![ability]}</div>
                  <div className="font-mono text-gray-400">({abilityModifier(sb.abilities![ability])})</div>
                </div>
              ))}
            </div>
          )}

          {/* Resistances, immunities */}
          <div className="mb-3 space-y-1 text-sm">
            {sb.damage_vulnerabilities && sb.damage_vulnerabilities.length > 0 && (
              <p><span className="font-semibold text-gray-300">Damage Vulnerabilities</span> <span className="text-gray-100">{sb.damage_vulnerabilities.join(", ")}</span></p>
            )}
            {sb.damage_resistances && sb.damage_resistances.length > 0 && (
              <p><span className="font-semibold text-gray-300">Damage Resistances</span> <span className="text-gray-100">{sb.damage_resistances.join(", ")}</span></p>
            )}
            {sb.damage_immunities && sb.damage_immunities.length > 0 && (
              <p><span className="font-semibold text-gray-300">Damage Immunities</span> <span className="text-gray-100">{sb.damage_immunities.join(", ")}</span></p>
            )}
            {sb.condition_immunities && sb.condition_immunities.length > 0 && (
              <p><span className="font-semibold text-gray-300">Condition Immunities</span> <span className="text-gray-100">{sb.condition_immunities.join(", ")}</span></p>
            )}
            {sb.senses && <p><span className="font-semibold text-gray-300">Senses</span> <span className="text-gray-100">{sb.senses}</span></p>}
            {sb.languages && <p><span className="font-semibold text-gray-300">Languages</span> <span className="text-gray-100">{sb.languages}</span></p>}
          </div>

          {/* Special abilities */}
          {sb.special_abilities && sb.special_abilities.length > 0 && (
            <div className="mb-3 border-t border-gray-700 pt-3">
              {sb.special_abilities.map((ability) => (
                <p key={ability.name} className="mb-2 text-sm">
                  <span className="font-semibold italic text-gray-100">{ability.name}.</span>{" "}
                  <span className="text-gray-300">{ability.description}</span>
                </p>
              ))}
            </div>
          )}

          {/* Attacks */}
          {sb.attacks && sb.attacks.length > 0 && (
            <div className="border-t border-gray-700 pt-3">
              <h4 className="mb-2 text-sm font-semibold text-red-400">Actions</h4>
              {sb.attacks.map((attack) => (
                <p key={attack.name} className="mb-2 text-sm">
                  <span className="font-semibold italic text-gray-100">{attack.name}.</span>{" "}
                  <span className="italic text-gray-400">+<span className="font-mono">{attack.to_hit}</span> to hit, reach {attack.reach}.</span>{" "}
                  <span className="text-gray-300">Hit: <span className="font-mono">{attack.damage}</span> {attack.damage_type} damage.</span>
                  {attack.effects && <span className="text-gray-400"> {attack.effects}</span>}
                </p>
              ))}
            </div>
          )}

          {/* Combat notes */}
          {threat.behavior && (
            <div className="mt-3 border-t border-gray-700 pt-3">
              <p className="text-sm"><span className="font-semibold text-blue-300">Behavior:</span> <span className="text-gray-300">{threat.behavior}</span></p>
            </div>
          )}
          {threat.combat_notes && (
            <p className="mt-2 text-sm"><span className="font-semibold text-blue-300">Tactics:</span> <span className="text-gray-300">{threat.combat_notes}</span></p>
          )}
          {threat.trigger && (
            <p className="mt-2 text-sm"><span className="font-semibold text-red-300">Trigger:</span> <span className="text-gray-300">{threat.trigger}</span></p>
          )}
        </div>
      )}
    </div>
  );
});
