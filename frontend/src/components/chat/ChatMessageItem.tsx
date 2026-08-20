import type { ChatMessage } from "../../types/chat";
import { formatCaracasTime } from "../../utils/date";

type Props = {
  message: ChatMessage;
  own: boolean;
};

export function ChatMessageItem({ message, own }: Props) {
  return (
    <div className={`chat-message ${own ? "own" : ""} animate-fade-in-up`}>
      <div className="message-body">
        <span className="message-meta">
          <span className="message-user" style={{ color: message.color }}>
            {message.user}
          </span>
          <span className="message-time">
            {formatCaracasTime(message.time)}
          </span>
        </span>
        {message.type === "sticker" ? (
          <img
            className="message-sticker"
            src={message.content}
            alt={`Sticker de ${message.user}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <p className="message-text">{message.content}</p>
        )}
      </div>
    </div>
  );
}
