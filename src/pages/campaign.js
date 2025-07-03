import { useEffect, useState } from 'react';

// ForeverBooked brand colors:
const COLOR_DARK = "#23243a";
const COLOR_CORAL = "#ff8e87";
const COLOR_LIGHT_BG = "#fafbfc";
const COLOR_GRAY = "#e5e7eb";
const COLOR_WHITE = "#fff";
const COLOR_SUCCESS = "#28a745";
const COLOR_PRIMARY = COLOR_DARK;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzkVfD4fEUHuGryVKiRR_SKtWeyMFCkxTyGeAKPlaY0yR5XJq_0xuYYEbA6v3odZeMKHA/exec";

export default function ContactList() {
  const [locationId, setLocationId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [prevPages, setPrevPages] = useState([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(null);

  // --- Booster shot/campaign/message selection from Google Sheet ---
  const [boosterShotMessage, setBoosterShotMessage] = useState('');
  const [campaign, setCampaign] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [offers, setOffers] = useState([]);
  const [offerCategories, setOfferCategories] = useState([]);
  const [campaignNames, setCampaignNames] = useState([]);

  // --- Search and Tag Filter ---
  const [searchTerm, setSearchTerm] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');

  // --- AI Optimization/Test Message additions ---
  const [optimizing, setOptimizing] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // --- NEW: store the last optimized message for possible use elsewhere ---
  const [optimizedMessage, setOptimizedMessage] = useState('');

  // ---- Updated: Robust HighLevel subaccount (locationId) via URL param/hash ----
  useEffect(() => {
    function getLocationId() {
      // 1. Try query param
      const params = new URLSearchParams(window.location.search);
      if (params.get("locationId")) return params.get("locationId");
      // 2. Try hash param
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        if (hashParams.get("locationId")) return hashParams.get("locationId");
      }
      // 3. Try parent frame's URL (for iframe embed)
      try {
        if (window.parent && window.parent !== window) {
          const parentPath = window.parent.location.pathname;
          const match = parentPath.match(/\/location\/([a-zA-Z0-9]+)/);
          if (match && match[1]) return match[1];
        }
      } catch (e) {}
      // 4. Try path as fallback
      const pathMatch = window.location.pathname.match(/\/location\/([a-zA-Z0-9]+)/);
      if (pathMatch && pathMatch[1]) return pathMatch[1];
      // 5. Try class method fallback (legacy)
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
    setLocationId(getLocationId());
  }, []);

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
    setLoading(true);
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
      setLoading(false);
    }
  };

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

  const handleLoadContacts = () => {
    if (locationId) {
      const initialUrl = `/api/get-contacts?locationId=${locationId}&limit=${limit}`;
      loadPage(initialUrl, 1, true);
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

      if (locationId) {
        const currentUrl = prevPages[currentPage - 1] ||
          `/api/get-contacts?locationId=${locationId}&limit=${limit}`;
        loadPage(currentUrl, currentPage);
      }

    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    } finally {
      setCampaignLoading(false);
    }
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

  const getResetTimeString = () => {
    if (rateLimitError?.resetTime) {
      const seconds = Number(rateLimitError.resetTime);
      if (!isNaN(seconds)) {
        const now = Date.now();
        const resetDate = new Date(now + seconds * 1000);
        const mins = Math.floor(seconds / 60);
        return `${mins} minute(s), at ${resetDate.toLocaleTimeString()}`;
      }
    }
    return null;
  };

  const styles = {
    main: {
      padding: '40px 0',
      fontFamily: 'Inter, Arial, sans-serif',
      background: COLOR_LIGHT_BG,
      minHeight: '100vh',
      color: COLOR_DARK,
      transition: 'background 0.2s'
    },
    card: {
      background: COLOR_WHITE,
      borderRadius: '18px',
      boxShadow: '0 4px 16px rgba(35,36,58,0.07)',
      padding: '36px 38px',
      maxWidth: 700,
      margin: '0 auto 40px auto',
      border: `1.5px solid ${COLOR_GRAY}`,
    },
    logo: {
      width: 180,
      display: 'block',
      margin: '0 auto 18px auto',
      objectFit: 'contain',
      background: "transparent",
      borderRadius: 8,
      boxShadow: "none",
    },
    title: {
      color: COLOR_PRIMARY,
      fontWeight: 900,
      fontSize: '2.3rem',
      marginBottom: '10px',
      letterSpacing: '-1.5px',
    },
    subtitle: {
      color: '#6d6d7b',
      fontSize: '1.09rem',
      marginBottom: '22px',
      fontWeight: 500,
    },
    label: {
      fontWeight: 600,
      color: COLOR_PRIMARY,
      marginBottom: '6px',
      display: 'block',
    },
    select: {
      width: '100%',
      padding: '11px',
      borderRadius: '8px',
      border: `1.8px solid ${COLOR_GRAY}`,
      fontSize: '1.04rem',
      marginBottom: '18px',
      background: COLOR_LIGHT_BG,
      color: COLOR_DARK,
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    textarea: {
      width: '100%',
      minHeight: '86px',
      borderRadius: '8px',
      padding: '10px',
      border: `1.7px solid ${COLOR_GRAY}`,
      fontSize: '1rem',
      background: COLOR_LIGHT_BG,
      color: COLOR_DARK,
      marginTop: '4px',
      marginBottom: '18px',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    buttonPrimary: {
      width: '100%',
      padding: '14px 0',
      background: COLOR_CORAL,
      color: COLOR_WHITE,
      fontWeight: 700,
      border: 'none',
      borderRadius: '8px',
      fontSize: '1.1rem',
      cursor: 'pointer',
      marginBottom: '14px',
      transition: 'background 0.18s, transform 0.15s',
      boxShadow: '0 2px 8px rgba(255,142,135,0.07)',
    },
    buttonPrimaryDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
    buttonSecondary: {
      background: COLOR_PRIMARY,
      color: COLOR_WHITE,
      borderRadius: '8px',
      padding: '10px 20px',
      fontWeight: 600,
      border: 'none',
      cursor: 'pointer',
      fontSize: '1.04rem',
      marginBottom: '16px',
      transition: 'background 0.18s',
    },
    input: {
      width: '100%',
      padding: '10px',
      borderRadius: '8px',
      border: `1.7px solid ${COLOR_GRAY}`,
      fontSize: '1rem',
      marginBottom: '12px',
      outline: 'none',
      background: COLOR_LIGHT_BG,
      color: COLOR_DARK,
      transition: 'border-color 0.2s',
    },
    contactCard: {
      borderRadius: '10px',
      background: COLOR_WHITE,
      boxShadow: '0 1px 5px rgba(35,36,58,0.04)',
      padding: '16px 20px',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      border: `1px solid ${COLOR_GRAY}`,
      transition: 'box-shadow 0.16s',
    },
    checkbox: {
      accentColor: COLOR_CORAL,
      marginRight: '18px',
      width: 22,
      height: 22,
      cursor: 'pointer',
    },
    tag: {
      display: 'inline-block',
      fontSize: '0.93rem',
      color: COLOR_CORAL,
      background: '#fff2f1',
      borderRadius: '4px',
      padding: '2px 8px',
      marginRight: '7px',
      marginTop: '4px',
    },
    debugSection: {
      background: '#f3f6fa',
      borderRadius: '8px',
      padding: '12px 15px',
      marginBottom: '18px',
      fontSize: '0.97rem',
      color: COLOR_DARK,
      border: `1px solid ${COLOR_GRAY}`,
    },
    tagFilterRow: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '14px',
      marginBottom: '12px',
      maxWidth: 530,
    },
    pagination: {
      marginTop: 18,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rateLimit: {
      background: '#fff2f2',
      color: '#d43636',
      border: `1.5px solid #d43636`,
      padding: '16px',
      borderRadius: '10px',
      marginBottom: '18px',
      fontWeight: 600,
    },
    countText: { color: COLOR_PRIMARY, fontWeight: 700 },
    launchInfo: { marginTop: 14, fontSize: 13, color: '#888' },
    campaignNameField: { fontSize: 12, color: COLOR_CORAL, marginTop: 2 }
  };

  return (
    <div style={styles.main}>
      <img
        src="/logo.png"
        alt="foreverbooked logo"
        style={styles.logo}
        onError={e => { e.target.src = "https://via.placeholder.com/180x80?text=Logo"; }}
      />

      <div style={styles.card}>
        <div style={styles.title}>Booster Shot Campaign Launcher</div>
        <div style={styles.subtitle}>Send optimized, branded SMS campaigns to your contacts in style.</div>

        {locationId ? (
          <>
            <div style={{marginBottom: 20}}>
              <span style={{fontWeight: 600, color: COLOR_PRIMARY}}>Subaccount ID:</span>
              &nbsp;{locationId}
            </div>

            <div>
              <label style={styles.label}>Booster Shot message Selection</label>
              <select
                value={boosterShotMessage}
                onChange={e => setBoosterShotMessage(e.target.value)}
                style={styles.select}
              >
                <option value="">-- Select Booster Shot --</option>
                {offerCategories.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>

              <label style={styles.label}>Select Campaign</label>
              <select
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
                style={styles.select}
                disabled={!boosterShotMessage}
              >
                <option value="">-- Select Campaign --</option>
                {campaignNames.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>

              <label style={styles.label}>Your SMS message goes here</label>
              <textarea
                placeholder="Type your SMS/Text here..."
                value={smsMessage}
                onChange={e => setSmsMessage(e.target.value)}
                style={styles.textarea}
              />

              <button
                onClick={handleOptimizeAI}
                disabled={optimizing || !smsMessage}
                style={{
                  ...styles.buttonPrimary,
                  ...(optimizing || !smsMessage ? styles.buttonPrimaryDisabled : {})
                }}
              >
                {optimizing ? 'Optimizing...' : '🤖 Optimize Using AI'}
              </button>

              <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                <input
                  type="text"
                  placeholder="Enter phone number"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  style={styles.input}
                />
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest || !smsMessage || !testPhone}
                  style={{
                    ...styles.buttonSecondary,
                    background: sendingTest ? '#bbb' : COLOR_PRIMARY,
                    opacity: sendingTest || !smsMessage || !testPhone ? 0.6 : 1
                  }}
                >
                  {sendingTest ? 'Sending...' : 'Send Test Message'}
                </button>
              </div>

              <button
                onClick={handleLaunchCampaign}
                disabled={campaignLoading || selectedContacts.size === 0 || !!rateLimitError}
                style={{
                  ...styles.buttonPrimary,
                  background: COLOR_SUCCESS,
                  ...(campaignLoading || selectedContacts.size === 0 || !!rateLimitError ? styles.buttonPrimaryDisabled : {})
                }}
              >
                {campaignLoading ? 'Launching...' : '🎯 Launch Campaign'}
              </button>
              <div style={styles.launchInfo}>
                <em>Select contacts below before clicking Launch Campaign</em>
              </div>
            </div>

            <button
              onClick={handleLoadContacts}
              disabled={loading}
              style={{
                ...styles.buttonSecondary,
                width: '100%',
                marginTop: 26,
                marginBottom: 10,
                background: loading ? '#bbb' : COLOR_PRIMARY,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Loading...' : 'Select Campaign Contacts'}
            </button>

            {rateLimitError && (
              <div style={styles.rateLimit}>
                <strong>🚦 Rate Limit Hit:</strong>
                <div>{rateLimitError.message}</div>
                {getResetTimeString() && (
                  <div>Try again in {getResetTimeString()}.</div>
                )}
              </div>
            )}

            {contactsLoaded && (
              <>
                <div style={styles.debugSection}>
                  <h4>Debug Info:</h4>
                  <pre>{JSON.stringify({
                    currentPage,
                    totalCount,
                    hasNextPage: !!nextPageUrl,
                    nextPageUrlSnippet: nextPageUrl?.split('startAfter=')[1]?.substring(0, 20),
                    loading
                  }, null, 2)}</pre>
                </div>

                <h3 style={{marginTop: 20, marginBottom: 10, color: COLOR_PRIMARY}}>Campaign Contacts</h3>

                <div style={styles.tagFilterRow}>
                  <select
                    value={selectedTag}
                    onChange={e => setSelectedTag(e.target.value)}
                    style={styles.select}
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
                    style={styles.input}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <button style={styles.buttonSecondary} onClick={toggleSelectAll}>
                    {selectedContacts.size < filteredContacts().length ? 'Select All' : 'Unselect All'}
                  </button>
                  <div style={styles.countText}>Selected: {selectedContacts.size}</div>
                </div>

                {filteredContacts().map((contact) => (
                  <div key={contact.id} style={styles.contactCard}>
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(contact.id)}
                      onChange={() => toggleSelectContact(contact.id)}
                      style={styles.checkbox}
                    />
                    <div>
                      <div style={{fontWeight: 700, fontSize: '1.09rem'}}>
                        {contact.firstName || ''} {contact.lastName || ''}
                      </div>
                      <div style={{color: '#8b8b99', fontSize: '0.98rem'}}>{contact.email || ''}</div>
                      <div style={{color: '#8b8b99', fontSize: '0.98rem'}}>{contact.phone || ''}</div>
                      <div style={{ fontSize: '12px', color: COLOR_CORAL, marginTop: '2px' }}>
                        {Array.isArray(contact.tags) && contact.tags.length > 0
                          ? contact.tags.map(tag => (
                            <span key={tag} style={styles.tag}>{tag}</span>
                          ))
                          : ''}
                      </div>
                    </div>
                  </div>
                ))}

                <div style={styles.pagination}>
                  <button
                    style={styles.buttonSecondary}
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </button>
                  <div style={{fontWeight: 600}}>
                    Page {currentPage} of {Math.ceil(totalCount / limit)}
                  </div>
                  <button
                    style={{
                      ...styles.buttonSecondary,
                      background: nextPageUrl ? COLOR_CORAL : '#bbb',
                      cursor: nextPageUrl ? 'pointer' : 'not-allowed'
                    }}
                    onClick={handleNextPage}
                    disabled={!nextPageUrl || loading}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <p>Could not detect subaccount ID from URL. Are you opening from the correct menu link?</p>
        )}
      </div>
    </div>
  );
}