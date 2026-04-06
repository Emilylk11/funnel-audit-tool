export const CHECKLIST = [
  {
    id: 'pre-build', category: 'Pre-build', icon: '🏗️',
    items: [
      { id: 'pb1', task: 'Page type correct (Checkout / Upsell / Cross-sell / Thank You)', critical: false },
      { id: 'pb2', task: 'Correct funnel + campaign (not built in wrong place)', critical: true },
      { id: 'pb3', task: 'Built on duplicate/clone (not live page)', critical: true },
      { id: 'pb4', task: 'Version renamed properly', critical: false },
      { id: 'pb5', task: 'Baseline screenshots captured (desktop + mobile)', critical: false },
      { id: 'pb6', task: 'All assets on hand (images, icons, copy, pricing)', critical: false },
      { id: 'pb7', task: 'Tracking confirmed (Pixels, GTM/GA4, Facebook)', critical: false },
      { id: 'pb8', task: 'Custom JS for sizes/flavors implemented (if applicable)', critical: false },
      { id: 'pb9', task: 'URL slug follows naming convention', critical: true },
    ],
  },
  {
    id: 'copy', category: 'Copy & verbiage', icon: '✍️',
    items: [
      { id: 'cv1', task: 'Copy tailored to product (not generic template)', critical: true },
      { id: 'cv2', task: 'Copy direction matches PM/strategic brief', critical: true },
      { id: 'cv3', task: 'Headlines, subheads, body consistent in tone', critical: false },
      { id: 'cv4', task: 'CTA button text correct and action-oriented', critical: true },
      { id: 'cv5', task: 'No placeholder or lorem ipsum remaining', critical: true },
      { id: 'cv6', task: 'Disclaimer text matches offer amount and product', critical: true },
      { id: 'cv7', task: 'Copyright year is current', critical: false },
    ],
  },
  {
    id: 'responsive', category: 'Responsiveness', icon: '📱',
    items: [
      { id: 'r1', task: 'Desktop AND mobile previewed after changes', critical: true },
      { id: 'r2', task: 'Countdown timer correct on mobile', critical: false },
      { id: 'r3', task: 'No giant gaps between sections on mobile', critical: false },
      { id: 'r4', task: 'Images not stretched/cropped on mobile', critical: false },
      { id: 'r5', task: 'CTA button widths appropriate on mobile', critical: true },
      { id: 'r6', task: 'Hidden elements only hidden on correct breakpoint', critical: false },
    ],
  },
  {
    id: 'pricing', category: 'Cart / pricing / logic', icon: '💰',
    items: [
      { id: 'cp1', task: 'Correct base product selected', critical: true },
      { id: 'cp2', task: 'Upsell/cross-sell product mapping correct', critical: true },
      { id: 'cp3', task: 'Pricing display matches spec (strikethroughs, OTP vs Sub)', critical: true },
      { id: 'cp4', task: 'Discount % displayed = actual calculated discount', critical: true },
      { id: 'cp5', task: 'Quantity/variant logic works', critical: true },
      { id: 'cp6', task: 'Add to Cart tested end-to-end', critical: true },
      { id: 'cp7', task: 'Bundle pricing verified against flat-rate spec', critical: true },
    ],
  },
  {
    id: 'visual', category: 'Visual consistency', icon: '🎨',
    items: [
      { id: 'vc1', task: 'Color scheme matches across ALL funnel pages', critical: true },
      { id: 'vc2', task: 'Product images consistent (style/angle)', critical: false },
      { id: 'vc3', task: 'Font sizes and weights consistent page-to-page', critical: false },
      { id: 'vc4', task: 'Badge/trust seal styling matches', critical: false },
      { id: 'vc5', task: 'Header/footer elements consistent', critical: false },
      { id: 'vc6', task: 'Logo tagline consistent across pages', critical: false },
    ],
  },
  {
    id: 'performance', category: 'Performance & compat', icon: '⚡',
    items: [
      { id: 'pc1', task: 'Hard refresh done (bypass cache)', critical: false },
      { id: 'pc2', task: 'Page load reasonable (no huge images)', critical: false },
      { id: 'pc3', task: 'Checked in 2+ browsers', critical: false },
      { id: 'pc4', task: 'All buttons route to correct next page', critical: true },
    ],
  },
  {
    id: 'prelaunch', category: 'Pre-launch', icon: '🚀',
    items: [
      { id: 'pl1', task: 'All links verified (checkout + upsells + support)', critical: true },
      { id: 'pl2', task: 'No duplicate slugs (checked CC slug list)', critical: true },
      { id: 'pl3', task: 'VWO tracking URLs + campaign name correct', critical: true },
      { id: 'pl4', task: 'Webhook endpoints verified (no 404s)', critical: true },
      { id: 'pl5', task: 'VWO URL pattern matches this funnel (not another)', critical: true },
    ],
  },
  {
    id: 'postlaunch', category: 'Post-launch QA', icon: '✅',
    items: [
      { id: 'pq1', task: 'Live page check: desktop + mobile', critical: true },
      { id: 'pq2', task: 'Full flow tested (product → checkout → upsell → TY)', critical: true },
      { id: 'pq3', task: 'No missing sections or broken CSS', critical: false },
      { id: 'pq4', task: 'Key buttons still work after going live', critical: true },
    ],
  },
];

export const STATUS_CYCLE = ['unchecked', 'pass', 'fail', 'na'];

export const STATUS_CONFIG = {
  unchecked: { label: '—', color: '#8b8680', bg: 'transparent', border: '#d4cfc8' },
  pass: { label: '✓', color: '#2d8a4e', bg: '#e8f5ed', border: '#2d8a4e' },
  fail: { label: '✗', color: '#c73e1d', bg: '#fce8e4', border: '#c73e1d' },
  na: { label: 'N/A', color: '#8b8680', bg: '#f0ece6', border: '#a8a29e' },
};
