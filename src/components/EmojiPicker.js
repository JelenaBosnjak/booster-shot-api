import React, { useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import Picker to avoid SSR issues in Next.js
const Picker = dynamic(
  () => import("emoji-mart").then(mod => {
    console.log("emoji-mart Picker module loaded:", mod);
    return mod.Picker;
  }),
  { ssr: false }
);

export default function EmojiPicker({ onSelect, onClose }) {
  useEffect(() => {
    console.log("EmojiPicker mounted");
    return () => {
      console.log("EmojiPicker unmounted");
    };
  }, []);

  // Log props
  console.log("EmojiPicker props:", { onSelect, onClose });

  // Wrap the handler to see if it is called
  function handleEmojiSelect(emoji) {
    console.log("Emoji selected:", emoji);
    try {
      if (onSelect) onSelect(emoji);
    } catch (e) {
      console.error("Error in EmojiPicker onSelect handler:", e);
    }
  }

  return (
    <div>
      <div style={{ color: 'red', fontFamily: 'monospace', fontSize: 11, marginBottom: 2 }}>
        [DEBUG] EmojiPicker rendered
      </div>
      <Picker
        onEmojiSelect={handleEmojiSelect}
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