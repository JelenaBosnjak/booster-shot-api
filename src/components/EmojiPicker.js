import React from "react";
import { Picker } from "emoji-mart";

export default function EmojiPicker({ onSelect, onClose }) {
  return (
    <div>
      <Picker
        onEmojiSelect={onSelect} // <-- CRITICAL: must be **onEmojiSelect**
        theme="light"
        style={{ border: "1px solid #eee", borderRadius: 8 }}
      />
      {onClose && (
        <button
          onClick={onClose}
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