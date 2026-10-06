import { randomUUID } from "node:crypto";
import type { Server } from "socket.io";
import type { StoredMessage } from "./db.js";

export type BotChatMessage = { role: "user" | "assistant"; content: string };

export type BotOptions = {
  name: string;
  color: string;
  /** Base del backend RAG OpenAI-compatible, p. ej. http://127.0.0.1:8787 */
  baseUrl: string;
  apiKey?: string;
  model?: string;
  /** "mention": solo responde cuando lo mencionan; "all": responde a todo. */
  trigger: "mention" | "all";
  /** Salas donde participa. Vacío = todas. */
  rooms: string[];
  maxHistory: number;
};

export type BotHooks = {
  saveMessage: (message: StoredMessage) => void;
  getRecentMessages: (room: string, limit?: number) => StoredMessage[];
  onTypingChange: () => void;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Bot virtual: un participante más del chat que responde consultando
 * el backend RAG (chat-key-retrieval) y emite sus respuestas por Socket.IO.
 */
export class RAGBot {
  readonly name: string;
  readonly color: string;

  private readonly history = new Map<string, BotChatMessage[]>();
  private readonly typingRooms = new Set<string>();

  constructor(
    private readonly io: Server,
    private readonly options: BotOptions,
    private readonly hooks: BotHooks,
  ) {
    this.name = options.name;
    this.color = options.color;
  }

  enabledIn(room: string): boolean {
    return this.options.rooms.length === 0 || this.options.rooms.includes(room);
  }

  publicUser(): { name: string; color: string; isAdmin: boolean } {
    return { name: this.name, color: this.color, isAdmin: false };
  }

  isTyping(room: string): boolean {
    return this.typingRooms.has(room);
  }

  private historyFor(room: string): BotChatMessage[] {
    let messages = this.history.get(room);
    if (!messages) {
      messages = this.hooks
        .getRecentMessages(room, 40)
        .filter((message) => message.type === "texto")
        .map((message) => ({
          role: message.user === this.name ? "assistant" : "user",
          content: message.content,
        }));
      this.history.set(room, messages);
    }
    return messages;
  }

  /** Formas válidas de mención: nombre completo y primera palabra (p. ej. "@Sky"). */
  private mentionPatterns(): RegExp[] {
    const name = this.name.trim();
    const forms = new Set([name, name.split(/\s+/)[0]]);
    return [...forms]
      .filter((form) => form.length >= 3)
      .map((form) => new RegExp(`@?${escapeRegExp(form)}\\b[:,]?`, "i"));
  }

  /** Devuelve la pregunta limpia (sin la mención) o null si no hay que responder. */
  private matchTrigger(content: string): string | null {
    const trimmed = content.trim();
    if (this.options.trigger === "all") return trimmed || null;

    for (const pattern of this.mentionPatterns()) {
      if (!pattern.test(trimmed)) continue;
      const clean = trimmed.replace(pattern, " ").replace(/\s+/g, " ").trim();
      return clean || null;
    }
    return null;
  }

  async onUserMessage(room: string, content: string): Promise<void> {
    if (!this.enabledIn(room)) return;

    const question = this.matchTrigger(content);
    if (!question) return;

    const history = this.historyFor(room);
    history.push({ role: "user", content: question });

    this.typingRooms.add(room);
    this.hooks.onTypingChange();

    let answer: string;
    try {
      answer = await this.ask(history);
    } catch (error) {
      console.error("[bot] error consultando el RAG:", error);
      answer = "Lo siento, no pude consultar la información en este momento. Intenta de nuevo.";
    } finally {
      this.typingRooms.delete(room);
      this.hooks.onTypingChange();
    }

    const message: StoredMessage = {
      id: randomUUID(),
      user: this.name,
      color: this.color,
      type: "texto",
      content: answer,
      time: new Date().toISOString(),
      room,
    };

    history.push({ role: "assistant", content: answer });
    this.trim(room);
    this.hooks.saveMessage(message);

    this.io.to(room).emit("chat:message", {
      id: message.id,
      user: message.user,
      color: message.color,
      type: message.type,
      content: message.content,
      time: message.time,
    });
  }

  private trim(room: string): void {
    const messages = this.history.get(room);
    if (!messages) return;
    const max = this.options.maxHistory;
    if (messages.length > max) messages.splice(0, messages.length - max);
  }

  private async ask(history: BotChatMessage[]): Promise<string> {
    const url = `${this.options.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.options.apiKey ? { authorization: `Bearer ${this.options.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.options.model,
        messages: history,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`RAG backend ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() || "No tengo esa información.";
  }
}
