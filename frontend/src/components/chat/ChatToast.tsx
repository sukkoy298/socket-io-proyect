import type { Toast } from "../../types/chat";

type Props = {
  toast: Toast;
  onDismiss: () => void;
};

export function ChatToast({ toast, onDismiss }: Props) {
  return (
    <button
      className="chat-toast"
      onClick={() => {
        onDismiss();
        window.focus();
      }}
    >
      <span className="chat-toast-dot" style={{ background: toast.color }} />
      <span className="chat-toast-user" style={{ color: toast.color }}>
        {toast.user}
      </span>
      <span className="chat-toast-text">{toast.text}</span>
    </button>
  );
}
