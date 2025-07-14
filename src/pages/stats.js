import Link from "next/link";
import { useState, useEffect } from "react";

const COLOR_CORAL = "#ff8e87";
const COLOR_DARK = "#23243a";
const COLOR_WHITE = "#fff";
const COLOR_LIGHT_BG = "#fafbfc";
const COLOR_GRAY = "#e5e7eb";
const COLOR_PRIMARY = COLOR_DARK;

// Utility: Extract all campaign launches (as ISO string) from a string like "...; Date: 06/23/2025 17:13 ..."
function extractAllCampaignDateTimes(str) {
  if (!str) return [];
  const regex = /Campaign Name:\s*([^;]+);\s*Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+(\d{2}:\d{2}))?/g;
  let launches = [];
  let match;
  while ((match = regex.exec(str)) !== null) {
    const [_, campaignName, datePart, timePart] = match;
    const [month, day, year] = datePart.split('/');
    let isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    if (timePart) {
      isoString += 'T' + timePart;
    }
    launches.push({
      campaignName: campaignName.trim(),
      iso: isoString,
      date: new Date(isoString)
    });
  }
  return launches;
}

// Helper: Format a date string to "M/D/YYYY, h:mm:ss A" in user's locale
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return dateString;
  return dateObj.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

export default function StatusPage() {
  const [activeTab, setActiveTab] = useState("current");

  // Dynamically loaded previous campaigns
  const [previousCampaigns, setPreviousCampaigns] = useState([]);
  const [selectedPrevIndex, setSelectedPrevIndex] = useState(0);

  const [boosterStats, setBoosterStats] = useState({ previous: 0, current: 0, contacts: [] });
  const [boosterHistoryCount, setBoosterHistoryCount] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentBoosterCampaignName, setCurrentBoosterCampaignName] = useState("");
  const [previousBoosterCampaignName, setPreviousBoosterCampaignName] = useState("");
  const [currentCampaignTimestamp, setCurrentCampaignTimestamp] = useState("");
  const [previousCampaignTimestamp, setPreviousCampaignTimestamp] = useState("");
  const [totalCampaignLaunches, setTotalCampaignLaunches] = useState(0);

  // New: store counts for current/previous
  const [currentFirstMsgCount, setCurrentFirstMsgCount] = useState(0);
  const [previousFirstMsgCount, setPreviousFirstMsgCount] = useState(0);
  const [currentRespondedCount, setCurrentRespondedCount] = useState(0);
  const [previousRespondedCount, setPreviousRespondedCount] = useState(0);
  const [currentNoResponseCount, setCurrentNoResponseCount] = useState(0);
  const [previousNoResponseCount, setPreviousNoResponseCount] = useState(0);

  // Pagination for previous campaigns
  const [prevPage, setPrevPage] = useState(1);
  const campaignsPerPage = 10;
  const totalPrevPages = Math.ceil(previousCampaigns.length / campaignsPerPage);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
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
        if (typeof statsData.totalCampaigns === "number") {
          setTotalCampaignLaunches(statsData.totalCampaigns);
        }
        setCurrentBoosterCampaignName(statsData.currentBoosterCampaignName || "Current Booster Campaign");
        setPreviousBoosterCampaignName(statsData.previousBoosterCampaignName || "Previous Booster Campaign");
        setCurrentCampaignTimestamp(statsData.currentCampaignTimestamp ? new Date(statsData.currentCampaignTimestamp).toLocaleString() : "");
        setPreviousCampaignTimestamp(statsData.previousCampaignTimestamp ? new Date(statsData.previousCampaignTimestamp).toLocaleString() : "");
        setPreviousCampaigns(statsData.previousCampaigns || []);
        setCurrentFirstMsgCount(statsData.currentFirstMsgCount || 0);
        setPreviousFirstMsgCount(statsData.previousFirstMsgCount || 0);
        setCurrentRespondedCount(statsData.currentRespondedCount || 0);
        setPreviousRespondedCount(statsData.previousRespondedCount || 0);
        setCurrentNoResponseCount(statsData.currentNoResponseCount || 0);
        setPreviousNoResponseCount(statsData.previousNoResponseCount || 0);
      } catch (err) {
        setBoosterStats({ previous: 0, current: 0, contacts: [] });
        setBoosterHistoryCount(null);
        setCurrentBoosterCampaignName("Current Booster Campaign");
        setPreviousBoosterCampaignName("Previous Booster Campaign");
        setCurrentCampaignTimestamp("");
        setPreviousCampaignTimestamp("");
        setTotalCampaignLaunches(0);
        setPreviousCampaigns([]);
        setCurrentFirstMsgCount(0);
        setPreviousFirstMsgCount(0);
        setCurrentRespondedCount(0);
        setPreviousRespondedCount(0);
        setCurrentNoResponseCount(0);
        setPreviousNoResponseCount(0);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  // Paginated list for previous campaigns
  const paginatedPreviousCampaigns = previousCampaigns.slice(
    (prevPage - 1) * campaignsPerPage,
    prevPage * campaignsPerPage
  );

  // Adjust selectedPrevIndex to be relative to the current page
  const selectedPrev = paginatedPreviousCampaigns[selectedPrevIndex] || paginatedPreviousCampaigns[0] || {};

  // helpers for Remaining
  const prevTotal = boosterStats.previous;
  const currTotal = boosterStats.current;
  const prevRemaining = prevTotal - previousFirstMsgCount;
  const currRemaining = currTotal - currentFirstMsgCount;
  const selectedPrevFirstMsg = selectedPrev && typeof selectedPrev.firstMsgCount === "number" ? selectedPrev.firstMsgCount : 0;
  const selectedPrevTotal = selectedPrev && selectedPrev.contacts ? selectedPrev.contacts.length : 0;
  const selectedPrevRemaining = selectedPrevTotal - selectedPrevFirstMsg;

  // helpers for Responded/No Response
  const selectedPrevResponded = selectedPrev && typeof selectedPrev.respondedCount === "number" ? selectedPrev.respondedCount : 0;
  const selectedPrevNoResponse = selectedPrev && typeof selectedPrev.noResponseCount === "number" ? selectedPrev.noResponseCount : 0;

  const styles = {
    page: {
      minHeight: "100vh",
      background: COLOR_LIGHT_BG,
      fontFamily: "Inter, Arial, sans-serif",
      color: COLOR_DARK,
      padding: "0",
      margin: "0"
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: COLOR_WHITE,
      boxShadow: "0 2px 8px rgba(35,36,58,0.05)",
      padding: "16px 32px",
      borderBottom: `1.5px solid ${COLOR_GRAY}`,
      gap: 18
    },
    leftHeader: {
      display: "flex",
      alignItems: "center",
      gap: 18
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
      padding: 0
    },
    headTitle: {
      fontWeight: 900,
      fontSize: "1.45rem",
      textAlign: "left",
      color: COLOR_PRIMARY,
      letterSpacing: "-1px"
    },
    logo: {
      width: 110,
      height: 44,
      objectFit: "contain",
      marginLeft: 18,
      marginRight: 0
    },
    tabRow: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 18,
      background: COLOR_WHITE,
      borderBottom: `1.5px solid ${COLOR_GRAY}`,
      padding: "16px 0"
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
      transition: "background 0.14s, color 0.14s"
    },
    tabActive: {
      background: COLOR_CORAL,
      color: COLOR_WHITE,
      border: `1.5px solid ${COLOR_CORAL}`,
      borderBottom: "none"
    },
    contentRow: {
      display: "flex",
      justifyContent: "center",
      gap: "64px", // Wider gap to match wider cards
      margin: "40px 0 36px 0"
    },
    card: {
      background: COLOR_WHITE,
      borderRadius: "18px",
      padding: "34px 34px",
      boxShadow: "0 4px 16px rgba(35,36,58,0.08)",
      minWidth: 400,
      maxWidth: 480,
      border: `1.5px solid ${COLOR_GRAY}`,
      display: "flex",
      flexDirection: "column",
      gap: 8
    },
    cardTitle: {
      fontWeight: 800,
      fontSize: "1.18rem",
      color: COLOR_PRIMARY,
      marginBottom: "8px",
      letterSpacing: "-0.5px"
    },
    cardRow: {
      display: "flex",
      alignItems: "center",
      margin: "2px 0",
      fontSize: "1.09rem",
      fontWeight: 700
    },
    cardLabel: {
      minWidth: 130,
      color: COLOR_DARK
    },
    cardValue: {
      color: COLOR_CORAL,
      fontWeight: 800,
      fontSize: "1.12rem",
      marginLeft: 8
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
      gap: "2.5rem"
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
      fontFamily: "monospace"
    },
    controlsRow: {
      display: "flex",
      justifyContent: "center",
      gap: "22px",
      margin: "34px 0 0 0"
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
      letterSpacing: "-0.6px"
    },
    prevDetails: {
      background: COLOR_WHITE,
      borderRadius: "18px",
      padding: "30px 28px 20px 28px",
      boxShadow: "0 4px 16px rgba(35,36,58,0.07)",
      maxWidth: 650,
      margin: "32px auto 18px auto",
      border: `1.5px solid ${COLOR_GRAY}`
    },
    prevDetailsRow: {
      display: "flex",
      flexDirection: "row",
      marginBottom: "5px",
      gap: "16px",
      alignItems: "center",
      fontWeight: 600,
      fontSize: "1.11rem"
    },
    prevDetailsLabel: {
      color: COLOR_DARK,
      minWidth: 130,
      fontWeight: 700
    },
    prevDetailsValue: {
      color: COLOR_CORAL,
      fontWeight: 800,
      fontSize: "1.11rem"
    },
    prevCampaignsListSection: {
      background: COLOR_WHITE,
      borderRadius: "18px",
      maxWidth: 750,
      margin: "32px auto",
      border: `1.5px solid ${COLOR_GRAY}`,
      boxShadow: "0 2px 12px rgba(35,36,58,0.06)",
      padding: "0 0 24px 0"
    },
    prevCampaignsListTitle: {
      fontWeight: 800,
      color: COLOR_PRIMARY,
      fontSize: "1.13rem",
      padding: "18px 0 12px 32px",
      borderBottom: `1.5px solid ${COLOR_GRAY}`,
      background: "#faf8f8",
      letterSpacing: "-0.5px"
    },
    prevListTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: 0
    },
    prevListTh: {
      padding: "12px 0 8px 0",
      color: "#7c7c92",
      fontWeight: 700,
      borderBottom: `1.5px solid ${COLOR_GRAY}`,
      background: "#fafbfc",
      fontSize: "1.03rem",
      textAlign: "left",
      paddingLeft: 32
    },
    prevListTd: {
      padding: "11px 0",
      fontWeight: 600,
      fontSize: "1.07rem",
      color: COLOR_DARK,
      borderBottom: `1px solid #f5efef`,
      textAlign: "left",
      paddingLeft: 32
    },
    prevListTdStatus: {
      color: "#4caf50",
      fontWeight: 800,
      fontSize: "1.08rem"
    },
    prevListTdSelect: {
      textAlign: "center",
      fontSize: "1.4rem",
      color: COLOR_CORAL,
      cursor: "pointer",
      minWidth: 70
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
      minWidth: 70
    },
    prevControlsRow: {
      display: "flex",
      justifyContent: "center",
      gap: "22px",
      margin: "24px 0 0 0"
    },
    pagination: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "12px",
      marginTop: "12px"
    },
    pageBtn: {
      padding: "6px 14px",
      borderRadius: "6px",
      background: "#f6f6f6",
      border: `1.5px solid ${COLOR_GRAY}`,
      color: COLOR_CORAL,
      fontWeight: 700,
      cursor: "pointer",
      fontSize: "1.05rem",
      outline: "none"
    },
    pageBtnActive: {
      background: COLOR_CORAL,
      color: COLOR_WHITE,
      border: `1.5px solid ${COLOR_CORAL}`
    }
  };

  // Reset selectedPrevIndex if page changes
  useEffect(() => {
    setSelectedPrevIndex(0);
  }, [prevPage]);

  // Determine campaign status for previous campaigns
  function getPrevCampaignStatus(row) {
    const total = row.contacts?.length || 0;
    const sent = typeof row.firstMsgCount === "number" ? row.firstMsgCount : 0;
    const remaining = total - sent;
    return remaining === 0 ? "Done" : "In progress";
  }

  // Format previous campaign date to match current campaign style
  function formatPrevCampaignDate(rawDate) {
    if (!rawDate) return "N/A";
    // Try to parse as ISO if possible, else fallback
    const dateObj = new Date(rawDate);
    if (!isNaN(dateObj.getTime())) {
      return formatDate(dateObj);
    }
    // If not ISO, could be already a nice string, just return
    return rawDate;
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
          onError={e => { e.currentTarget.src = "https://via.placeholder.com/120x44?text=Logo"; }}
        />
      </div>

      {/* Tabs */}
      <div style={styles.tabRow}>
        <button
          style={activeTab === "current" ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          onClick={() => setActiveTab("current")}
        >
          Current Campaign
        </button>
        <button
          style={activeTab === "previous" ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          onClick={() => setActiveTab("previous")}
        >
          Previous Campaign
        </button>
      </div>

      {activeTab === "current" ? (
        <>
          {/* Cards */}
          <div style={styles.contentRow}>
            {/* Current Booster Campaign Card */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>Current Booster Campaign</div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Campaign Name:</span>
                <span style={styles.cardValue}>{currentBoosterCampaignName}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Time:</span>
                <span style={styles.cardValue}>{currentCampaignTimestamp || "N/A"}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Total Added:</span>
                <span style={styles.cardValue}>{loading ? "Loading..." : currTotal}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>1st Message Sent:</span>
                <span style={styles.cardValue}>{currentFirstMsgCount}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Remaining:</span>
                <span style={styles.cardValue}>{Math.max(currRemaining, 0)}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Responded:</span>
                <span style={styles.cardValue}>{currentRespondedCount}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>No Response:</span>
                <span style={styles.cardValue}>{currentNoResponseCount}</span>
              </div>
            </div>
            {/* Previous Booster Campaign Card */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>Previous Booster Campaign</div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Campaign Name:</span>
                <span style={styles.cardValue}>{previousBoosterCampaignName}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Time:</span>
                <span style={styles.cardValue}>{previousCampaignTimestamp || "N/A"}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Total Added:</span>
                <span style={styles.cardValue}>{loading ? "Loading..." : prevTotal}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>1st Message Sent:</span>
                <span style={styles.cardValue}>{previousFirstMsgCount}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Remaining:</span>
                <span style={styles.cardValue}>{Math.max(prevRemaining, 0)}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Responded:</span>
                <span style={styles.cardValue}>{previousRespondedCount}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>No Response:</span>
                <span style={styles.cardValue}>{previousNoResponseCount}</span>
              </div>
            </div>
          </div>
          {/* Start New Campaign button below boxes */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
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
              <span style={styles.prevDetailsValue}>{selectedPrev?.name || "N/A"}</span>
            </div>
            <div style={styles.prevDetailsRow}>
              <span style={styles.prevDetailsLabel}>Date:</span>
              <span style={styles.prevDetailsValue}>{formatPrevCampaignDate(selectedPrev?.date)}</span>
            </div>
            <div style={styles.prevDetailsRow}>
              <span style={styles.prevDetailsLabel}>Total Added:</span>
              <span style={styles.prevDetailsValue}>
                {(selectedPrev.contacts && selectedPrev.contacts.length) || 0}
              </span>
            </div>
            <div style={styles.prevDetailsRow}>
              <span style={styles.prevDetailsLabel}>1st Message Sent:</span>
              <span style={styles.prevDetailsValue}>{selectedPrevFirstMsg}</span>
            </div>
            <div style={styles.prevDetailsRow}>
              <span style={styles.prevDetailsLabel}>Remaining:</span>
              <span style={styles.prevDetailsValue}>{Math.max(selectedPrevRemaining, 0)}</span>
            </div>
            <div style={styles.prevDetailsRow}>
              <span style={styles.prevDetailsLabel}>Responded:</span>
              <span style={styles.prevDetailsValue}>{selectedPrevResponded}</span>
            </div>
            <div style={styles.prevDetailsRow}>
              <span style={styles.prevDetailsLabel}>No Response:</span>
              <span style={styles.prevDetailsValue}>{selectedPrevNoResponse}</span>
            </div>
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
                  <th style={Object.assign({}, styles.prevListTh, { minWidth: 70, textAlign: "center" })}>Select</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPreviousCampaigns.map((row, idx) => (
                  <tr key={row.name + row.date}>
                    <td style={styles.prevListTd}>{row.name}</td>
                    <td style={styles.prevListTd}>{formatPrevCampaignDate(row.date)}</td>
                    <td style={{ ...styles.prevListTd, ...styles.prevListTdStatus }}>
                      {getPrevCampaignStatus(row)}
                    </td>
                    <td
                      style={idx === selectedPrevIndex ? styles.prevListTdSelectSelected : styles.prevListTdSelect}
                      onClick={() => { setSelectedPrevIndex(idx); }}
                    >
                      {idx === selectedPrevIndex ? "●" : "○"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination controls */}
            {totalPrevPages > 1 && (
              <div style={styles.pagination}>
                <button
                  style={styles.pageBtn}
                  disabled={prevPage === 1}
                  onClick={() => setPrevPage(prev => Math.max(1, prev - 1))}
                >
                  &larr; Previous
                </button>
                {Array.from({ length: totalPrevPages }, (_, i) => (
                  <button
                    key={i}
                    style={prevPage === i + 1 ? { ...styles.pageBtn, ...styles.pageBtnActive } : styles.pageBtn}
                    onClick={() => setPrevPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  style={styles.pageBtn}
                  disabled={prevPage === totalPrevPages}
                  onClick={() => setPrevPage(prev => Math.min(totalPrevPages, prev + 1))}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
          {/* Controls */}
          <div style={{
            ...styles.prevControlsRow,
            justifyContent: "center",
            gap: 0
          }}>
            <Link href="/campaign" legacyBehavior>
              <a style={styles.controlBtn}>Start New Campaign</a>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}