import type { SessionContent } from "@/lib/types/session";

export interface SearchResult {
  sectionId: string;
  sectionTitle: string;
  field: string;
  snippet: string;
  matchIndex: number;
}

export function buildSearchIndex(content: SessionContent): SearchableEntry[] {
  const entries: SearchableEntry[] = [];

  for (const act of content.acts) {
    for (const section of act.sections) {
      entries.push({
        sectionId: section.id,
        sectionTitle: section.title,
        field: "title",
        text: section.title,
      });

      if (section.description) {
        entries.push({
          sectionId: section.id,
          sectionTitle: section.title,
          field: "description",
          text: section.description,
        });
      }

      if (section.read_aloud) {
        entries.push({
          sectionId: section.id,
          sectionTitle: section.title,
          field: "read-aloud",
          text: section.read_aloud,
        });
      }

      section.threats?.forEach((threat) => {
        entries.push({
          sectionId: section.id,
          sectionTitle: section.title,
          field: "creature",
          text: `${threat.name} ${threat.behavior} ${threat.combat_notes}`,
        });
      });

      section.dm_notes?.forEach((note) => {
        entries.push({
          sectionId: section.id,
          sectionTitle: section.title,
          field: "DM note",
          text: `${note.title || ""} ${note.content}`,
        });
      });

      section.interactions?.forEach((interaction) => {
        entries.push({
          sectionId: section.id,
          sectionTitle: section.title,
          field: "interaction",
          text: `${interaction.action} ${interaction.check || ""} ${interaction.result}`,
        });
      });
    }
  }

  // NPCs
  content.quick_reference.npcs.forEach((npc) => {
    entries.push({
      sectionId: "npcs",
      sectionTitle: "Quick Reference — NPCs",
      field: "NPC",
      text: `${npc.name} ${npc.location} ${npc.voice} ${npc.key_info}`,
    });
  });

  return entries;
}

interface SearchableEntry {
  sectionId: string;
  sectionTitle: string;
  field: string;
  text: string;
}

export function searchContent(
  index: SearchableEntry[],
  query: string
): SearchResult[] {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const entry of index) {
    const lowerText = entry.text.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerQuery);

    if (matchIndex === -1) continue;

    // Deduplicate by section + field
    const key = `${entry.sectionId}:${entry.field}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Extract snippet around the match
    const start = Math.max(0, matchIndex - 40);
    const end = Math.min(entry.text.length, matchIndex + query.length + 40);
    let snippet = entry.text.slice(start, end).trim();
    if (start > 0) snippet = "..." + snippet;
    if (end < entry.text.length) snippet = snippet + "...";

    results.push({
      sectionId: entry.sectionId,
      sectionTitle: entry.sectionTitle,
      field: entry.field,
      snippet,
      matchIndex,
    });
  }

  return results.slice(0, 20);
}
