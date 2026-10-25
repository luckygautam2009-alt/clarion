// Emoji icon for each payment service, matched by the service name.
const ICONS = [
  ['mobile', '📱'], ['dth', '📡'], ['electricity', '💡'], ['fastag', '🚗'], ['lpg', '🔥'], ['broadband', '🌐'],
  ['send money', '💸'], ['pay at shop', '🏪'], ['wallet', '👛'],
  ['movie', '🎬'], ['train', '🚆'], ['bus', '🚌'], ['flight', '✈️'],
  ['emi', '🏦'], ['insurance', '🛡️'], ['sip', '📈'], ['gold', '🪙'], ['credit card', '💳'],
];

export function getServiceEmoji(name) {
  const n = String(name || '').toLowerCase();
  const hit = ICONS.find(([key]) => n.includes(key));
  return hit ? hit[1] : '💳';
}
