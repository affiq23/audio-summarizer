export interface ActionItem {
  task: string;
  owner: string | null;
  deadline: string | null;
}

export interface MeetingResult {
  transcript: string;
  summary: string;
  key_points: string[];
  action_items: ActionItem[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}