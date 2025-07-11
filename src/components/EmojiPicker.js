import React from "react";
import dynamic from "next/dynamic";

const Picker = dynamic(
  () => import("emoji-mart").then(mod => mod.Picker),
  { ssr: false }
);

export default function EmojiPicker({ onSelect, onClose }) {
  return (
    <div>
      <Picker
        onEmojiSelect={onSelect}
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