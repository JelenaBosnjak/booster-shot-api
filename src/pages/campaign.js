import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// ForeverBooked brand colors:
const COLOR_DARK = "#23243a";
const COLOR_CORAL = "#ff8e87";
const COLOR_LIGHT_BG = "#fafbfc";
const COLOR_GRAY = "#e5e7eb";
const COLOR_WHITE = "#fff";
const COLOR_SUCCESS = "#28a745";
const COLOR_PRIMARY = COLOR_DARK;

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
          maxWidth: 620,
          width: "98vw",
          padding: 32,
          position: "relative"
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
    const id = getLocationId();
    if (id) {
      setLocationId(id);
      if (typeof window !== "undefined") {
        localStorage.setItem("locationId", id);
      }
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

        setSelectedContacts(new Set());
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

  // Select all/none
  const toggleSelectAll = () => {
    const filtered = filteredContacts();
    if (selectedContacts.size < filtered.length) {
      setSelectedContacts(new Set(filtered.map((c) => c.id)));
    } else {
      setSelectedContacts(new Set());
    }
  };

  const toggleSelectContact = (id) => {
    const newSet = new Set(selectedContacts);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedContacts(newSet);
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
      <h2 style={{marginTop: 0, marginBottom: 20, color: COLOR_PRIMARY, fontWeight: 800}}>Select Campaign Contacts</h2>
      <div style={{display: "flex", gap: 14, marginBottom: 16}}>
        <select
          value={selectedTag}
          onChange={e => setSelectedTag(e.target.value)}
          style={{
            width: 200,
            borderRadius: 8,
            border: `1.5px solid ${COLOR_GRAY}`,
            padding: 8,
            fontSize: 15
          }}
        >
          <option value="">All Tags</option>
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
            fontSize: 15
          }}
        />
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
            background: selectedContacts.has(contact.id) ? "#ffe9e7" : "inherit"
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
              <div style={{fontWeight: 700, fontSize: 15}}>
                {contact.firstName || ''} {contact.lastName || ''}
              </div>
              <div style={{color: '#8b8b99', fontSize: 13}}>{contact.email || ''}</div>
              <div style={{color: '#8b8b99', fontSize: 13}}>{contact.phone || ''}</div>
              <div style={{ fontSize: 12, color: COLOR_CORAL, marginTop: 2 }}>
                {Array.isArray(contact.tags) && contact.tags.length > 0
                  ? contact.tags.map(tag => (
                    <span key={tag} style={{
                      display: 'inline-block', fontSize: 13, color: COLOR_CORAL,
                      background: '#fff2f1', borderRadius: 4, padding: '2px 8px', marginRight: 6
                    }}>{tag}</span>
                  ))
                  : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8}}>
        <button style={{
          background: COLOR_PRIMARY, color: COLOR_WHITE, border: "none",
          borderRadius: 6, padding: "7px 19px", fontWeight: 700, cursor: "pointer"
        }} onClick={toggleSelectAll}>
          {selectedContacts.size < filteredContacts().length ? 'Select All' : 'Unselect All'}
        </button>
        <span style={{fontWeight: 600, color: COLOR_PRIMARY, fontSize: 15}}>Selected: {selectedContacts.size}</span>
      </div>
      <div style={{display: "flex", justifyContent: "flex-end", gap: 10}}>
        <button
          onClick={() => setContactsModal(false)}
          style={{
            padding: "10px 30px", borderRadius: 8, fontWeight: 700,
            background: "#eee", border: "none", color: COLOR_DARK, cursor: "pointer"
          }}
        >Cancel</button>
        <button
          onClick={handleLaunchCampaign}
          disabled={campaignLoading || selectedContacts.size === 0 || !!rateLimitError}
          style={{
            padding: "10px 30px", borderRadius: 8, fontWeight: 700,
            background: campaignLoading || selectedContacts.size === 0 || !!rateLimitError ? "#ecb6b2" : COLOR_CORAL,
            color: COLOR_WHITE, border: "none", cursor: campaignLoading || selectedContacts.size === 0 || !!rateLimitError ? "not-allowed" : "pointer"
          }}
        >
          {campaignLoading ? 'Launching...' : `🎯 Launch Campaign (${selectedContacts.size})`}
        </button>
      </div>
      {rateLimitError && (
        <div style={{
          background: '#fff2f2', color: '#d43636', border: `1.5px solid #d43636`,
          padding: '10px', borderRadius: '10px', marginTop: '14px', fontWeight: 600,
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
      fontFamily: "Inter, Arial, sans-serif"
    }}>
      <img
        src="/logo.png"
        alt="foreverbooked logo"
        style={{
          width: 180, display: 'block', margin: '0 auto 18px auto',
          objectFit: 'contain', background: "transparent", borderRadius: 8, boxShadow: "none"
        }}
        onError={e => { e.target.src = "https://via.placeholder.com/180x80?text=Logo"; }}
      />

      <div style={{
        background: COLOR_WHITE,
        borderRadius: 18,
        boxShadow: '0 4px 16px rgba(35,36,58,0.07)',
        padding: '36px 38px',
        maxWidth: 650,
        margin: '0 auto 40px auto',
        border: `1.5px solid ${COLOR_GRAY}`,
      }}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10}}>
          <div>
            <span style={{fontWeight: 900, fontSize: "2.1rem", color: COLOR_PRIMARY}}>SMS Campaign</span>
            <div style={{fontSize: 15, color: "#888", marginTop: 2}}>Professional Campaign Management</div>
          </div>
          <span style={{
            fontWeight: 700, color: COLOR_CORAL, background: "#fff2f1",
            borderRadius: 6, padding: "7px 15px", fontSize: 14
          }}>
            {locationId ? `Subaccount: ${locationId}` : ""}
          </span>
        </div>
        <hr style={{margin: "18px 0"}} />

        {locationId ? (
          <>
            {/* Campaign config */}
            <div style={{display: "flex", gap: 16, marginBottom: 18}}>
              <div style={{flex: 1}}>
                <label style={{
                  fontWeight: 600, color: COLOR_PRIMARY, marginBottom: 7, display: 'block', fontSize: 15
                }}>Campaign Category</label>
                <select
                  value={boosterShotMessage}
                  onChange={e => setBoosterShotMessage(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: `1.8px solid ${COLOR_GRAY}`,
                    padding: 10,
                    fontSize: 15
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
                  fontWeight: 600, color: COLOR_PRIMARY, marginBottom: 7, display: 'block', fontSize: 15
                }}>Campaign Template</label>
                <select
                  value={campaign}
                  onChange={e => setCampaign(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    border: `1.8px solid ${COLOR_GRAY}`,
                    padding: 10,
                    fontSize: 15
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
            <div style={{marginBottom: 18}}>
              <label style={{
                fontWeight: 600, color: COLOR_PRIMARY, marginBottom: 4, display: 'block', fontSize: 15
              }}>SMS Message</label>
              <textarea
                placeholder="Type your SMS/Text here..."
                value={smsMessage}
                onChange={e => setSmsMessage(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: '86px',
                  borderRadius: '8px',
                  padding: '10px',
                  border: `1.7px solid ${COLOR_GRAY}`,
                  fontSize: '1rem',
                  background: COLOR_LIGHT_BG,
                  color: COLOR_DARK,
                  marginTop: '4px',
                  marginBottom: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  resize: "vertical"
                }}
              />
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <span style={{fontSize: 13, color: "#888"}}>
                  {getCharCount()}/{getSMSCount() * 160} characters ({getSMSCount()} SMS{getSMSCount() > 1 ? "es" : ""})
                </span>
                <button
                  onClick={handleOptimizeAI}
                  disabled={optimizing || !smsMessage}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 7,
                    background: optimizing || !smsMessage ? "#f2b4b1" : COLOR_CORAL,
                    color: COLOR_WHITE,
                    fontWeight: 700,
                    border: 'none',
                    cursor: optimizing || !smsMessage ? "not-allowed" : "pointer"
                  }}
                >
                  {optimizing ? 'Optimizing...' : '🤖 Optimize with AI'}
                </button>
              </div>
            </div>

            {/* Test */}
            <div style={{display: "flex", alignItems: "center", gap: 13, marginBottom: 20}}>
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
                }}
              />
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !smsMessage || !testPhone}
                style={{
                  padding: "8px 22px",
                  borderRadius: 7,
                  background: sendingTest || !smsMessage || !testPhone ? "#bbb" : COLOR_PRIMARY,
                  color: COLOR_WHITE,
                  fontWeight: 700,
                  border: "none",
                  cursor: sendingTest || !smsMessage || !testPhone ? "not-allowed" : "pointer"
                }}
              >
                {sendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </div>

            {/* Contacts selection */}
            <div style={{marginBottom: 24}}>
              <label style={{
                fontWeight: 600, color: COLOR_PRIMARY, marginBottom: 4, display: 'block', fontSize: 15
              }}>Select Campaign Contacts</label>
              <button
                onClick={openContactsModal}
                style={{
                  padding: "11px 18px",
                  borderRadius: 8,
                  background: "#fff2f1",
                  color: COLOR_CORAL,
                  fontWeight: 700,
                  fontSize: 16,
                  border: `1.7px solid ${COLOR_CORAL}`,
                  cursor: "pointer"
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
          <p style={{color: "#b44", fontWeight: 600, fontSize: 17}}>
            Could not detect subaccount ID from URL. Are you opening from the correct menu link?
          </p>
        )}
      </div>
    </div>
  );
}