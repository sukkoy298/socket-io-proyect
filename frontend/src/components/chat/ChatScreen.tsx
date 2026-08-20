import { useState } from "react";
import type { Item, OnlineUser, Toast } from "../../types/chat";
import type { Sticker } from "../../types/stickers";
import { ChatToast } from "./ChatToast";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatTyping } from "./ChatTyping";
import { ChatInput } from "./ChatInput";
import { StickerPicker } from "../stickers/StickerPicker";

type Props = {
  username: string;
  myColor: string;
  items: Item[];
  online: OnlineUser[];
  typingUsers: OnlineUser[];
  toast: Toast | null;
  onDismissToast: () => void;
  onSendMessage: (text: string) => void;
  onSendSticker: (sticker: Sticker) => void;
  onTyping: () => void;
  onStopTyping: () => void;
};

export function ChatScreen({
  username,
  myColor,
  items,
  online,
  typingUsers,
  toast,
  onDismissToast,
  onSendMessage,
  onSendSticker,
  onTyping,
  onStopTyping,
}: Props) {
  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleTextChange = (value: string) => {
    setText(value);
    if (value.trim()) {
      onTyping();
    } else {
      onStopTyping();
    }
  };

  const handleSend = () => {
    const clean = text.trim();
    if (!clean) return;
    onSendMessage(clean);
    setText("");
    onStopTyping();
  };

  const handlePickSticker = (sticker: Sticker) => {
    setPickerOpen(false);
    onSendSticker(sticker);
  };

  return (
    <main className="chat">
      {toast && <ChatToast toast={toast} onDismiss={onDismissToast} />}

      <ChatHeader username={username} myColor={myColor} online={online} />

      <ChatMessageList items={items} />

      <footer className="chat-footer">
        <ChatTyping typingUsers={typingUsers} />

        <ChatInput
          text={text}
          username={username}
          pickerOpen={pickerOpen}
          onTextChange={handleTextChange}
          onTogglePicker={() => setPickerOpen((open) => !open)}
          onSend={handleSend}
        />

        {pickerOpen && (
          <StickerPicker
            onClose={() => setPickerOpen(false)}
            onPick={handlePickSticker}
          />
        )}
      </footer>
    </main>
  );
}
