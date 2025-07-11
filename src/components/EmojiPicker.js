import React from "react";
import EmojiPickerReact from "emoji-picker-react";

export default function EmojiPicker({ onSelect, onClose }) {
  function handleEmojiClick(emojiData, event) {
    if (onSelect) onSelect(emojiData.emoji);
  }

  function handleCloseClick() {
    if (onClose) onClose();
  }

  return (
    <div style={{ position: "relative" }}>
      <EmojiPickerReact
        onEmojiClick={handleEmojiClick}
        theme="light"
        style={{ border: "1px solid #eee", borderRadius: 8 }}
      />
      {onClose && (
        <button
          onClick={handleCloseClick}
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            border: "none",
            background: "transparent",
            fontSize: 18,
            cursor: "pointer"
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}