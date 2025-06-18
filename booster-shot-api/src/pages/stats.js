import Link from "next/link";
import { useState } from "react";

// Demo data (replace with real data/fetch later)
const previous = {
  total: 150,
  firstMsg: 120,
  remaining: 30,
  waiting: 45,
  responded: 35,
  noResponse: 15,
};
const current = {
  total: 150,
  firstMsg: 120,
  remaining: 30,
  waiting: 45,
  responded: 35,
  noResponse: 15,
};

// For progress bar calculation
function getPercent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

const COLOR_CORAL = "#ff8e87";
const COLOR_DARK = "#23243a";
const COLOR_WHITE = "#fff";
const COLOR_LIGHT_BG = "#fafbfc";
const COLOR_GRAY = "#e5e7eb";
const COLOR_PRIMARY = COLOR_DARK;

export default function StatusPage() {
  const [activeTab, setActiveTab] = useState("current"); // "previous" or "current"

  const styles = {
    page: {
      minHeight: "100vh",
      background: COLOR_LIGHT_BG,
      fontFamily: "Inter, Arial, sans-serif",
      color: COLOR_DARK,
      padding: "0",
      margin: "0",
    },
    header: {
      display: "flex",
      alignItems: "center",
      background: COLOR_WHITE,
      boxShadow: "0 2px 8px rgba(35,36,58,0.05)",
      padding: "16px 32px",
      borderBottom: `1.5px solid ${COLOR_GRAY}`,
      gap: 18,
    },
    back: {
      color: COLOR_CORAL,
      fontWeight: 700,
      fontSize: "1.15rem",
      textDecoration: "none",
      marginRight: 18,
      cursor: "pointer",
      border: "none",
      background: "none",
      padding: 0,
    },
    headTitle: {
      fontWeight: 900,
      fontSize: "1.45rem",
      flex: 1,
      textAlign: "left",
      color: COLOR_PRIMARY,
      letterSpacing: "-1px",
    },
    tabRow: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 18,
      background: COLOR_WHITE,
      borderBottom: `1.5px solid ${COLOR_GRAY}`,
      padding: "16px 0",
    },
    tab: {
      padding: "12px 38px",
      fontWeight: 700,
      borderRadius: "8px 8px 0 0",
      background: COLOR_LIGHT_BG,
      border: `1.5px solid ${COLOR_GRAY}`,
      borderBottom: "none",
      color: COLOR_CORAL,
      cursor: "pointer",
      fontSize: "1.09rem",
      transition: "background 0.14s, color 0.14s",
    },
    tabActive: {
      background: COLOR_CORAL,
      color: COLOR_WHITE,
      border: `1.5px solid ${COLOR_CORAL}`,
      borderBottom: "none",
    },
    contentRow: {
      display: "flex",
      justifyContent: "center",
      gap: "48px",
      margin: "40px 0 36px 0",
    },
    card: {
      background: COLOR_WHITE,
      borderRadius: "18px",
      padding: "34px 34px",
      boxShadow: "0 4px 16px rgba(35,36,58,0.08)",
      minWidth: 270,
      maxWidth: 360,
      border: `1.5px solid ${COLOR_GRAY}`,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    cardTitle: {
      fontWeight: 800,
      fontSize: "1.18rem",
      color: COLOR_PRIMARY,
      marginBottom: "14px",
      letterSpacing: "-0.5px",
    },
    statRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "1.08rem",
      marginBottom: 8,
      fontWeight: 600,
    },
    statLabel: {
      color: "#7c7c92",
      fontWeight: 600,
    },
    statValue: {
      color: COLOR_CORAL,
      fontWeight: 900,
      fontSize: "1.12rem",
      minWidth: 40,
      textAlign: "right",
    },
    progressSection: {
      margin: "40px auto 36px auto",
      maxWidth: 650,
      background: COLOR_WHITE,
      padding: "28px 30px",
      borderRadius: "18px",
      border: `1.5px solid ${COLOR_GRAY}`,
      boxShadow: "0 3px 12px rgba(35,36,58,0.06)",
    },
    progLabelRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontWeight: 600,
      marginBottom: 4,
      marginTop: 16,
    },
    progBar: {
      height: 18,
      borderRadius: "8px",
      background: "#eee",
      overflow: "hidden",
      marginBottom: "8px",
      marginTop: "2px",
    },
    progInner: (percent, color) => ({
      width: `${percent}%`,
      height: "100%",
      background: color,
      transition: "width 0.3s",
    }),
    controlsRow: {
      display: "flex",
      justifyContent: "center",
      gap: "22px",
      margin: "34px 0 0 0",
    },
    controlBtn: {
      padding: "17px 32px",
      background: COLOR_CORAL,
      color: COLOR_WHITE,
      fontWeight: 700,
      fontSize: "1.15rem",
      border: "none",
      borderRadius: "9px",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(255,142,135,0.09)",
      transition: "background 0.15s, transform 0.12s",
      textDecoration: "none",
      outline: "none",
      letterSpacing: "-0.6px",
    },
  };

  // Pick which stats to show (previous/current)
  const stats = activeTab === "previous" ? previous : current;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <Link href="/" legacyBehavior>
          <a style={styles.back}>&larr; Back</a>
        </Link>
        <span style={styles.headTitle}>Campaign Status Overview</span>
      </div>

      {/* Tabs */}
      <div style={styles.tabRow}>
        <button
          style={activeTab === "previous" ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          onClick={() => setActiveTab("previous")}
        >
          Previous Campaign
        </button>
        <button
          style={activeTab === "current" ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          onClick={() => setActiveTab("current")}
        >
          Current Campaign
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.contentRow}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Previous Campaign</div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Total Added</span>
            <span style={styles.statValue}>{previous.total}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>1st Message</span>
            <span style={styles.statValue}>{previous.firstMsg}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Remaining</span>
            <span style={styles.statValue}>{previous.remaining}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Waiting</span>
            <span style={styles.statValue}>{previous.waiting}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Responded</span>
            <span style={styles.statValue}>{previous.responded}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>No Response</span>
            <span style={styles.statValue}>{previous.noResponse}</span>
          </div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Current Campaign</div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Total Added</span>
            <span style={styles.statValue}>{current.total}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>1st Message</span>
            <span style={styles.statValue}>{current.firstMsg}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Remaining</span>
            <span style={styles.statValue}>{current.remaining}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Waiting</span>
            <span style={styles.statValue}>{current.waiting}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Responded</span>
            <span style={styles.statValue}>{current.responded}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>No Response</span>
            <span style={styles.statValue}>{current.noResponse}</span>
          </div>
        </div>
      </div>

      {/* Progress Bars for current campaign */}
      <div style={styles.progressSection}>
        <div style={styles.cardTitle}>Current Campaign Progress</div>
        <div style={styles.progLabelRow}>
          <span>Total Added</span>
          <span>{current.total}</span>
        </div>
        <div style={styles.progBar}>
          <div style={styles.progInner(getPercent(current.total, current.total), COLOR_CORAL)} />
        </div>

        <div style={styles.progLabelRow}>
          <span>1st Message</span>
          <span>{current.firstMsg}</span>
        </div>
        <div style={styles.progBar}>
          <div style={styles.progInner(getPercent(current.firstMsg, current.total), COLOR_CORAL)} />
        </div>

        <div style={styles.progLabelRow}>
          <span>Remaining</span>
          <span>{current.remaining}</span>
        </div>
        <div style={styles.progBar}>
          <div style={styles.progInner(getPercent(current.remaining, current.total), "#ffb6ae")} />
        </div>

        <div style={styles.progLabelRow}>
          <span>Waiting</span>
          <span>{current.waiting}</span>
        </div>
        <div style={styles.progBar}>
          <div style={styles.progInner(getPercent(current.waiting, current.total), "#ffd5d2")} />
        </div>

        <div style={styles.progLabelRow}>
          <span>Responded</span>
          <span>{current.responded}</span>
        </div>
        <div style={styles.progBar}>
          <div style={styles.progInner(getPercent(current.responded, current.total), "#ff8e87")} />
        </div>

        <div style={styles.progLabelRow}>
          <span>No Response</span>
          <span>{current.noResponse}</span>
        </div>
        <div style={styles.progBar}>
          <div style={styles.progInner(getPercent(current.noResponse, current.total), "#ffcfc1")} />
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controlsRow}>
        <button style={styles.controlBtn}>View Details</button>
        <button style={styles.controlBtn}>Export Report</button>
        <Link href="/campaign" legacyBehavior>
          <a style={styles.controlBtn}>Start New Campaign</a>
        </Link>
      </div>
    </div>
  );
}