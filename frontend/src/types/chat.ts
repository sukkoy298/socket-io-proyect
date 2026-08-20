export type ChatMessage = {
  id: string;
  user: string;
  color: string;
  type: "texto" | "sticker";
  content: string;
  time: string;
};

export type SystemNote = {
  text: string;
  time: string;
};

export type OnlineUser = {
  name: string;
  color: string;
};

export type Item =
  | { kind: "message"; message: ChatMessage; own: boolean }
  | { kind: "system"; note: SystemNote };

export type Toast = {
  user: string;
  color: string;
  text: string;
};
