// Supabase table types for Phase 1

import type { SessionContent } from "./session";

export interface Profile {
  id: string;
  display_name: string;
  role: "dm" | "player";
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  dm_user_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CampaignMember {
  campaign_id: string;
  user_id: string;
  role: "dm" | "player";
  joined_at: string;
}

export interface Session {
  id: string;
  campaign_id: string;
  title: string;
  session_number: number;
  subtitle: string | null;
  content: SessionContent;
  created_at: string;
  updated_at: string;
}

export interface SessionState {
  id: string;
  session_id: string;
  state_key: string;
  state_value: Record<string, unknown>;
  updated_at: string;
}

// Supabase database type map
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      campaigns: {
        Row: Campaign;
        Insert: Omit<Campaign, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<Campaign, "id" | "created_at">>;
      };
      campaign_members: {
        Row: CampaignMember;
        Insert: Omit<CampaignMember, "joined_at">;
        Update: Partial<CampaignMember>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<Session, "id" | "created_at">>;
      };
      session_state: {
        Row: SessionState;
        Insert: Omit<SessionState, "id" | "updated_at"> & { id?: string };
        Update: Partial<Omit<SessionState, "id">>;
      };
    };
  };
}
