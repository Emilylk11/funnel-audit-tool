export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const loginId = process.env.CC_LOGIN_ID;
  const password = process.env.CC_PASSWORD;

  if (!loginId || !password) {
    return res.status(500).json({ error: 'CC API credentials not configured. Set CC_LOGIN_ID and CC_PASSWORD in Vercel environment variables.' });
  }

  const { action, campaignId, productId, funnelId } = req.query;

  // Default date range: last 2 years to now (CC requires startDate/endDate)
  const now = new Date();
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const endDate = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
  const startDate = `${twoYearsAgo.getMonth()+1}/${twoYearsAgo.getDate()}/${twoYearsAgo.getFullYear()}`;

  function baseParams(extras = {}) {
    return new URLSearchParams({ loginId, password, startDate, endDate, ...extras });
  }

  try {
    let data = {};

    if (action === 'funnels') {
      const params = baseParams();
      if (funnelId) params.append('funnelId', funnelId);
      const resp = await fetch(`https://api.checkoutchamp.com/funnels/query/?${params}`);
      const json = await resp.json();
      data = { type: 'funnels', ...json };
    }

    else if (action === 'products') {
      const params = baseParams();
      if (campaignId) params.append('campaignId', campaignId);
      if (productId) params.append('productId', productId);
      const resp = await fetch(`https://api.checkoutchamp.com/products/query/?${params}`);
      const json = await resp.json();
      data = { type: 'products', ...json };
    }

    else if (action === 'campaigns') {
      const params = baseParams();
      if (campaignId) params.append('campaignId', campaignId);
      const resp = await fetch(`https://api.checkoutchamp.com/campaigns/query/?${params}`);
      const json = await resp.json();
      data = { type: 'campaigns', ...json };
    }

    else if (action === 'full-audit') {
      const results = {};

      // 1. Query funnels
      const funnelsResp = await fetch(`https://api.checkoutchamp.com/funnels/query/?${baseParams()}`);
      results.funnels = await funnelsResp.json();

      // 2. Query campaigns
      const campaignParams = baseParams();
      if (campaignId) campaignParams.append('campaignId', campaignId);
      const campaignsResp = await fetch(`https://api.checkoutchamp.com/campaigns/query/?${campaignParams}`);
      results.campaigns = await campaignsResp.json();

      // 3. Query products
      const productParams = baseParams();
      if (campaignId) productParams.append('campaignId', campaignId);
      const productsResp = await fetch(`https://api.checkoutchamp.com/products/query/?${productParams}`);
      results.products = await productsResp.json();

      data = { type: 'full-audit', ...results };
    }

    else {
      return res.status(400).json({ error: 'Invalid action. Use: funnels, products, campaigns, or full-audit' });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'API call failed', message: err.message });
  }
}
