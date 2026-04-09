import { memo } from "react";
import type { NpcEntry } from "@/lib/types/session";

interface Props {
  npcs: NpcEntry[];
}

export const NpcTable = memo(function NpcTable({ npcs }: Props) {
  return (
    <div className="space-y-2">
      {npcs.map((npc) => (
        <div
          key={npc.name}
          className="rounded-lg border border-gray-700 bg-gray-800 p-3"
        >
          <div className="flex items-baseline justify-between">
            <h4 className="font-semibold text-gray-100">{npc.name}</h4>
            <span className="text-xs text-gray-500">{npc.location}</span>
          </div>
          <p className="mt-1 text-xs text-purple-300">
            Voice: {npc.voice}
          </p>
          <p className="mt-1 text-sm text-gray-300">{npc.key_info}</p>
        </div>
      ))}
    </div>
  );
});
