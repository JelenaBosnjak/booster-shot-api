import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const [modalStep, setModalStep] = useState("select"); // select | confirm | loading | success
const COLOR_DARK = "#23243a";
const COLOR_CORAL = "rgb(247 133 127)";
const COLOR_CORAL_LIGHT = "#ffe9e7";
const COLOR_CORAL_LIGHTER = "#fff2f1";
const COLOR_LIGHT_BG = "#fafbfc";
const COLOR_GRAY = "#e5e7eb";
const COLOR_WHITE = "#fff";
const COLOR_SUCCESS = "#28a745";
const COLOR_PRIMARY = COLOR_DARK;
const FONT_FAMILY = '"Inter", "Lato", "Segoe UI", "Arial", sans-serif';


const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzkVfD4fEUHuGryVKiRR_SKtWeyMFCkxTyGeAKPlaY0yR5XJq_0xuYYEbA6v3odZeMKHA/exec";

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "rgba(34,34,44,0.28)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}
      onClick={onClose}
    >
      <div
        style={{
          background: COLOR_WHITE,
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(35,36,58,0.13)",
          maxWidth: 850,
          width: "98vw",
          padding: 32,
          position: "relative",
          fontFamily: FONT_FAMILY
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            right: 14,
            top: 14,
            background: "none",
            border: "none",
            fontSize: 26,
            color: "#bbb",
            cursor: "pointer"
          }}
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

function AnimatedDots({ color = COLOR_CORAL }) {
  return (
    <span style={{ display: "inline-block", marginLeft: 6 }}>
      <span style={{
        display: "inline-block",
        width: 8, height: 8, borderRadius: "50%",
        background: color, marginRight: 3, animation: "bounce 1s infinite alternate"
      }} />
      <span style={{
        display: "inline-block",
        width: 8, height: 8, borderRadius: "50%",
        background: color, marginRight: 3, animation: "bounce 1s infinite alternate 0.2s"
      }} />
      <span style={{
        display: "inline-block",
        width: 8, height: 8, borderRadius: "50%",
        background: color, animation: "bounce 1s infinite alternate 0.4s"
      }} />
      <style>
        {`@keyframes bounce { 0% {transform: translateY(0);} 100% {transform: translateY(-8px);} }`}
      </style>
    </span>
  );
}

export default function ContactList() {
  const router = useRouter();
  const [locationId, setLocationId] = useState(null);
  const [currentPageUrl, setCurrentPageUrl] = useState(null);

  // Campaign config
  const [boosterShotMessage, setBoosterShotMessage] = useState('');
  const [campaign, setCampaign] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [offers, setOffers] = useState([]);
  const [offerCategories, setOfferCategories] = useState([]);
  const [campaignNames, setCampaignNames] = useState([]);
  const [optimizedMessage, setOptimizedMessage] = useState('');

  // Test
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Contact selection
  const [contacts, setContacts] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [limit, setLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [prevPages, setPrevPages] = useState([]);
  const [rateLimitError, setRateLimitError] = useState(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [contactsModal, setContactsModal] = useState(false);

  // Latest Import
  const [latestImportLoading, setLatestImportLoading] = useState(false);
  const [latestImportUsed, setLatestImportUsed] = useState(false);

  // Select all records (across all pages)
  const [allRecordsSelected, setAllRecordsSelected] = useState(false);

  useEffect(() => {
    function getLocationId() {
      if (router.query && router.query.locationId) return router.query.locationId;
      const params = new URLSearchParams(window.location.search);
      if (params.get("locationId")) return params.get("locationId");
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        if (hashParams.get("locationId")) return hashParams.get("locationId");
      }
      if (typeof window !== "undefined" && localStorage.getItem("locationId"))
        return localStorage.getItem("locationId");
      try {
        if (window.parent && window.parent !== window) {
          const parentPath = window.parent.location.pathname;
          const match = parentPath.match(/\/location\/([a-zA-Z0-9]+)/);
          if (match && match[1]) return match[1];
        }
      } catch (e) {}
      const pathMatch = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
      if (pathMatch && pathMatch[1]) return pathMatch[1];
      const el = document.querySelector('.sidebar-v2-location');
      if (el) {
        const classes = Array.from(el.classList);
        const id = classes.find(
          cls =>
            /^[a-zA-Z0-9]{10,}$/.test(cls) &&
            !["sidebar-v2-location", "flex", "v2-open", "sidebar-v2", "sidebar", "location"].includes(cls)
        );
        if (id) return id;
      }
      return null;
    }
    const existing = localStorage.getItem("locationId");
    const id = getLocationId();
    if (id && (!existing || existing !== id)) {
      setLocationId(id);
      if (typeof window !== "undefined") {
        localStorage.setItem("locationId", id);
      }
    } else if (existing) {
      setLocationId(existing);
    }
  }, [router.asPath]);

  useEffect(() => {
    async function fetchTags() {
      if (!locationId) return;
      try {
        const res = await fetch(`/api/get-tags?locationId=${locationId}`);
        if (!res.ok) throw new Error('Failed to fetch tags');
        const data = await res.json();
        setTags(data.tags || []);
      } catch (err) {
        setTags([]);
      }
    }
    fetchTags();
  }, [locationId]);

  useEffect(() => {
    fetch(WEB_APP_URL)
      .then(res => res.json())
      .then(data => {
        setOffers(data);
        const categories = Array.from(new Set(data.map(row => row.Offer_Category).filter(Boolean)));
        setOfferCategories(categories);
      })
      .catch(err => {
        console.error('Failed to fetch sheet:', err);
      });
  }, []);

  useEffect(() => {
    if (!boosterShotMessage) {
      setCampaignNames([]);
      setCampaign('');
      setSmsMessage('');
      return;
    }
    const filtered = offers.filter(row => row.Offer_Category === boosterShotMessage);
    setCampaignNames(filtered.map(row => row.Offer_Name));
    setCampaign('');
    setSmsMessage('');
  }, [boosterShotMessage, offers]);

  useEffect(() => {
    if (!campaign) {
      setSmsMessage('');
      return;
    }
    const offer = offers.find(row => row.Offer_Name === campaign && row.Offer_Category === boosterShotMessage);
    setSmsMessage(offer?.Text_Preview || '');
  }, [campaign, boosterShotMessage, offers]);

  const loadPage = async (url, pageNumber, resetHistory = false) => {
  setCurrentPageUrl(url);
  setLoadingContacts(true);
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (res.ok) {
      setContacts(data.contacts || []);
      setTotalCount(data.pagination?.total || 0);
      setCurrentPage(pageNumber);
      setNextPageUrl(data.pagination?.hasMore ? data.pagination.nextPageUrl : null);
      setContactsLoaded(true);

if (resetHistory) {
  setPrevPages([]);
}
    } else {
      alert('API error: ' + (data.error?.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Fetch Error:', error);
    alert('Network error occurred');
  } finally {
    setLoadingContacts(false);
  }
};

const handleLoadContacts = () => {
  setContacts([]);
  setPrevPages([]); // Reset pagination history!
  setCurrentPage(1);
  setNextPageUrl(null);
  setContactsLoaded(false);
  setAllRecordsSelected(false);
  if (locationId) {
  const initialUrl = `/api/get-contacts?locationId=${locationId}&limit=${limit}`;
  setCurrentPageUrl(initialUrl);
  loadPage(initialUrl, 1, true);
 }
};

  const openContactsModal = () => {
    setContactsModal(true);
    if (!contactsLoaded && !loadingContacts) handleLoadContacts();
  };

  const filteredContacts = () => {
    let filtered = contacts;
    if (selectedTag) {
      filtered = filtered.filter(contact =>
        Array.isArray(contact.tags) && contact.tags.includes(selectedTag)
      );
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        (contact.firstName && contact.firstName.toLowerCase().includes(term)) ||
        (contact.lastName && contact.lastName.toLowerCase().includes(term)) ||
        (contact.email && contact.email.toLowerCase().includes(term)) ||
        (contact.phone && contact.phone.toLowerCase().includes(term))
      );
    }
    return filtered;
  };

  // Select all contacts on page (checkbox in header)
  const isAllOnPageSelected = () => {
      if (allRecordsSelected) return true;
            const filtered = filteredContacts();
  return (
    filtered.length > 0 &&
    filtered.every(c => selectedContacts.has(c.id))
  );
};

  const handleHeaderCheckboxChange = () => {
    const filtered = filteredContacts();
    const idsOnPage = filtered.map(c => c.id);
    const newSet = new Set(selectedContacts);
    if (!isAllOnPageSelected()) {
      idsOnPage.forEach(id => newSet.add(id));
    } else {
      idsOnPage.forEach(id => newSet.delete(id));
      setAllRecordsSelected(false);
    }
    setSelectedContacts(newSet);
  };

  // "Select all X records" logic
  const handleSelectAllRecords = () => {
    setAllRecordsSelected(true);
  };

  // Clicking "Unselect All" (checkbox in header)
  const handleUnselectAll = () => {
    setSelectedContacts(new Set());
    setAllRecordsSelected(false);
  };

  const toggleSelectContact = (id) => {
  if (allRecordsSelected) {
    // If all selected and user clicks a row, unselect all and then toggle this one
    setAllRecordsSelected(false);
    setSelectedContacts(new Set([id]));
    return;
  }
  const newSet = new Set(selectedContacts);
  if (newSet.has(id)) {
    newSet.delete(id);
    setAllRecordsSelected(false);
  } else {
    newSet.add(id);
  }
  setSelectedContacts(newSet);
};

  const handleSelectLatestImportedContacts = async () => {
    if (!locationId) {
      alert('Location ID not found.');
      return;
    }
    setLatestImportLoading(true);
    try {
      const res = await fetch(`/api/get-contacts?locationId=${locationId}&latestImport=true`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to load latest imported contacts.");
        setLatestImportLoading(false);
        return;
      }

      if (!data.contacts || data.contacts.length === 0) {
        alert("No latest imported contacts found.");
        setLatestImportLoading(false);
        return;
      }

      const newSet = new Set(selectedContacts);
      data.contacts.forEach(contact => {
        if (contact.id) newSet.add(contact.id);
      });
      setSelectedContacts(newSet);

      setLatestImportUsed(true); // Disable the button after use
    } catch (err) {
      alert("Failed to select latest imported contacts.");
    } finally {
      setLatestImportLoading(false);
    }
  };

const handleNextPage = () => {
  if (nextPageUrl) {
  setPrevPages(prev => [...prev, { url: currentPageUrl, page: currentPage }]);
  loadPage(nextPageUrl, currentPage + 1);
 }
};

const handlePreviousPage = () => {
  if (currentPage > 1 && prevPages.length > 0) {
    const prev = prevPages[prevPages.length - 1];
    setPrevPages(prevPages.slice(0, -1)); // Remove last entry
    loadPage(prev.url, prev.page);
  }
};

  const handleOptimizeAI = async () => {
    if (!smsMessage) {
      alert("Please enter a message to optimize.");
      return;
    }
    setOptimizing(true);
    try {
      const res = await fetch("/api/optimize-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: smsMessage })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to optimize message");
        setOptimizing(false);
        return;
      }
      setSmsMessage(data.optimized);
      setOptimizedMessage(data.optimized);
    } catch (err) {
      alert("Failed to optimize SMS.");
    } finally {
      setOptimizing(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone) {
      alert("Enter a phone number.");
      return;
    }
    if (!smsMessage) {
      alert('No message to send.');
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: smsMessage, phone: testPhone })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send test SMS!");
      } else {
        alert("Test SMS sent!");
      }
    } catch (err) {
      alert("Failed to send test SMS.");
    } finally {
      setSendingTest(false);
    }
  };

  const handleLaunchCampaign = async () => {
  setCampaignLoading(true);
  setRateLimitError(null);
  try {
    const response = await fetch('/api/add-tag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contactIds: allRecordsSelected ? "ALL" : Array.from(selectedContacts),
        tag: 'booster shot',
        boosterShotMessage: smsMessage,
        boosterCampaignName: campaign,
        locationId
      })
    });

    const result = await response.json();

    if (response.status === 429) {
      setRateLimitError({
        message: result.error,
        resetTime: result.resetTime
      });
      return;
    }

    if (!response.ok) {
      throw new Error(result.error || 'Failed to add tags');
    }

    setContactsLoaded(false);
    setSelectedContacts(new Set());
    setAllRecordsSelected(false);

  } catch (err) {
    console.error(err);
    alert(`Error: ${err.message}`);
  } finally {
    setCampaignLoading(false);
  }
};

  const getCharCount = () => smsMessage.length;
  const getSMSCount = () => Math.ceil(smsMessage.length / 160);

  // Modal UI - Contact table
  const contactModalUI = (
    <div>
      <h2 style={{marginTop: 0, marginBottom: 20, color: COLOR_PRIMARY, fontWeight: 800, fontFamily: FONT_FAMILY}}>
        Before launching Select Campaign Contacts
      </h2>
      {/* Filter and search row above select buttons */}
      <div style={{display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-end"}}>
        <select
          value={selectedTag}
          onChange={e => setSelectedTag(e.target.value)}
          style={{
            width: 200,
            borderRadius: 8,
            border: `1.5px solid ${COLOR_GRAY}`,
            padding: 8,
            fontSize: 15,
            fontFamily: FONT_FAMILY
          }}
        >
          <option value="">All Contacts</option>
          {tags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search contacts by name, email, or phone..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            borderRadius: 8,
            border: `1.5px solid ${COLOR_GRAY}`,
            padding: 8,
            fontSize: 15,
            fontFamily: FONT_FAMILY,
            minWidth: 180
          }}
        />
      </div>
      const launchModalUI = (
  <>
    {modalStep === "confirm" && (
      <div>
        <h2 style={{marginBottom: 16, color: COLOR_PRIMARY, fontWeight: 800}}>Ready to Launch Campaign?</h2>
        <div style={{marginBottom: 24, color: COLOR_DARK}}>
          You’re about to start a campaign for <b>{allRecordsSelected ? totalCount : selectedContacts.size}</b> contacts.<br/>
          Depending on the number of contacts, this may take a few minutes.
        </div>
        <div style={{display: "flex", justifyContent: "flex-end", gap: 10}}>
          <button
            onClick={() => setModalStep("select")}
            style={{
              padding: "10px 30px", borderRadius: 8, fontWeight: 700,
              background: "#eee", border: "none", color: COLOR_DARK, cursor: "pointer", fontFamily: FONT_FAMILY
            }}
          >Cancel</button>
          <button
            onClick={async () => {
              setModalStep("loading");
              await handleLaunchCampaign();
              setModalStep("success");
            }}
            style={{
              padding: "10px 30px", borderRadius: 8, fontWeight: 700,
              background: COLOR_CORAL, color: COLOR_WHITE, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY
            }}
          >Start Campaign</button>
        </div>
      </div>
    )}
    {modalStep === "loading" && (
      <div style={{textAlign: "center", padding: 24}}>
        <h3 style={{marginTop: 0, color: COLOR_PRIMARY, fontWeight: 800}}>🚀 Starting your campaign...</h3>
        <div style={{margin: "16px 0", color: "#555"}}>
          Please wait while we process your contacts.<br/>
          <AnimatedDots />
          <div style={{marginTop: 14, fontSize: 14, color: "#b6573f"}}>This may take a few minutes for large campaigns.</div>
        </div>
      </div>
    )}
    {modalStep === "success" && (
      <div style={{textAlign: "center", padding: 24}}>
        <h3 style={{color: COLOR_SUCCESS, marginBottom: 16, fontWeight: 800}}>🎉 Campaign started!</h3>
        <div style={{marginBottom: 22}}>
          Your messages will be sent shortly.<br/>
          You can view campaign progress on the <a href="/stats" style={{color: COLOR_CORAL}}>Status page</a>.
        </div>
        <button
          style={{
            padding: "10px 34px", borderRadius: 8, fontWeight: 700,
            background: COLOR_CORAL, color: COLOR_WHITE, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY
          }}
          onClick={() => {
            setContactsModal(false);
            setModalStep("select");
          }}
        >Close</button>
      </div>
    )}
  </>
);
      <div style={{display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 12}}>
        <button style={{
          background: COLOR_PRIMARY, color: COLOR_WHITE, border: "none",
          borderRadius: 6, padding: "7px 19px", fontWeight: 700, cursor: "pointer", fontFamily: FONT_FAMILY,
          minWidth: 110
        }} onClick={isAllOnPageSelected() ? handleUnselectAll : handleHeaderCheckboxChange}>
          {isAllOnPageSelected() ? "Unselect All" : "Select All"}
        </button>
        <div style={{flex: 1}} />
        <button
          onClick={handleSelectLatestImportedContacts}
          disabled={latestImportLoading || latestImportUsed}
          style={{
            marginTop: 0,
            background: latestImportLoading || latestImportUsed ? "#e5e7eb" : "#e4f2dd",
            color: latestImportLoading || latestImportUsed ? "#888" : "#22723e",
            border: "none",
            borderRadius: 7,
            padding: "8px 0",
            fontWeight: 800,
            fontSize: 14,
            width: 200,
            cursor: latestImportLoading || latestImportUsed ? "not-allowed" : "pointer",
            boxShadow: latestImportLoading || latestImportUsed ? "none" : "0 1px 4px 0 rgba(60,140,80,0.06)",
            transition: "background 0.13s"
          }}
        >
          {latestImportLoading ? "Selecting..." : latestImportUsed ? "Latest Import Selected" : "Select Latest Import"}
        </button>
      </div>
      {/* Contact table */}
      <div style={{
        maxHeight: 350, overflowY: "auto", border: `1.3px solid ${COLOR_GRAY}`,
        borderRadius: 8, padding: 0, background: "#f6f6fa", marginBottom: 10
      }}>
        <table style={{width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: FONT_FAMILY}}>
          <thead>
            <tr style={{
              background: "#f0f2f8",
              color: COLOR_DARK,
              fontWeight: 900,
              fontSize: 15,
              fontFamily: FONT_FAMILY
            }}>
              <th style={{width: 38, padding: 8, borderBottom: `1px solid ${COLOR_GRAY}`}}>
                <input
                  type="checkbox"
                  checked={isAllOnPageSelected()}
                  indeterminate={selectedContacts.size > 0 && !isAllOnPageSelected()}
                  onChange={handleHeaderCheckboxChange}
                  style={{
                    accentColor: COLOR_CORAL, width: 20, height: 20, cursor: "pointer"
                  }}
                />
              </th>
              <th style={{textAlign: "left", padding: 8, borderBottom: `1px solid ${COLOR_GRAY}`}}>Name</th>
              <th style={{textAlign: "left", padding: 8, borderBottom: `1px solid ${COLOR_GRAY}`}}>Phone</th>
              <th style={{textAlign: "left", padding: 8, borderBottom: `1px solid ${COLOR_GRAY}`}}>Email</th>
              <th style={{textAlign: "left", padding: 8, borderBottom: `1px solid ${COLOR_GRAY}`}}>Tags</th>
            </tr>
          </thead>
          <tbody>
            {loadingContacts && (
              <tr>
                <td colSpan={5} style={{padding: 18, textAlign: "center"}}>Loading contacts...</td>
              </tr>
            )}
            {!loadingContacts && filteredContacts().length === 0 && (
              <tr>
                <td colSpan={5} style={{padding: 18, textAlign: "center", color: "#999"}}>No contacts found.</td>
              </tr>
            )}
            {!loadingContacts && filteredContacts().map((contact) => (
              <tr key={contact.id}
                  style={{
                    background: selectedContacts.has(contact.id) ? COLOR_CORAL_LIGHT : "inherit",
                    borderBottom: `1px solid ${COLOR_GRAY}`,
                    fontFamily: FONT_FAMILY
                  }}>
                <td style={{padding: 8, textAlign: "center"}}>
                  <input
                    type="checkbox"
                    checked={allRecordsSelected || selectedContacts.has(contact.id)}
                    onChange={() => toggleSelectContact(contact.id)}
                    style={{
                      accentColor: COLOR_CORAL, width: 20, height: 20, cursor: "pointer"
                    }}
                  />
                </td>
                <td style={{padding: 8, fontWeight: 600, fontSize: 15}}>
                  {contact.firstName || ''} {contact.lastName || ''}
                </td>
                <td style={{padding: 8, color: "#8b8b99", fontSize: 14}}>{contact.phone || ''}</td>
                <td style={{padding: 8, color: "#8b8b99", fontSize: 14}}>{contact.email || ''}</td>
                <td style={{padding: 8}}>
                  {Array.isArray(contact.tags) && contact.tags.length > 0
                    ? contact.tags.map(tag => (
                      <span key={tag} style={{
                        display: 'inline-block', fontSize: 13, color: COLOR_CORAL,
                        background: COLOR_CORAL_LIGHTER, borderRadius: 4, padding: '2px 8px', marginRight: 6,
                        fontFamily: FONT_FAMILY
                      }}>{tag}</span>
                    ))
                    : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* All records selected banner */}
        {allRecordsSelected && (
          <div style={{
            background: "#e4f2dd",
            padding: "12px 18px",
            borderTop: `1px solid #b4deb1`,
            color: "#22723e",
            fontWeight: 700,
            fontFamily: FONT_FAMILY,
            fontSize: 15,
            textAlign: "center"
          }}>
            All {totalCount} contacts are selected.
          </div>
        )}
      </div>
      {/* Select all records banner and summary above pagination */}
      {isAllOnPageSelected() && !allRecordsSelected && filteredContacts().length > 0 && (
        <div style={{
          background: "#f5f5f5",
          padding: "12px 18px",
          borderTop: `1px solid ${COLOR_GRAY}`,
          color: COLOR_PRIMARY,
          fontWeight: 600,
          fontFamily: FONT_FAMILY,
          fontSize: 15,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10
        }}>
          <span>
            You have selected {filteredContacts().length} records.
            {" "}
            {totalCount > filteredContacts().length && (
              <>Select all {totalCount} records?</>
            )}
          </span>
          {totalCount > filteredContacts().length && (
            <button
              onClick={handleSelectAllRecords}
              style={{
                marginLeft: 16,
                background: COLOR_CORAL,
                color: COLOR_WHITE,
                border: "none",
                borderRadius: 5,
                padding: "6px 18px",
                fontWeight: 700,
                fontSize: 15,
                fontFamily: FONT_FAMILY,
                cursor: "pointer"
              }}
            >
              Select all {totalCount} records
            </button>
          )}
        </div>
      )}
      {/* Pagination */}
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16}}>
        <button
          style={{
            background: "#efefef", color: "#444", border: "none", borderRadius: 6,
            padding: "8px 24px", fontWeight: 700, cursor: currentPage === 1 ? "not-allowed" : "pointer", fontFamily: FONT_FAMILY
          }}
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
        >Previous</button>
        <span style={{fontSize: 15, color: "#888", fontFamily: FONT_FAMILY}}>
          Page {currentPage} of {Math.max(1, Math.ceil(totalCount / limit))}
        </span>
        <button
          style={{
            background: nextPageUrl ? COLOR_CORAL : "#efefef",
            color: nextPageUrl ? COLOR_WHITE : "#888",
            border: "none", borderRadius: 6,
            padding: "8px 24px", fontWeight: 700, cursor: nextPageUrl ? "pointer" : "not-allowed", fontFamily: FONT_FAMILY
          }}
          onClick={handleNextPage}
          disabled={!nextPageUrl}
        >Next</button>
      </div>
      <div style={{display: "flex", justifyContent: "flex-end", gap: 10}}>
  <button
    onClick={() => {
      setContactsModal(false);
      setAllRecordsSelected(false);
    }}
    style={{
      padding: "10px 30px", borderRadius: 8, fontWeight: 700,
      background: "#eee", border: "none", color: COLOR_DARK, cursor: "pointer", fontFamily: FONT_FAMILY
    }}
  >Cancel</button>
  <button
  onClick={() => setModalStep("confirm")}
  disabled={selectedContacts.size === 0 && !allRecordsSelected}
  style={{
    padding: "10px 30px", borderRadius: 8, fontWeight: 700,
    background: (selectedContacts.size === 0 && !allRecordsSelected) ? "#ecb6b2" : COLOR_CORAL,
    color: COLOR_WHITE, border: "none", cursor: (selectedContacts.size === 0 && !allRecordsSelected) ? "not-allowed" : "pointer",
    fontFamily: FONT_FAMILY,
    marginLeft: 10
  }}
>
  🎯 Launch Campaign ({allRecordsSelected ? totalCount : selectedContacts.size})
</button>
</div>
      {rateLimitError && (
        <div style={{
          background: '#fff2f2', color: '#d43636', border: `1.5px solid #d43636`,
          padding: '10px', borderRadius: '10px', marginTop: '14px', fontWeight: 600,
          fontFamily: FONT_FAMILY
        }}>
          <strong>🚦 Rate Limit Hit:</strong>
          <div>{rateLimitError.message}</div>
        </div>
      )}
    </div>
  );

  // Main design
  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafbfc",
      fontFamily: FONT_FAMILY
    }}>
      <div style={{height: 16}} /> {/* Top spacer */}
      <img
        src="/logo.png"
        alt="foreverbooked logo"
        style={{
          width: 180,
          display: 'block',
          margin: '0 auto 18px auto',
          objectFit: 'contain',
          background: "transparent",
          borderRadius: 0,
          boxShadow: "none",
          height: 60,
          maxHeight: 60
        }}
        onError={e => { e.target.src = "https://via.placeholder.com/180x60?text=Logo"; }}
      />
      <div style={{height: 6}} /> {/* Less space between logo and form */}
      <div style={{
        background: COLOR_WHITE,
        borderRadius: 18,
        boxShadow: '0 4px 16px rgba(35,36,58,0.07)',
        padding: '44px 56px',
        maxWidth: 880,
        margin: '0 auto 40px auto',
        border: `1.5px solid ${COLOR_GRAY}`,
        fontFamily: FONT_FAMILY
      }}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10}}>
          <div>
            <span style={{fontWeight: 900, fontSize: "2.1rem", color: COLOR_PRIMARY, fontFamily: FONT_FAMILY}}>SMS Campaign</span>
            <div style={{fontSize: 15, color: "#888", marginTop: 2, fontFamily: FONT_FAMILY}}>Professional Campaign Management</div>
          </div>
          <a
            href="/stats"
            style={{
              marginLeft: 24,
              background: "#333",
              color: "#fff",
              padding: "11px 28px",
              borderRadius: 9,
              fontWeight: 800,
              fontSize: 17,
              letterSpacing: 0.2,
              border: "none",
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(44,44,55,0.08)",
              transition: "background 0.16s",
              fontFamily: FONT_FAMILY
            }}
          >
            See Status
          </a>
        </div>
        <hr style={{margin: "28px 0"}} />

        {locationId ? (
          <>
            {/* Campaign config */}
            <div style={{display: "flex", gap: 26, marginBottom: 30}}>
              <div style={{flex: 1}}>
                <label style={{
                  fontWeight: 600, color: COLOR_PRIMARY, marginBottom: 12, display: 'block', fontSize: 15, fontFamily: FONT_FAMILY
                }}>Campaign Category</label>
                <select
                  value={boosterShotMessage}
                  onChange={e => setBoosterShotMessage(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: `1.8px solid ${COLOR_GRAY}`,
                    padding: 13,
                    fontSize: 16,
                    fontFamily: FONT_FAMILY
                  }}
                >
                  <option value="">-- Select Booster Shot --</option>
                  {offerCategories.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div style={{flex: 1}}>
                <label style={{
                  fontWeight: 600, color: COLOR_PRIMARY, marginBottom: 12, display: 'block', fontSize: 15, fontFamily: FONT_FAMILY
                }}>Campaign Template</label>
                <select
                  value={campaign}
                  onChange={e => setCampaign(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: `1.8px solid ${COLOR_GRAY}`,
                    padding: 13,
                    fontSize: 16,
                    fontFamily: FONT_FAMILY
                  }}
                  disabled={!boosterShotMessage}
                >
                  <option value="">-- Select Campaign --</option>
                  {campaignNames.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{marginBottom: 30}}>
              <label style={{
                fontWeight: 600, color: COLOR_PRIMARY, marginBottom: 10, display: 'block', fontSize: 15, fontFamily: FONT_FAMILY
              }}>SMS Message</label>
              <textarea
                placeholder="Type your SMS/Text here..."
                value={smsMessage}
                onChange={e => setSmsMessage(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: '86px',
                  borderRadius: '8px',
                  padding: '13px',
                  border: `1.7px solid ${COLOR_GRAY}`,
                  fontSize: '1.09rem',
                  background: COLOR_LIGHT_BG,
                  color: COLOR_DARK,
                  marginTop: '4px',
                  marginBottom: '13px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  resize: "vertical",
                  fontFamily: FONT_FAMILY
                }}
              />
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <span style={{fontSize: 13, color: "#888", fontFamily: FONT_FAMILY}}>
                  {getCharCount()}/{getSMSCount() * 160} characters ({getSMSCount()} SMS{getSMSCount() > 1 ? "es" : ""})
                </span>
                <button
                  onClick={handleOptimizeAI}
                  disabled={optimizing || !smsMessage}
                  style={{
                    padding: "7px 20px",
                    borderRadius: 8,
                    background: optimizing || !smsMessage ? "rgba(247,133,127,0.37)" : "rgba(247,133,127,0.89)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 16,
                    border: "none",
                    cursor: optimizing || !smsMessage ? "not-allowed" : "pointer",
                    outline: "none",
                    boxShadow: "0 2px 6px rgba(44,44,55,0.08)",
                    transition: "background 0.16s",
                    fontFamily: FONT_FAMILY
                  }}
                >
                  {optimizing ? 'Optimizing...' : 'Optimize with AI'}
                </button>
              </div>
            </div>

            {/* Test */}
            <div style={{
              display: "flex", alignItems: "center", gap: 13,
              marginBottom: 32
            }}>
              <input
                type="text"
                placeholder="Enter test phone number"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                style={{
                  flex: 1,
                  borderRadius: 8,
                  border: `1.7px solid ${COLOR_GRAY}`,
                  padding: '10px',
                  fontSize: '1rem',
                  outline: 'none',
                  background: COLOR_LIGHT_BG,
                  color: COLOR_DARK,
                  transition: 'border-color 0.2s',
                  fontFamily: FONT_FAMILY
                }}
              />
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !smsMessage || !testPhone}
                style={{
                  padding: "8px 22px",
                  borderRadius: 8,
                  background: COLOR_WHITE,
                  color: COLOR_DARK,
                  fontWeight: 700,
                  border: "1.5px solid #bbb",
                  cursor: sendingTest || !smsMessage || !testPhone ? "not-allowed" : "pointer",
                  fontFamily: FONT_FAMILY
                }}
              >
                {sendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </div>

            {/* Contacts selection */}
            <div style={{marginBottom: 16}}>
              <label style={{
                fontWeight: 600, color: COLOR_PRIMARY, marginBottom: 7, display: 'block', fontSize: 15, fontFamily: FONT_FAMILY
              }}>Before launching Select Campaign Contacts</label>
              <button
                onClick={openContactsModal}
                style={{
                  padding: "13px 20px",
                  borderRadius: 8,
                  background: "rgba(247,133,127,1)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 18,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(44,44,55,0.08)",
                  outline: "none",
                  letterSpacing: 0.2,
                  transition: "background 0.16s",
                  fontFamily: FONT_FAMILY
                }}
              >
                {selectedContacts.size === 0 && !allRecordsSelected
                          ? "Select Contacts..."
                          : allRecordsSelected
                            ? `Selected: ${totalCount} contact${totalCount > 1 ? "s" : ""}`
                            : `Selected: ${selectedContacts.size} contact${selectedContacts.size > 1 ? "s" : ""}`}
              </button>
            </div>
            <Modal open={contactsModal} onClose={() => {
                    setContactsModal(false);
                      setModalStep("select");
                                    }}>
                    {modalStep === "select" ? contactModalUI : launchModalUI}
            </Modal>
          </>
        ) : (
          <p style={{color: "#b44", fontWeight: 600, fontSize: 17, fontFamily: FONT_FAMILY}}>
            Could not detect subaccount ID from URL. Are you opening from the correct menu link?
          </p>
        )}
      </div>
    </div>
  );
}