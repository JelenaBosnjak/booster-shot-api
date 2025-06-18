import Link from "next/link";
import { useState } from "react";

const COLOR_CORAL = "#ff8e87";
const COLOR_DARK = "#23243a";
const COLOR_WHITE = "#fff";
const COLOR_LIGHT_BG = "#fafbfc";
const COLOR_GRAY = "#e5e7eb";
const COLOR_PRIMARY = COLOR_DARK;

// Demo data for campaigns
const previousCampaigns = [
  {
    name: "Mother's Day Promo",
    date: "2025-05-01",
    status: "Done",
    stats: { total: 140, firstMsg: 110, remaining: 20, waiting: 30, responded: 28, noResponse: 10 },
  },
  {
    name: "Botox Launch Special",
    date: "2025-04-10",
    status: "Done",
    stats: { total: 145, firstMsg: 115, remaining: 25, waiting: 20, responded: 32, noResponse: 8 },
  },
  {
    name: "Spring Glow Campaign",
    date: "2025-03-20",
    status: "Done",
    stats: { total: 150, firstMsg: 120, remaining: 30, waiting: 45, responded: 35, noResponse: 15 },
  },
  {
    name: "Flawless Forehead",
    date: "2025-02-14",
    status: "Done",
    stats: { total: 110, firstMsg: 80, remaining: 18, waiting: 10, responded: 22, noResponse: 5 },
  },
  {
    name: "New Year Kickoff",
    date: "2025-01-05",
    status: "Done",
    stats: { total: 125, firstMsg: 92, remaining: 24, waiting: 12, responded: 30, noResponse: 7 },
  },
];

const current = {
  total: 150,
  firstMsg: 120,
  remaining: 30,
  waiting: 45,
  responded: 35,
  noResponse: 15,
  name: "Summer Glow 2025",
  date: "2025-06-10",
};

export default function StatusPage() {
  const [activeTab, setActiveTab] = useState("current"); // "previous" or "current"
  const [selectedPrevIndex, setSelectedPrevIndex] = useState(2); // default to "Spring Glow Campaign"
  const selectedPrev = previousCampaigns[selectedPrevIndex];

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
    // Current campaign styles are unchanged...
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
    // Previous campaign tab styles:
    prevDetails: {
      background: COLOR_WHITE,
      borderRadius: "18px",
      padding: "30px 28px 20px 28px",
      boxShadow: "0 4px 16px rgba(35,36,58,0.07)",
      maxWidth: 650,
      margin: "32px auto 18px auto",
      border: `1.5px solid ${COLOR_GRAY}`,
    },
    prevDetailsRow: {
      display: "flex",
      flexDirection: "row",
      marginBottom: "5px",
      gap: "16px",
      alignItems: "center",
      fontWeight: 600,
      fontSize: "1.11rem",
    },
    prevDetailsLabel: {
      color: COLOR_DARK,
      minWidth: 130,
      fontWeight: 700,
    },
    prevDetailsValue: {
      color: COLOR_CORAL,
      fontWeight: 800,
      fontSize: "1.11rem",
    },
    prevStatsTable: {
      width: "100%",
      margin: "22px 0 8px 0",
      borderCollapse: "collapse",
    },
    prevStatsTh: {
      borderBottom: `1.5px solid ${COLOR_GRAY}`,
      padding: "10px 0 6px 0",
      fontWeight: 700,
      color: COLOR_DARK,
      fontSize: "1.03rem",
      background: "#f9f3f2",
    },
    prevStatsTd: {
      padding: "9px 0",
      textAlign: "center",
      color: COLOR_CORAL,
      fontWeight: 900,
      fontSize: "1.07rem",
      borderBottom: `1px solid #f3efef`,
    },
    prevStatsTd2: {
      padding: "9px 0",
      textAlign: "center",
      color: COLOR_CORAL,
      fontWeight: 900,
      fontSize: "1.12rem",
      borderBottom: `1px solid #f3efef`,
    },
    prevCampaignsListSection: {
      background: COLOR_WHITE,
      borderRadius: "18px",
      maxWidth: 750,
      margin: "32px auto",
      border: `1.5px solid ${COLOR_GRAY}`,
      boxShadow: "0 2px 12px rgba(35,36,58,0.06)",
      padding: "0 0 24px 0",
    },
    prevCampaignsListTitle: {
      fontWeight: 800,
      color: COLOR_PRIMARY,
      fontSize: "1.13rem",
      padding: "18px 0 12px 32px",
      borderBottom: `1.5px solid ${COLOR_GRAY}`,
      background: "#faf8f8",
      letterSpacing: "-0.5px",
    },
    prevListTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: 0,
    },
    prevListTh: {
      padding: "12px 0 8px 0",
      color: "#7c7c92",
      fontWeight: 700,
      borderBottom: `1.5px solid ${COLOR_GRAY}`,
      background: "#fafbfc",
      fontSize: "1.03rem",
      textAlign: "left",
      paddingLeft: 32,
    },
    prevListTd: {
      padding: "11px 0",
      fontWeight: 600,
      fontSize: "1.07rem",
      color: COLOR_DARK,
      borderBottom: `1px solid #f5efef`,
      textAlign: "left",
      paddingLeft: 32,
    },
    prevListTdStatus: {
      color: "#4caf50",
      fontWeight: 800,
      fontSize: "1.08rem",
    },
    prevListTdSelect: {
      textAlign: "center",
      fontSize: "1.4rem",
      color: COLOR_CORAL,
      cursor: "pointer",
    },
    prevListTdSelectSelected: {
      textAlign: "center",
      fontSize: "1.4rem",
      color: COLOR_CORAL,
      cursor: "pointer",
      fontWeight: 900,
      background: "#fff2f1",
      borderRadius: "50%",
      padding: "0 8px",
    },
    prevControlsRow: {
      display: "flex",
      justifyContent: "center",
      gap: "22px",
      margin: "24px 0 0 0",
    },
  };

  function getPercent(value, total) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }

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

      {activeTab === "current" ? (
        <>
          {/* Current campaign layout as before */}
          <div style={styles.contentRow}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Previous Campaign</div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Total Added</span>
                <span style={styles.statValue}>{previousCampaigns[2].stats.total}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>1st Message</span>
                <span style={styles.statValue}>{previousCampaigns[2].stats.firstMsg}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Remaining</span>
                <span style={styles.statValue}>{previousCampaigns[2].stats.remaining}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Waiting</span>
                <span style={styles.statValue}>{previousCampaigns[2].stats.waiting}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Responded</span>
                <span style={styles.statValue}>{previousCampaigns[2].stats.responded}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>No Response</span>
                <span style={styles.statValue}>{previousCampaigns[2].stats.noResponse}</span>
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
          <div style={styles.controlsRow}>
            <button style={styles.controlBtn}>View Details</button>
            <button style={styles.controlBtn}>Export Report</button>
            <Link href="/campaign" legacyBehavior>
              <a style={styles.controlBtn}>Start New Campaign</a>
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* Previous Campaign - Details Card */}
          <div style={styles.prevDetails}>
            <div style={styles.prevDetailsRow}>
              <span style={styles.prevDetailsLabel}>Campaign Name:</span>
              <span style={styles.prevDetailsValue}>{selectedPrev.name}</span>
            </div>
            <div style={styles.prevDetailsRow}>
              <span style={styles.prevDetailsLabel}>Date:</span>
              <span style={styles.prevDetailsValue}>{selectedPrev.date}</span>
            </div>
            <table style={styles.prevStatsTable}>
              <thead>
                <tr>
                  <th style={styles.prevStatsTh}>Total Added</th>
                  <th style={styles.prevStatsTh}>1st Message</th>
                  <th style={styles.prevStatsTh}>Remaining</th>
                  <th style={styles.prevStatsTh}>Waiting</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.prevStatsTd}>{selectedPrev.stats.total}</td>
                  <td style={styles.prevStatsTd}>{selectedPrev.stats.firstMsg}</td>
                  <td style={styles.prevStatsTd}>{selectedPrev.stats.remaining}</td>
                  <td style={styles.prevStatsTd}>{selectedPrev.stats.waiting}</td>
                </tr>
                <tr>
                  <th style={styles.prevStatsTh}>Responded</th>
                  <th style={styles.prevStatsTh}>No Response</th>
                  <th style={{ ...styles.prevStatsTh, background: "none", border: "none" }} colSpan={2}></th>
                </tr>
                <tr>
                  <td style={styles.prevStatsTd2}>{selectedPrev.stats.responded}</td>
                  <td style={styles.prevStatsTd2}>{selectedPrev.stats.noResponse}</td>
                  <td colSpan={2} style={{ border: "none", background: "none" }}></td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Previous Campaigns List */}
          <div style={styles.prevCampaignsListSection}>
            <div style={styles.prevCampaignsListTitle}>Previous Campaigns List</div>
            <table style={styles.prevListTable}>
              <thead>
                <tr>
                  <th style={styles.prevListTh}>Campaign Name</th>
                  <th style={styles.prevListTh}>Date</th>
                  <th style={styles.prevListTh}>Status</th>
                  <th style={styles.prevListTh}>Select</th>
                </tr>
              </thead>
              <tbody>
                {previousCampaigns.map((row, idx) => (
                  <tr key={row.name + row.date}>
                    <td style={styles.prevListTd}>{row.name}</td>
                    <td style={styles.prevListTd}>{row.date}</td>
                    <td style={{ ...styles.prevListTd, ...styles.prevListTdStatus }}>{row.status}</td>
                    <td
                      style={idx === selectedPrevIndex ? styles.prevListTdSelectSelected : styles.prevListTdSelect}
                      onClick={() => setSelectedPrevIndex(idx)}
                    >
                      {idx === selectedPrevIndex ? "●" : "○"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Controls */}
          <div style={styles.prevControlsRow}>
            <button style={styles.controlBtn}>Export Report</button>
            <Link href="/campaign" legacyBehavior>
              <a style={styles.controlBtn}>Start New Campaign</a>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}