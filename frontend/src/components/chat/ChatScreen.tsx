import { useState } from "react";
import type { Item, OnlineUser, RoomInfo, Toast } from "../../types/chat";
import type { Sticker } from "../../types/stickers";
import { ChatToast } from "./ChatToast";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatTyping } from "./ChatTyping";
import { ChatInput } from "./ChatInput";
import { OnlineUsersPanel } from "./OnlineUsersPanel";
import { StickerPicker } from "../stickers/StickerPicker";

type Props = {
  username: string;
  myColor: string;
  isAdmin: boolean;
  currentRoom: string;
  rooms: RoomInfo[];
  items: Item[];
  online: OnlineUser[];
  typingUsers: OnlineUser[];
  toast: Toast | null;
  onDismissToast: () => void;
  onSendMessage: (text: string) => void;
  onSendSticker: (sticker: Sticker) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onSwitchRoom: (room: string) => void;
  onCreateRoom: (name: string) => void;
  onKickUser: (name: string) => void;
};

export function ChatScreen({
  username,
  myColor,
  isAdmin,
  currentRoom,
  rooms,
  items,
  online,
  typingUsers,
  toast,
  onDismissToast,
  onSendMessage,
  onSendSticker,
  onTyping,
  onStopTyping,
  onSwitchRoom,
  onCreateRoom,
  onKickUser,
}: Props) {
  const [text, setText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

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

      <ChatHeader
        username={username}
        myColor={myColor}
        online={online}
        isAdmin={isAdmin}
        currentRoom={currentRoom}
        rooms={rooms}
        onTogglePanel={() => setPanelOpen((open) => !open)}
        onSwitchRoom={onSwitchRoom}
        onCreateRoom={onCreateRoom}
      />

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

      <OnlineUsersPanel
        online={online}
        username={username}
        isAdmin={isAdmin}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onKickUser={onKickUser}
      />
    </main>
  );
}
