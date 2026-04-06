export function analyzePageHTML(html, specs = {}) {
  const findings = [];
  const extracted = { prices: [], disclaimers: [], ctas: [], links: [], copyright: null, logoTagline: null };

  // Extract prices (patterns like $XX.XX)
  const priceRegex = /\$(\d+(?:\.\d{2})?)/g;
  let m;
  while ((m = priceRegex.exec(html)) !== null) {
    extracted.prices.push(parseFloat(m[1]));
  }

  // Extract discount percentages
  const discountRegex = /(\d+)%\s*(?:off|OFF|Off|discount|save|SAVE)/gi;
  const discounts = [];
  while ((m = discountRegex.exec(html)) !== null) {
    discounts.push(parseInt(m[1]));
  }

  // Check for placeholder text
  const placeholders = ['lorem ipsum', 'placeholder', 'TODO', 'FIXME', 'XXX', '[insert', '{insert', 'your text here'];
  placeholders.forEach(p => {
    if (html.toLowerCase().includes(p.toLowerCase())) {
      findings.push({ type: 'critical', category: 'Copy', message: `Placeholder text found: "${p}"` });
    }
  });

  // Check copyright year
  const copyrightMatch = html.match(/©\s*(?:Copyright\s*)?(\d{4})/i);
  if (copyrightMatch) {
    extracted.copyright = copyrightMatch[1];
    const currentYear = new Date().getFullYear().toString();
    if (copyrightMatch[1] !== currentYear) {
      findings.push({ type: 'warning', category: 'Copy', message: `Copyright year is ${copyrightMatch[1]}, should be ${currentYear}` });
    }
  }

  // Check for "Upgrade My Order" / CTA text
  const ctaRegex = /(?:Yes,?\s*)?(?:Upgrade|Add|Get|Claim|Buy)[^"<]{0,60}/gi;
  while ((m = ctaRegex.exec(html)) !== null) {
    extracted.ctas.push(m[0].trim());
  }

  // Check for disclaimer text with pricing
  const disclaimerRegex = /By clicking[^.]{20,300}\./gi;
  while ((m = disclaimerRegex.exec(html)) !== null) {
    extracted.disclaimers.push(m[0]);
  }

  // Verify pricing math if specs provided
  if (specs.basePrice && specs.discountPercent) {
    const expected = (specs.basePrice * (1 - specs.discountPercent / 100)).toFixed(2);
    const expectedNum = parseFloat(expected);
    const found = extracted.prices.find(p => Math.abs(p - expectedNum) < 0.02);
    if (!found && extracted.prices.length > 0) {
      findings.push({
        type: 'critical', category: 'Pricing',
        message: `Expected price $${expected} (${specs.discountPercent}% off $${specs.basePrice}) not found on page. Found prices: ${extracted.prices.map(p => '$' + p.toFixed(2)).join(', ')}`
      });
    }
  }

  // Check for broken image references
  const brokenImgRegex = /src=["'](?:about:blank|data:,|undefined|null|#)["']/gi;
  if (brokenImgRegex.test(html)) {
    findings.push({ type: 'warning', category: 'Visual', message: 'Potentially broken image source found' });
  }

  // Check for support email
  if (!html.toLowerCase().includes('support@organixx.com') && !html.toLowerCase().includes('support')) {
    findings.push({ type: 'warning', category: 'Links', message: 'No support contact info found on page' });
  }

  // Detect serving size JS config
  const servingMapMatch = html.match(/SERVING_BY_ID\s*=\s*\{([^}]+)\}/);
  if (servingMapMatch) {
    extracted.servingConfig = servingMapMatch[1].trim();
  }

  // Detect upsell ID config
  const upsellMatch = html.match(/upsellId:\s*["'](\d+)["']/g);
  if (upsellMatch) {
    extracted.upsellIds = upsellMatch.map(m => m.match(/["'](\d+)["']/)[1]);
  }

  return { findings, extracted };
}

export function validateSlugs(slugText) {
  const lines = slugText.split('\n').map(s => s.trim()).filter(Boolean);
  const seen = {};
  const results = [];

  lines.forEach(slug => {
    const issues = [];
    const isDupe = !!seen[slug];
    seen[slug] = true;

    if (isDupe) issues.push('DUPLICATE');
    if (slug.includes(' ')) issues.push('Has spaces');
    if (slug !== slug.toLowerCase()) issues.push('Mixed case');
    if (slug.length > 80) issues.push('Too long (>80 chars)');
    if (!/^[a-z0-9-]+$/.test(slug)) issues.push('Invalid characters');

    // Check naming convention pattern
    const conventionMatch = slug.match(/^checkout-[a-z]+-\d+-pm/);
    if (!conventionMatch && slug.startsWith('checkout-')) {
      issues.push('May not follow naming convention');
    }

    results.push({ slug, issues });
  });

  return {
    results,
    total: lines.length,
    duplicates: results.filter(r => r.issues.includes('DUPLICATE')).length,
    errors: results.filter(r => r.issues.length > 0).length,
  };
}

export function verifyPricing(rows) {
  return rows.map(row => {
    const base = parseFloat(row.basePrice) || 0;
    const disc = parseFloat(row.discount) || 0;
    const actual = parseFloat(row.actualPrice) || 0;
    const expected = base > 0 ? parseFloat((base * (1 - disc / 100)).toFixed(2)) : null;
    const match = expected && actual > 0 ? Math.abs(expected - actual) < 0.02 : null;

    return { ...row, expected, match };
  });
}

export function generateAsanaReport(funnelName, statuses, notes, pricingResults, slugResults, pageFindings) {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const { CHECKLIST } = require('./checklist-data');
  const all = CHECKLIST.flatMap(c => c.items);
  const pc = all.filter(i => statuses[i.id] === 'pass').length;
  const fc = all.filter(i => statuses[i.id] === 'fail').length;
  const nc = all.filter(i => statuses[i.id] === 'na').length;
  const rem = all.length - pc - fc - nc;

  let r = `## Funnel Audit Report\n`;
  r += `**Funnel:** ${funnelName || 'Unnamed'}\n`;
  r += `**Date:** ${date}\n`;
  r += `**Result:** ${fc === 0 && rem === 0 ? '✅ PASS' : fc > 0 ? '❌ ISSUES FOUND' : '⏳ INCOMPLETE'}\n`;
  r += `**Summary:** ${pc} passed · ${fc} failed · ${nc} N/A · ${rem} unchecked\n\n`;

  // Failed items
  if (fc > 0) {
    r += `### ❌ Failed items\n`;
    CHECKLIST.forEach(cat => {
      const fails = cat.items.filter(i => statuses[i.id] === 'fail');
      if (fails.length) {
        r += `\n**${cat.icon} ${cat.category}**\n`;
        fails.forEach(i => {
          r += `- ${i.task}${notes[i.id] ? ` — _${notes[i.id]}_` : ''}\n`;
        });
      }
    });
  }

  // Pricing mismatches
  if (pricingResults?.some(p => p.match === false)) {
    r += `\n### 💲 Pricing mismatches\n`;
    pricingResults.filter(p => p.match === false).forEach(p => {
      r += `- **${p.label}:** Expected $${p.expected?.toFixed(2)} (${p.discount}% off $${p.basePrice}), actual shows $${p.actualPrice}\n`;
    });
  }

  // Slug issues
  if (slugResults?.duplicates > 0) {
    r += `\n### 🔗 Slug issues\n`;
    r += `- ${slugResults.duplicates} duplicate slugs found\n`;
    slugResults.results.filter(s => s.issues.includes('DUPLICATE')).forEach(s => {
      r += `  - \`${s.slug}\`\n`;
    });
  }

  // Page analysis findings
  if (pageFindings?.length > 0) {
    r += `\n### 🔍 Page analysis findings\n`;
    pageFindings.forEach(f => {
      r += `- ${f.type === 'critical' ? '❌' : '⚠️'} **${f.category}:** ${f.message}\n`;
    });
  }

  // Unchecked items
  if (rem > 0) {
    r += `\n### ⏳ Unchecked\n`;
    CHECKLIST.forEach(cat => {
      const uc = cat.items.filter(i => !statuses[i.id] || statuses[i.id] === 'unchecked');
      if (uc.length) {
        r += `**${cat.category}:** ${uc.map(i => i.task).join('; ')}\n`;
      }
    });
  }

  return r;
}
