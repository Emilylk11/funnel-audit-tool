export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const loginId = process.env.CC_LOGIN_ID;
  const password = process.env.CC_PASSWORD;

  if (!loginId || !password) {
    return res.status(500).json({ error: 'CC API credentials not configured.' });
  }

  const { action, campaignId, productId, funnelId } = req.query;

  const now = new Date();
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const endDate = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
  const startDate = `${twoYearsAgo.getMonth()+1}/${twoYearsAgo.getDate()}/${twoYearsAgo.getFullYear()}`;

  function baseParams(extras = {}) {
    return new URLSearchParams({ loginId, password, startDate, endDate, ...extras });
  }

  async function safeFetch(url, label) {
    try {
      const resp = await fetch(url);
      const text = await resp.text();
      try {
        return JSON.parse(text);
      } catch {
        return { result: 'ERROR', message: `${label} returned non-JSON: ${text.substring(0, 200)}` };
      }
    } catch (err) {
      return { result: 'ERROR', message: `${label} fetch failed: ${err.message}` };
    }
  }

  try {
    let data = {};

    if (action === 'funnels') {
      const params = baseParams();
      if (funnelId) params.append('funnelId', funnelId);
      const json = await safeFetch(`https://api.checkoutchamp.com/funnels/query/?${params}`, 'Funnels');
      data = { type: 'funnels', ...json };
    }

    else if (action === 'products') {
      const params = baseParams();
      if (campaignId) params.append('campaignId', campaignId);
      if (productId) params.append('productId', productId);
      const json = await safeFetch(`https://api.checkoutchamp.com/products/query/?${params}`, 'Products');
      data = { type: 'products', ...json };
    }

    else if (action === 'campaigns') {
      const params = baseParams();
      if (campaignId) params.append('campaignId', campaignId);
      const json = await safeFetch(`https://api.checkoutchamp.com/campaigns/query/?${params}`, 'Campaigns');
      data = { type: 'campaigns', ...json };
    }

    else if (action === 'full-audit') {
      const funnels = await safeFetch(`https://api.checkoutchamp.com/funnels/query/?${baseParams()}`, 'Funnels');

      const campaignParams = baseParams();
      if (campaignId) campaignParams.append('campaignId', campaignId);
      const campaigns = await safeFetch(`https://api.checkoutchamp.com/campaigns/query/?${campaignParams}`, 'Campaigns');

      const productParams = baseParams();
      if (campaignId) productParams.append('campaignId', campaignId);
      const products = await safeFetch(`https://api.checkoutchamp.com/products/query/?${productParams}`, 'Products');

      data = { type: 'full-audit', funnels, campaigns, products };
    }

    else {
      return res.status(400).json({ error: 'Invalid action. Use: funnels, products, campaigns, or full-audit' });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'API call failed', message: err.message });
  }
}
