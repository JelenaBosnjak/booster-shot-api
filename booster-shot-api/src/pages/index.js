import { useEffect, useState } from 'react';

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
  const [tags, setTags] = useState([]); // All tags for the location
  const [selectedTag, setSelectedTag] = useState(''); // Tag selected for filter

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLocationId(params.get('location_id'));
  }, []);

  // Fetch all tags for this location (subaccount) on initial load
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

  // Load Google Sheet offers from your Apps Script Web App (JSON)
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

  // When Booster Shot category changes, update campaign names
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

  // When campaign changes, update SMS message
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

  // Only keep one Launch Campaign button (in the form at the top)
  // and make it launch the campaign for selected contacts
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

      // Detailed success/failure report
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

      // Refresh contacts to see changes
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

  // Helper: filter contacts by search term and selected tag
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

  // Helper to show time until rate limit resets
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🚀 Booster Shot Campaign Launcher</h1>

      {locationId ? (
        <>
          <p><strong>Subaccount ID:</strong> {locationId}</p>

          {/* ----- FORM SECTION WITH THE ONLY LAUNCH CAMPAIGN BUTTON ----- */}
          <div
            style={{
              background: '#f8f9fa',
              border: '1px solid #ddd',
              padding: '20px',
              borderRadius: '6px',
              marginBottom: '20px',
              maxWidth: 600
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <label>
                <strong>Booster Shot message Selection</strong>&nbsp;
                <select
                  value={boosterShotMessage}
                  onChange={e => setBoosterShotMessage(e.target.value)}
                  style={{ width: '60%', padding: '6px' }}
                >
                  <option value="">-- Select Booster Shot --</option>
                  {offerCategories.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>
                <strong>Select Campaign</strong>&nbsp;
                <select
                  value={campaign}
                  onChange={e => setCampaign(e.target.value)}
                  style={{ width: '60%', padding: '6px' }}
                  disabled={!boosterShotMessage}
                >
                  <option value="">-- Select Campaign --</option>
                  {campaignNames.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>
                <strong>Your SMS message goes here</strong>
                <textarea
                  placeholder="Type your SMS/Text here..."
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  style={{ width: '100%', height: '80px', marginTop: '6px', padding: '8px' }}
                />
              </label>
            </div>

            <button
              onClick={handleLaunchCampaign}
              disabled={campaignLoading || selectedContacts.size === 0 || !!rateLimitError}
              style={{
                marginTop: '10px',
                padding: '10px 24px',
                fontSize: '16px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedContacts.size > 0 && !rateLimitError ? 'pointer' : 'not-allowed',
                width: '100%'
              }}
            >
              {campaignLoading ? 'Launching...' : '🎯 Launch Campaign'}
            </button>
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <em>Select contacts below before clicking Launch Campaign</em>
            </div>
          </div>
          {/* ----- END OF FORM SECTION ----- */}

          <button
            onClick={handleLoadContacts}
            disabled={loading}
            style={{
              marginBottom: '20px',
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#0070f3',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Select Campaign Contacts'}
          </button>

          {rateLimitError && (
            <div style={{
              background: '#ffe0e0',
              color: '#c00',
              border: '1px solid #c00',
              padding: '12px',
              marginBottom: '16px',
              borderRadius: '4px'
            }}>
              <strong>🚦 Rate Limit Hit:</strong>
              <div>{rateLimitError.message}</div>
              {getResetTimeString() && (
                <div>Try again in {getResetTimeString()}.</div>
              )}
            </div>
          )}

          {contactsLoaded && (
            <>
              <div style={{
                background: '#f0f0f0',
                padding: '10px',
                marginBottom: '20px',
                borderRadius: '4px'
              }}>
                <h4>Debug Info:</h4>
                <pre>{JSON.stringify({
                  currentPage,
                  totalCount,
                  hasNextPage: !!nextPageUrl,
                  nextPageUrlSnippet: nextPageUrl?.split('startAfter=')[1]?.substring(0, 20),
                  loading
                }, null, 2)}</pre>
              </div>

              <h3>Campaign Contacts</h3>

              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '5px',
                maxWidth: 450
              }}>
                {/* Tag Filter */}
                <select
                  value={selectedTag}
                  onChange={e => setSelectedTag(e.target.value)}
                  style={{
                    minWidth: 110,
                    padding: '7px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                >
                  <option value="">All Tags</option>
                  {tags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>

                {/* Search Box */}
                <input
                  type="text"
                  placeholder="Search contacts by name, email, or phone..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
              </div>

              {/* Select All / Unselect All and Selected counter */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '5px'
              }}>
                <button onClick={toggleSelectAll}>
                  {selectedContacts.size < filteredContacts().length ? 'Select All' : 'Unselect All'}
                </button>
                <div>Selected: {selectedContacts.size}</div>
              </div>

              {filteredContacts().map((contact) => (
                <div key={contact.id} style={{ borderBottom: '1px solid #ddd', padding: '5px 0', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={() => toggleSelectContact(contact.id)}
                    style={{ marginRight: '10px' }}
                  />
                  <div>
                    <div><strong>{contact.firstName || ''} {contact.lastName || ''}</strong></div>
                    <div>{contact.email || ''}</div>
                    <div>{contact.phone || ''}</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                      {Array.isArray(contact.tags) && contact.tags.length > 0
                        ? contact.tags.join(', ')
                        : ''}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={handlePreviousPage} disabled={currentPage === 1 || loading}>
                  Previous
                </button>
                <div>Page {currentPage} of {Math.ceil(totalCount / limit)}</div>
                <button
                  onClick={handleNextPage}
                  disabled={!nextPageUrl || loading}
                  style={{
                    backgroundColor: nextPageUrl ? '#0070f3' : '#ccc',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    cursor: nextPageUrl ? 'pointer' : 'default'
                  }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <p>Please provide a location_id URL parameter.</p>
      )}
    </div>
  );
}