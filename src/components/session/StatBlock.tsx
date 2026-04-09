"use client";

import { memo, useState } from "react";
import type { StatBlock as StatBlockType, Threat } from "@/lib/types/session";

function abilityModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

interface Props {
  threat: Threat;
}

export const StatBlockCard = memo(function StatBlockCard({ threat }: Props) {
  const [expanded, setExpanded] = useState(false);
  const sb = threat.stat_block;

  return (
    <div className="my-3 rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex-1 font-semibold text-gray-100">{sb.name}</span>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>
            AC <span className="font-mono text-gray-200">{sb.ac}</span>
          </span>
          <span>
            HP <span className="font-mono text-gray-200">{sb.hp}</span>
          </span>
          <span>
            CR <span className="font-mono text-gray-200">{sb.cr}</span>
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Expanded stat block */}
      {expanded && (
        <div className="border-t border-gray-700 px-4 py-3">
          {/* AC, HP, Speed */}
          <div className="mb-3 space-y-1 text-sm">
            <p>
              <span className="font-semibold text-gray-300">Armor Class</span>{" "}
              <span className="font-mono text-gray-100">{sb.ac}</span>
              {sb.ac_note && (
                <span className="text-gray-400"> ({sb.ac_note})</span>
              )}
            </p>
            <p>
              <span className="font-semibold text-gray-300">Hit Points</span>{" "}
              <span className="font-mono text-gray-100">{sb.hp}</span>
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
              {(["str", "dex", "con", "int", "wis", "cha"] as const).map(
                (ability) => (
                  <div key={ability}>
                    <div className="font-semibold uppercase text-gray-400">
                      {ability}
                    </div>
                    <div className="font-mono text-gray-100">
                      {sb.abilities![ability]}
                    </div>
                    <div className="font-mono text-gray-400">
                      ({abilityModifier(sb.abilities![ability])})
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Resistances, immunities, etc. */}
          <div className="mb-3 space-y-1 text-sm">
            {sb.damage_vulnerabilities && sb.damage_vulnerabilities.length > 0 && (
              <p>
                <span className="font-semibold text-gray-300">Damage Vulnerabilities</span>{" "}
                <span className="text-gray-100">{sb.damage_vulnerabilities.join(", ")}</span>
              </p>
            )}
            {sb.damage_resistances && sb.damage_resistances.length > 0 && (
              <p>
                <span className="font-semibold text-gray-300">Damage Resistances</span>{" "}
                <span className="text-gray-100">{sb.damage_resistances.join(", ")}</span>
              </p>
            )}
            {sb.damage_immunities && sb.damage_immunities.length > 0 && (
              <p>
                <span className="font-semibold text-gray-300">Damage Immunities</span>{" "}
                <span className="text-gray-100">{sb.damage_immunities.join(", ")}</span>
              </p>
            )}
            {sb.condition_immunities && sb.condition_immunities.length > 0 && (
              <p>
                <span className="font-semibold text-gray-300">Condition Immunities</span>{" "}
                <span className="text-gray-100">{sb.condition_immunities.join(", ")}</span>
              </p>
            )}
            {sb.senses && (
              <p>
                <span className="font-semibold text-gray-300">Senses</span>{" "}
                <span className="text-gray-100">{sb.senses}</span>
              </p>
            )}
            {sb.languages && (
              <p>
                <span className="font-semibold text-gray-300">Languages</span>{" "}
                <span className="text-gray-100">{sb.languages}</span>
              </p>
            )}
          </div>

          {/* Special abilities */}
          {sb.special_abilities && sb.special_abilities.length > 0 && (
            <div className="mb-3 border-t border-gray-700 pt-3">
              {sb.special_abilities.map((ability) => (
                <p key={ability.name} className="mb-2 text-sm">
                  <span className="font-semibold italic text-gray-100">
                    {ability.name}.
                  </span>{" "}
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
                  <span className="font-semibold italic text-gray-100">
                    {attack.name}.
                  </span>{" "}
                  <span className="italic text-gray-400">
                    +<span className="font-mono">{attack.to_hit}</span> to hit,
                    reach {attack.reach}.
                  </span>{" "}
                  <span className="text-gray-300">
                    Hit: <span className="font-mono">{attack.damage}</span>{" "}
                    {attack.damage_type} damage.
                  </span>
                  {attack.effects && (
                    <span className="text-gray-400"> {attack.effects}</span>
                  )}
                </p>
              ))}
            </div>
          )}

          {/* Combat notes */}
          {threat.behavior && (
            <div className="mt-3 border-t border-gray-700 pt-3">
              <p className="text-sm">
                <span className="font-semibold text-blue-300">Behavior:</span>{" "}
                <span className="text-gray-300">{threat.behavior}</span>
              </p>
            </div>
          )}
          {threat.combat_notes && (
            <p className="mt-2 text-sm">
              <span className="font-semibold text-blue-300">Tactics:</span>{" "}
              <span className="text-gray-300">{threat.combat_notes}</span>
            </p>
          )}
          {threat.trigger && (
            <p className="mt-2 text-sm">
              <span className="font-semibold text-red-300">Trigger:</span>{" "}
              <span className="text-gray-300">{threat.trigger}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
});
