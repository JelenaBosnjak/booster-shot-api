import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// ForeverBooked brand colors:
const COLOR_DARK = "#23243a";
const COLOR_CORAL = "rgb(247 133 127)";
const COLOR_CORAL_LIGHT = "#ffe9e7";
const COLOR_CORAL_LIGHTER = "#fff2f1";
const COLOR_LIGHT_BG = "#fafbfc";
const COLOR_GRAY = "#e5e7eb";
const COLOR_WHITE = "#fff";
const COLOR_SUCCESS = "#28a745";
const COLOR_PRIMARY = COLOR_DARK;

// HighLevel menu font
const FONT_FAMILY = '"Inter", "Lato", "Segoe UI", "Arial", sans-serif';

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbzkVfD4fEUHuGryVKiRR_SKtWeyMFCkxTyGeAKPlaY0yR5XJq_0xuYYEbA6v3odZeMKHA/exec";

// Simple Modal implementation (no library needed)
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

export default function ContactList() {
  const router = useRouter();
  const [locationId, setLocationId] = useState(null);

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

  // New: for "Select Latest Imported Contacts"
  const [latestImportLoading, setLatestImportLoading] = useState(false);

  // Debug
  const [debugInfo, setDebugInfo] = useState({});

  // ---- locationId detection (robust + localStorage fallback) ----
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
    // Use localStorage only if not already set, to persist selection even on back navigation
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

  // Tags
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

  // Offers
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

  // Campaign names per category
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

  // SMS message preview per campaign
  useEffect(() => {
    if (!campaign) {
      setSmsMessage('');
      return;
    }
    const offer = offers.find(row => row.Offer_Name === campaign && row.Offer_Category === boosterShotMessage);
    setSmsMessage(offer?.Text_Preview || '');
  }, [campaign, boosterShotMessage, offers]);

  // Contact loading
  const loadPage = async (url, pageNumber, resetHistory = false) => {
    setLoadingContacts(true);
    setRateLimitError(null);
    try {
      const res = await fetch(url);
      const data = await res.json();

      setDebugInfo({
        lastRequest: url,
        response: {
          contactsCount: data.contacts?.length,
          pagination: data.pagination,
          hasMore: data.pagination?.hasMore
        }
      });

      if (res.ok) {
        setContacts(data.contacts || []);
        setTotalCount(data.pagination?.total || 0);
        setCurrentPage(pageNumber);
        setNextPageUrl(data.pagination?.hasMore ? data.pagination.nextPageUrl : null);
        setContactsLoaded(true);

        if (resetHistory) {
          setPrevPages([]);
        } else {
          if (pageNumber > prevPages.length + 1) {
            setPrevPages((prev) => [...prev, url]);
          }
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
    if (locationId) {
      const initialUrl = `/api/get-contacts?locationId=${locationId}&limit=${limit}`;
      loadPage(initialUrl, 1, true);
    }
  };

  // Modal open - load contacts if not loaded
  const openContactsModal = () => {
    setContactsModal(true);
    if (!contactsLoaded && !loadingContacts) handleLoadContacts();
  };

  // Filter contacts
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

  // Select all/none (for current page)
  const toggleSelectAll = () => {
    const filtered = filteredContacts();
    const idsOnPage = filtered.map(c => c.id);
    const newSet = new Set(selectedContacts);
    const allSelected = idsOnPage.every(id => newSet.has(id));
    if (!allSelected) {
      idsOnPage.forEach(id => newSet.add(id));
    } else {
      idsOnPage.forEach(id => newSet.delete(id));
    }
    setSelectedContacts(newSet);
  };

  const toggleSelectContact = (id) => {
    const newSet = new Set(selectedContacts);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedContacts(newSet);
  };

  // Select latest imported contacts
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
    } catch (err) {
      alert("Failed to select latest imported contacts.");
    } finally {
      setLatestImportLoading(false);
    }
  };

  // Pagination in modal
  const handleNextPage = () => {
    if (nextPageUrl) {
      loadPage(nextPageUrl, currentPage + 1);
    }
  };
  const handlePreviousPage = () => {
    if (currentPage > 1 && prevPages[currentPage - 2]) {
      const prevUrl = prevPages[currentPage - 2];
      loadPage(prevUrl, currentPage - 1);
      setPrevPages((prev) => prev.slice(0, currentPage - 2));
    }
  };

  // AI
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

  // Test
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

  // Launch
  const handleLaunchCampaign = async () => {
    if (selectedContacts.size === 0) {
      alert('Please select at least one contact.');
      return;
    }
    setCampaignLoading(true);
    setRateLimitError(null);
    try {
      const confirmed = window.confirm(
        `About to tag ${selectedContacts.size} contacts with "booster shot".\n\nThis may take several minutes for large batches. Continue?`
      );
      if (!confirmed) return;

      const response = await fetch('/api/add-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contactIds: Array.from(selectedContacts),
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

      const successCount = result.results.filter(r => r.success).length;
      const failedCount = result.results.length - successCount;

      if (failedCount > 0) {
        alert(`✅ ${successCount} contacts tagged successfully\n❌ ${failedCount} contacts failed`);
      } else {
        alert(`🎉 Successfully tagged all ${successCount} contacts!`);
      }
      if (result.customValueResult && !result.customValueResult.success) {
        alert(`Warning: Custom Value update failed: ${result.customValueResult.error}`);
      }
      if (result.boosterCampaignNameCustomValueResult && !result.boosterCampaignNameCustomValueResult.success) {
        alert(`Warning: Booster Campaign Name update failed: ${result.boosterCampaignNameCustomValueResult.error}`);
      }

      setContactsModal(false);
      setContactsLoaded(false);
      setSelectedContacts(new Set());

    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setCampaignLoading(false);
    }
  };

  // Character count
  const getCharCount = () => smsMessage.length;
  const getSMSCount = () => Math.ceil(smsMessage.length / 160);

  // Modal - Contact selection UI
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
      <div style={{display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 12}}>
        <button style={{
          background: COLOR_PRIMARY, color: COLOR_WHITE, border: "none",
          borderRadius: 6, padding: "7px 19px", fontWeight: 700, cursor: "pointer", fontFamily: FONT_FAMILY,
          minWidth: 110
        }} onClick={toggleSelectAll}>
          {filteredContacts().length > 0 && filteredContacts().every(c => selectedContacts.has(c.id))
            ? 'Unselect All' : 'Select All'}
        </button>
        <button
          onClick={handleSelectLatestImportedContacts}
          disabled={latestImportLoading}
          style={{
            marginTop: 0,
            background: "#e4f2dd",
            color: "#22723e",
            border: "none",
            borderRadius: 7,
            padding: "8px 0",
            fontWeight: 800,
            fontSize: 14,
            width: 200,
            cursor: latestImportLoading ? "not-allowed" : "pointer",
            boxShadow: latestImportLoading ? "none" : "0 1px 4px 0 rgba(60,140,80,0.06)",
            transition: "background 0.13s"
          }}
        >
          {latestImportLoading ? "Selecting..." : "Select Latest Import"}
        </button>
      </div>
      <div style={{
        maxHeight: 350, overflowY: "auto", border: `1.3px solid ${COLOR_GRAY}`,
        borderRadius: 8, padding: 6, background: "#f6f6fa", marginBottom: 10
      }}>
        {loadingContacts && <div style={{padding: 18, textAlign: "center"}}>Loading contacts...</div>}
        {!loadingContacts && filteredContacts().length === 0 &&
          <div style={{padding: 18, textAlign: "center", color: "#999"}}>No contacts found.</div>}
        {filteredContacts().map((contact) => (
          <div key={contact.id} style={{
            display: 'flex', alignItems: 'center', padding: "8px 2px", borderBottom: `1px solid ${COLOR_GRAY}`,
            background: selectedContacts.has(contact.id) ? COLOR_CORAL_LIGHT : "inherit",
            fontFamily: FONT_FAMILY
          }}>
            <input
              type="checkbox"
              checked={selectedContacts.has(contact.id)}
              onChange={() => toggleSelectContact(contact.id)}
              style={{
                accentColor: COLOR_CORAL, marginRight: 12, width: 20, height: 20, cursor: "pointer"
              }}
            />
            <div>
              <div style={{fontWeight: 700, fontSize: 15, fontFamily: FONT_FAMILY}}>
                {contact.firstName || ''} {contact.lastName || ''}
              </div>
              <div style={{color: '#8b8b99', fontSize: 13, fontFamily: FONT_FAMILY}}>{contact.email || ''}</div>
              <div style={{color: '#8b8b99', fontSize: 13, fontFamily: FONT_FAMILY}}>{contact.phone || ''}</div>
              <div style={{ fontSize: 12, color: COLOR_CORAL, marginTop: 2 }}>
                {Array.isArray(contact.tags) && contact.tags.length > 0
                  ? contact.tags.map(tag => (
                    <span key={tag} style={{
                      display: 'inline-block', fontSize: 13, color: COLOR_CORAL,
                      background: COLOR_CORAL_LIGHTER, borderRadius: 4, padding: '2px 8px', marginRight: 6,
                      fontFamily: FONT_FAMILY
                    }}>{tag}</span>
                  ))
                  : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8}}>
        <span style={{fontWeight: 600, color: COLOR_PRIMARY, fontSize: 15, fontFamily: FONT_FAMILY}}>Selected: {selectedContacts.size}</span>
      </div>
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
          onClick={() => setContactsModal(false)}
          style={{
            padding: "10px 30px", borderRadius: 8, fontWeight: 700,
            background: "#eee", border: "none", color: COLOR_DARK, cursor: "pointer", fontFamily: FONT_FAMILY
          }}
        >Cancel</button>
        <button
          onClick={handleLaunchCampaign}
          disabled={campaignLoading || selectedContacts.size === 0 || !!rateLimitError}
          style={{
            padding: "10px 30px", borderRadius: 8, fontWeight: 700,
            background: campaignLoading || selectedContacts.size === 0 || !!rateLimitError ? "#ecb6b2" : COLOR_CORAL,
            color: COLOR_WHITE, border: "none", cursor: campaignLoading || selectedContacts.size === 0 || !!rateLimitError ? "not-allowed" : "pointer",
            fontFamily: FONT_FAMILY
          }}
        >
          {campaignLoading ? 'Launching...' : `🎯 Launch Campaign (${selectedContacts.size})`}
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
                {selectedContacts.size === 0
                  ? "Select Contacts..."
                  : `Selected: ${selectedContacts.size} contact${selectedContacts.size > 1 ? "s" : ""}`}
              </button>
            </div>
            <Modal open={contactsModal} onClose={() => setContactsModal(false)}>
              {contactModalUI}
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