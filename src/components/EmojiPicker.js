import React, { useEffect } from "react";
import EmojiPickerReact from "emoji-picker-react";

export default function EmojiPicker({ onSelect, onClose }) {
  useEffect(() => {
    console.debug("[EmojiPicker] Mounted");
    return () => {
      console.debug("[EmojiPicker] Unmounted");
    };
  }, []);

  // Log props on each render
  console.debug("[EmojiPicker] Rendered with props:", { onSelect, onClose });

  function handleEmojiClick(emojiData, event) {
    console.debug("[EmojiPicker] Emoji selected:", emojiData);
    try {
      if (onSelect) onSelect(emojiData.emoji);
    } catch (e) {
      console.error("[EmojiPicker] Error in onSelect handler:", e);
      debugger; // <-- triggers browser debugger if open
    }
  }

  function handleCloseClick() {
    console.debug("[EmojiPicker] Close button clicked");
    try {
      if (onClose) onClose();
    } catch (e) {
      console.error("[EmojiPicker] Error in onClose handler:", e);
      debugger;
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ color: 'red', fontFamily: 'monospace', fontSize: 11, marginBottom: 2 }}>
        [DEBUG] EmojiPicker rendered
      </div>
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