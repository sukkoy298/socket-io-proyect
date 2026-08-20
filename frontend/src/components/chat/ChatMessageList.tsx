import { useEffect, useRef } from "react";
import type { Item } from "../../types/chat";
import { ChatMessageItem } from "./ChatMessageItem";
import { formatCaracasTime } from "../../utils/date";

type Props = {
  items: Item[];
};

export function ChatMessageList({ items }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [items]);

  return (
    <div className="chat-list" ref={listRef}>
      {items.length === 0 && (
        <p className="chat-empty">
          Todavía no hay mensajes. Escribí el primero.
        </p>
      )}
      {items.map((item, i) =>
        item.kind === "system" ? (
          <p key={i} className="chat-system">
            {item.note.text}
            <span>{formatCaracasTime(item.note.time)}</span>
          </p>
        ) : (
          <ChatMessageItem
            key={item.message.id}
            message={item.message}
            own={item.own}
          />
        )
      )}
    </div>
  );
}
