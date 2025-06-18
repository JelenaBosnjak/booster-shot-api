import Link from "next/link";
import { useState } from "react";

const COLOR_DARK = "#23243a";
const COLOR_CORAL = "#ff8e87";
const COLOR_LIGHT_BG = "#fafbfc";
const COLOR_WHITE = "#fff";
const COLOR_PRIMARY = COLOR_DARK;

export default function Dashboard() {
  const [active, setActive] = useState("");

  const styles = {
    main: {
      minHeight: "100vh",
      background: COLOR_LIGHT_BG,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "60px 0 0 0",
      fontFamily: "Inter, Arial, sans-serif",
    },
    logo: {
      width: 180,
      marginBottom: 30,
      objectFit: "contain",
      borderRadius: 8,
      boxShadow: "0 2px 16px rgba(35,36,58,0.06)",
      background: "#eee",
    },
    title: {
      color: COLOR_PRIMARY,
      fontWeight: 900,
      fontSize: "2.5rem",
      marginBottom: "50px",
      letterSpacing: "-1.5px",
      textAlign: "center",
      lineHeight: 1.2,
    },
    buttonRow: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      gap: "40px",
      width: "100%",
      maxWidth: 700,
      marginTop: 20,
    },
    button: {
      width: 320,
      padding: "36px 0",
      background: COLOR_CORAL,
      color: COLOR_WHITE,
      fontWeight: 800,
      fontSize: "1.5rem",
      border: "none",
      borderRadius: "14px",
      cursor: "pointer",
      boxShadow: "0 4px 18px rgba(35,36,58,0.09)",
      transition: "background 0.16s, transform 0.13s, box-shadow 0.18s",
      display: "block",
      textAlign: "center",
      outline: "none",
      textDecoration: "none",
      letterSpacing: "-0.5px",
    },
    buttonHover: {
      background: "#fc6d66",
      transform: "scale(1.04)",
      boxShadow: "0 6px 24px rgba(35,36,58,0.13)",
    },
    buttonActive: {
      background: "#e15d56",
      transform: "scale(0.98)",
      boxShadow: "0 2px 8px rgba(35,36,58,0.10)",
    },
  };

  // You'll need this logic to add hover/active effects with inline styles
  const getButtonStyle = (btn) => ({
    ...styles.button,
    ...(active === btn && styles.buttonActive),
  });

  return (
    <div style={styles.main}>
      <img
        src="/your-logo.png" // update this path after you upload the new logo to /public
        alt="App Logo"
        style={styles.logo}
        onError={e => e.target.src = "https://via.placeholder.com/180x80?text=Logo"}
      />
      <div style={styles.title}>Booster Shot System</div>
      <div style={styles.buttonRow}>
        <Link href="/stats" legacyBehavior>
          <a
            style={getButtonStyle("status")}
            onMouseEnter={() => setActive("status")}
            onMouseLeave={() => setActive("")}
            onMouseDown={() => setActive("status")}
            onMouseUp={() => setActive("")}
          >
            Campaign Status
          </a>
        </Link>
        <Link href="/campaign" legacyBehavior>
          <a
            style={getButtonStyle("launch")}
            onMouseEnter={() => setActive("launch")}
            onMouseLeave={() => setActive("")}
            onMouseDown={() => setActive("launch")}
            onMouseUp={() => setActive("")}
          >
            Launch New Campaign
          </a>
        </Link>
      </div>
    </div>
  );
}