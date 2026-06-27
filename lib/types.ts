export type Entry = {
  id?: number;
  day: string;
  text: string;
  created_at?: string;
  updated_at?: string;
};

export type Streak = {
  current: number;
  best: number;
  loggedToday: boolean;
  lastDay: string | null;
};

export type Quote = {
  id: number;
  text: string;
  author: string;
  score: number;
  last_seen_at: string | null;
  created_at?: string;
  updated_at?: string;
  is_core?: boolean;
};
