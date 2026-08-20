import { useRef, useEffect } from "react";
import { SmileyIcon } from "../stickers/SmileyIcon";

type Props = {
  text: string;
  username: string;
  pickerOpen: boolean;
  onTextChange: (value: string) => void;
  onTogglePicker: () => void;
  onSend: () => void;
};

export function ChatInput({
  text,
  username,
  pickerOpen,
  onTextChange,
  onTogglePicker,
  onSend,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <button
        type="button"
        className={`sticker-button ${pickerOpen ? "active" : ""}`}
        aria-label="Abrir selector de stickers"
        aria-expanded={pickerOpen}
        onClick={onTogglePicker}
      >
        <SmileyIcon />
      </button>

      <textarea
        ref={textareaRef}
        className="chat-input-textarea resize-y min-h-[44px] max-h-32"
        value={text}
        rows={1}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Escribí un mensaje como ${username}...`}
        maxLength={900}
        autoFocus
      />

      <button className="chat-send-btn" type="submit">
        Enviar
      </button>
    </form>
  );
}
