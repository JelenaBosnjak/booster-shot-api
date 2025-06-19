/**
 * Fetches and parses your Google Sheet as an array of objects via Apps Script Web App.
 * @param {string} [webAppUrl] - Your Apps Script Web App deployment URL.
 * @returns {Promise<Array<Object>>}
 */
export async function fetchGoogleSheet(webAppUrl = "https://script.google.com/macros/s/AKfycbzkVfD4fEUHuGryVKiRR_SKtWeyMFCkxTyGeAKPlaY0yR5XJq_0xuYYEbA6v3odZeMKHA/exec") {
  const res = await fetch(webAppUrl);
  if (!res.ok) throw new Error("Failed to fetch sheet data");
  return await res.json();
}