import { memo } from "react";
import type { TreasureEntry } from "@/lib/types/session";

interface Props {
  treasure: TreasureEntry[];
}

export const TreasureTable = memo(function TreasureTable({ treasure }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-3 py-2 text-left font-medium text-gray-400 w-16">
              Room
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-400">
              Item
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-400">
              Value
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {treasure.map((entry, i) => (
            <tr key={i}>
              <td className="px-3 py-2 font-mono text-xs text-amber-400">
                {entry.room}
              </td>
              <td className="px-3 py-2 text-gray-200">{entry.item}</td>
              <td className="px-3 py-2 text-gray-400">{entry.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
