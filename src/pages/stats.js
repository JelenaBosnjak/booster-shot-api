import Link from "next/link";
import { useState, useEffect } from "react";

const COLOR_CORAL = "#ff8e87";
const COLOR_DARK = "#23243a";
const COLOR_WHITE = "#fff";
const COLOR_LIGHT_BG = "#fafbfc";
const COLOR_GRAY = "#e5e7eb";
const COLOR_PRIMARY = COLOR_DARK;

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

// Utility: Extracts JS Date from a string like "...; Date: 06/23/2025 17:13:08"
function extractCampaignDateTime(str) {
  if (!str) return null;
  const match = str.match(/Date:\s*(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (!match) return null;
  const [, datePart, timePart] = match;
  const [month, day, year] = datePart.split('/');
  let isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (timePart) {
    isoString += 'T' + timePart;
  }
  return new Date(isoString);
}

export default function StatusPage() {
  const [activeTab, setActiveTab] = useState("current"); // "previous" or "current"
  const [selectedPrevIndex, setSelectedPrevIndex] = useState(2); // default to "Spring Glow Campaign"
  const selectedPrev = previousCampaigns[selectedPrevIndex] || previousCampaigns[0];

  // --- Campaign Status from API ---
  const [boosterStats, setBoosterStats] = useState({ previous: 0, current: 0, contacts: [] });
  const [boosterHistoryCount, setBoosterHistoryCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentBoosterCampaignName, setCurrentBoosterCampaignName] = useState("Current Booster Campaign");
  const [previousBoosterCampaignName, setPreviousBoosterCampaignName] = useState(selectedPrev.name);

  // Store the unique campaign time stamps (with name) for current and previous
  const [currentCampaignTimestamp, setCurrentCampaignTimestamp] = useState("");
  const [previousCampaignTimestamp, setPreviousCampaignTimestamp] = useState("");

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        // Fetch campaign status (including currentBoosterCampaignName)
        const statsRes = await fetch("/api/get-campaign-status");
        const statsData = await statsRes.json();
        setBoosterStats({
          previous: statsData.previous,
          current: statsData.current,
          contacts: statsData.contacts || [],
        });
        if (statsData.count !== undefined) {
          setBoosterHistoryCount(statsData.count);
        }
        if (statsData.currentBoosterCampaignName) {
          setCurrentBoosterCampaignName(statsData.currentBoosterCampaignName);
        } else {
          setCurrentBoosterCampaignName("Current Booster Campaign");
        }

        // --- Identify unique campaign launches by timestamp ---
        // Find all campaign launches for the current campaign (by name)
        // Gather the most recent timestamp for each unique campaign name
        let currentCampaigns = [];
        let previousCampaigns = [];

        // Build a flat array of {campaignName, campaignDate: JS Date, rawValue}
        let allCampaignEvents = [];
        (statsData.contacts || []).forEach(contact => {
          (contact.boosterFields || []).forEach(field => {
            const dt = extractCampaignDateTime(field.value);
            allCampaignEvents.push({
              campaignName: contact.boosterCampaignName || "",
              campaignDate: dt,
              rawValue: field.value,
              contactId: contact.id,
            });
          });
        });
        // Only keep events with campaignDate and campaignName
        allCampaignEvents = allCampaignEvents.filter(ev => ev.campaignDate && ev.campaignName);

        // Group by campaignName + full ISO date time string
        // Sort all events by date descending
        allCampaignEvents.sort((a, b) => b.campaignDate - a.campaignDate);

        // Find the latest campaignName+timestamp for "current", and the previous for "previous"
        let uniqueCampaigns = [];
        let seen = {};
        // Key: campaignName + campaignDate ISO string
        allCampaignEvents.forEach(ev => {
          const key = `${ev.campaignName}|${ev.campaignDate.toISOString()}`;
          if (!seen[key]) {
            uniqueCampaigns.push(ev);
            seen[key] = true;
          }
        });

        // Get unique launches for the current campaign name
        const launchesForCurrentName = uniqueCampaigns.filter(ev => ev.campaignName === statsData.currentBoosterCampaignName);

        // If more than one launch for the same day, sort by date+time
        // The most recent is "current", the one before is "previous"
        if (launchesForCurrentName.length > 0) {
          setCurrentCampaignTimestamp(
            launchesForCurrentName[0].campaignDate.toLocaleString()
          );
          if (launchesForCurrentName[1]) {
            setPreviousCampaignTimestamp(
              launchesForCurrentName[1].campaignDate.toLocaleString()
            );
          } else {
            setPreviousCampaignTimestamp(""); // No prior
          }
        } else {
          setCurrentCampaignTimestamp("");
          setPreviousCampaignTimestamp("");
        }

      } catch (err) {
        setBoosterStats({ previous: 0, current: 0, contacts: [] });
        setBoosterHistoryCount(null);
        setCurrentBoosterCampaignName("Current Booster Campaign");
        setCurrentCampaignTimestamp("");
        setPreviousCampaignTimestamp("");
      }
      setLoading(false);
    }
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sort contacts by full DateTime for most recent launches
  const sortedContacts = (boosterStats.contacts || []).slice().sort((a, b) => {
    const aValue = a.boosterFields?.[0]?.value;
    const bValue = b.boosterFields?.[0]?.value;
    const aDate = extractCampaignDateTime(aValue);
    const bDate = extractCampaignDateTime(bValue);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate - bDate;
  });

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
      justifyContent: "space-between",
      background: COLOR_WHITE,
      boxShadow: "0 2px 8px rgba(35,36,58,0.05)",
      padding: "16px 32px",
      borderBottom: `1.5px solid ${COLOR_GRAY}`,
      gap: 18,
    },
    leftHeader: {
      display: "flex",
      alignItems: "center",
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
      textAlign: "left",
      color: COLOR_PRIMARY,
      letterSpacing: "-1px",
    },
    logo: {
      width: 110,
      height: 44,
      objectFit: "contain",
      marginLeft: 18,
      marginRight: 0,
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
      minWidth: 320,
      maxWidth: 380,
      border: `1.5px solid ${COLOR_GRAY}`,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    cardTitle: {
      fontWeight: 800,
      fontSize: "1.18rem",
      color: COLOR_PRIMARY,
      marginBottom: "8px",
      letterSpacing: "-0.5px",
    },
    cardRow: {
      display: "flex",
      alignItems: "center",
      margin: "2px 0",
      fontSize: "1.09rem",
      fontWeight: 700,
    },
    cardLabel: {
      minWidth: 130,
      color: COLOR_DARK,
    },
    cardValue: {
      color: COLOR_CORAL,
      fontWeight: 800,
      fontSize: "1.12rem",
      marginLeft: 8,
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
    campaignTimeRow: {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      marginBottom: "-10px",
      marginRight: "12px",
      fontSize: "1rem",
      color: "#767676",
      fontWeight: 600,
      gap: "2.5rem",
    },
    debugBlock: {
      margin: "12px 0 18px 0",
      padding: "8px 12px",
      background: "#fff8f5",
      border: `1px solid ${COLOR_CORAL}`,
      borderRadius: 8,
      color: "#a93729",
      fontSize: "0.98rem",
      maxWidth: 520,
      lineHeight: 1.35,
      whiteSpace: "pre-wrap",
      fontFamily: "monospace",
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
      {/* Header with logo on right */}
      <div style={styles.header}>
        <div style={styles.leftHeader}>
          <Link href="/" legacyBehavior>
            <a style={styles.back}>&larr; Back</a>
          </Link>
          <span style={styles.headTitle}>Campaign Status Overview</span>
        </div>
        <img
          src="/logo.png"
          alt="Logo"
          style={styles.logo}
          onError={e => { e.currentTarget.src = "https://via.placeholder.com/120x44?text=Logo" }}
        />
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
          {/* Current campaign time at the top right above cards */}
          <div style={styles.campaignTimeRow}>
            <span>
              <span style={{ fontWeight: 700, color: COLOR_CORAL }}>Campaign Time:</span>{" "}
              {currentCampaignTimestamp || "N/A"}
            </span>
          </div>
          {/* Debug block below campaign time */}
          <div style={styles.debugBlock}>
            <b>Number of Contacts with custom field Booster:</b>{" "}
            {boosterHistoryCount === null ? "Loading..." : boosterHistoryCount}
            {sortedContacts.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <b>Contacts (earliest 10):</b>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {sortedContacts.slice(0, 10).map(c =>
                    <li key={c.id}>
                      {c.firstName} {c.lastName} ({c.phone || "No phone"}) |{" "}
                      {c.boosterFields.map(f => {
                        const dt = extractCampaignDateTime(f.value);
                        return dt ? dt.toLocaleString() : f.value;
                      }).join(", ")}
                    </li>
                  )}
                  {sortedContacts.length > 10 && <li>...and more</li>}
                </ul>
              </div>
            )}
          </div>
          <div style={styles.contentRow}>
            {/* Previous Booster Campaign Card */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>Previous Booster Campaign</div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Campaign Name:</span>
                <span style={styles.cardValue}>
                  {previousBoosterCampaignName}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Time:</span>
                <span style={styles.cardValue}>
                  {previousCampaignTimestamp || "N/A"}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Total Added:</span>
                <span style={styles.cardValue}>
                  {loading ? "Loading..." : boosterStats.previous}
                </span>
              </div>
            </div>
            {/* Current Booster Campaign Card */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>Current Booster Campaign</div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Campaign Name:</span>
                <span style={styles.cardValue}>
                  {currentBoosterCampaignName}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Time:</span>
                <span style={styles.cardValue}>
                  {currentCampaignTimestamp || "N/A"}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Total Added:</span>
                <span style={styles.cardValue}>
                  {loading ? "Loading..." : boosterStats.current}
                </span>
              </div>
            </div>
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
                  <td style={styles.prevStatsTd}>{selectedPrev?.stats?.total ?? 0}</td>
                  <td style={styles.prevStatsTd}>{selectedPrev?.stats?.firstMsg ?? 0}</td>
                  <td style={styles.prevStatsTd}>{selectedPrev?.stats?.remaining ?? 0}</td>
                  <td style={styles.prevStatsTd}>{selectedPrev?.stats?.waiting ?? 0}</td>
                </tr>
                <tr>
                  <th style={styles.prevStatsTh}>Responded</th>
                  <th style={styles.prevStatsTh}>No Response</th>
                  <th style={{ ...styles.prevStatsTh, background: "none", border: "none" }} colSpan={2}></th>
                </tr>
                <tr>
                  <td style={styles.prevStatsTd2}>{selectedPrev?.stats?.responded ?? 0}</td>
                  <td style={styles.prevStatsTd2}>{selectedPrev?.stats?.noResponse ?? 0}</td>
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