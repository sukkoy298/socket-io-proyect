import type { OnlineUser } from "../../types/chat";

type Props = {
  username: string;
  myColor: string;
  online: OnlineUser[];
};

export function ChatHeader({ username, myColor, online }: Props) {
  return (
    <header className="chat-header">
      <h1>
        Chat Grupal{" "}
        <span className="chat-me" style={{ color: myColor }}>
          · {username}
        </span>
      </h1>
      <div className="presence" title={online.map((u) => u.name).join(", ")}>
        <span className="presence-dots">
          {online.slice(0, 5).map((u, i) => (
            <span
              key={`${u.name}-${i}`}
              className="presence-dot"
              style={{ background: u.color, borderColor: u.color }}
            />
          ))}
        </span>
        <span className="presence-count">{online.length} en línea</span>
      </div>
    </header>
  );
}
