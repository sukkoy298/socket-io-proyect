import type { OnlineUser } from "../../types/chat";

type Props = {
  typingUsers: OnlineUser[];
};

export function ChatTyping({ typingUsers }: Props) {
  return (
    <div className={`chat-typing ${typingUsers.length ? "active" : ""}`}>
      {typingUsers.length > 0 && (
        <p>
          <span className="typing-names">
            {typingUsers.map((u) => u.name).join(", ")}
          </span>{" "}
          {typingUsers.length === 1 ? "está" : "están"} escribiendo
          <span className="typing-dots">
            <span />
            <span />
            <span />
          </span>
        </p>
      )}
    </div>
  );
}
