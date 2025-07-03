import Link from "next/link";
import { useEffect, useState } from "react";

const COLOR_DARK = "#23243a";
const COLOR_CORAL = "#ff8e87";
const COLOR_LIGHT_BG = "#fafbfc";
const COLOR_WHITE = "#fff";
const COLOR_PRIMARY = COLOR_DARK;

export default function Dashboard() {
  const [active, setActive] = useState("");
  const [locationId, setLocationId] = useState(null);

  useEffect(() => {
    function getLocationId() {
      // 1. Try URL param
      const params = new URLSearchParams(window.location.search);
      if (params.get("locationId")) return params.get("locationId");
      // 2. Try hash
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        if (hashParams.get("locationId")) return hashParams.get("locationId");
      }
      // 3. Try parent frame (for embedded iframe)
      try {
        if (window.parent && window.parent !== window) {
          const parentPath = window.parent.location.pathname;
          const match = parentPath.match(/\/location\/([a-zA-Z0-9]+)/);
          if (match && match[1]) return match[1];
        }
      } catch (e) {}
      // 4. Try path
      const pathMatch = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
      if (pathMatch && pathMatch[1]) return pathMatch[1];
      return null;
    }
    setLocationId(getLocationId());
  }, []);

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
      minHeight: 60,
      marginBottom: 30,
      objectFit: "contain",
      display: "block",
      borderRadius: 8,
      background: "transparent",
      boxShadow: "none",
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

  const getButtonStyle = (btn) => ({
    ...styles.button,
    ...(active === btn && styles.buttonActive),
  });

  // Build the campaign link with locationId as a param if available
  const campaignLink = locationId
    ? `/campaign?locationId=${encodeURIComponent(locationId)}`
    : "/campaign";

  return (
    <div style={styles.main}>
      <img
        src="/logo.png"
        alt="App Logo"
        style={styles.logo}
        onError={e => { e.target.src = "https://via.placeholder.com/180x80?text=Logo"; }}
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
        <Link href={campaignLink} legacyBehavior>
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