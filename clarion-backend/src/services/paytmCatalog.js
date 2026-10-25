// Payment services shown on the Clarion pay screen (mock data for the hackathon).
// Field names (id, name, price, category, blurb, emoji) match the old store catalog,
// so the order, payment and investigation engines keep working unchanged.

const CATALOG = [
  // Recharge & Bills
  { id: 'mobile299', name: 'Mobile Recharge 299', price: 299, emoji: '📱', category: 'Recharge & Bills', blurb: 'Prepaid plan, 28 days, 1.5 GB per day' },
  { id: 'mobile719', name: 'Mobile Recharge 719', price: 719, emoji: '📶', category: 'Recharge & Bills', blurb: 'Prepaid plan, 84 days, 2 GB per day' },
  { id: 'dth', name: 'DTH Recharge', price: 450, emoji: '📡', category: 'Recharge & Bills', blurb: 'One month pack for your set-top box' },
  { id: 'electricity', name: 'Electricity Bill', price: 1850, emoji: '💡', category: 'Recharge & Bills', blurb: 'Pay your monthly electricity bill' },
  { id: 'fastag', name: 'FASTag Recharge', price: 500, emoji: '🚗', category: 'Recharge & Bills', blurb: 'Add balance to your FASTag' },
  { id: 'lpg', name: 'LPG Cylinder Booking', price: 903, emoji: '🔥', category: 'Recharge & Bills', blurb: 'Book and pay for a refill' },
  { id: 'broadband', name: 'Broadband Bill', price: 799, emoji: '🌐', category: 'Recharge & Bills', blurb: 'Pay your monthly internet bill' },

  // Money Transfer
  { id: 'upi1000', name: 'Send Money (UPI)', price: 1000, emoji: '💸', category: 'Money Transfer', blurb: 'Instant transfer to any UPI ID or contact' },
  { id: 'merchant', name: 'Pay at Shop (QR)', price: 650, emoji: '🏪', category: 'Money Transfer', blurb: 'Scan a merchant QR and pay' },
  { id: 'wallet', name: 'Add Money to Wallet', price: 2000, emoji: '👛', category: 'Money Transfer', blurb: 'Top up your wallet from your bank account' },

  // Travel & Tickets
  { id: 'movie', name: 'Movie Tickets', price: 600, emoji: '🎬', category: 'Travel & Tickets', blurb: 'Two tickets, evening show' },
  { id: 'train', name: 'Train Ticket', price: 1120, emoji: '🚆', category: 'Travel & Tickets', blurb: 'Reserved seat, sleeper class' },
  { id: 'bus', name: 'Bus Ticket', price: 850, emoji: '🚌', category: 'Travel & Tickets', blurb: 'Overnight AC sleeper' },
  { id: 'flight', name: 'Flight Booking', price: 5400, emoji: '✈️', category: 'Travel & Tickets', blurb: 'One-way domestic economy fare' },

  // Finance
  { id: 'emi', name: 'Loan EMI Payment', price: 7500, emoji: '🏦', category: 'Finance', blurb: 'Pay this month\'s personal loan EMI' },
  { id: 'insurance', name: 'Insurance Premium', price: 12000, emoji: '🛡️', category: 'Finance', blurb: 'Yearly life insurance premium' },
  { id: 'sip', name: 'Mutual Fund SIP', price: 5000, emoji: '📈', category: 'Finance', blurb: 'Monthly SIP instalment' },
  { id: 'gold', name: 'Digital Gold', price: 3000, emoji: '🪙', category: 'Finance', blurb: 'Buy 24K gold in your account' },
  { id: 'cardbill', name: 'Credit Card Bill', price: 54999, emoji: '💳', category: 'Finance', blurb: 'High-value payment: always needs human review' },
];

module.exports = CATALOG;
