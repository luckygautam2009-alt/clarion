import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, MapPin, Building, Hash, Check, AlertCircle } from 'lucide-react';
import { updateMyDetails } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

export default function EditProfileModal({ open, onClose, customer }) {
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
      setCity(customer.city || '');
      setPincode(customer.pincode || '');
      setError(null);
      setSuccess(false);
    }
  }, [customer, open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateMyDetails({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
      });
      if (refresh) await refresh();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Could not update your profile details.');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full bg-ink-inset border border-border-strong rounded-xl px-3.5 py-2 text-sm font-semibold text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg my-auto rounded-2xl border border-border-strong bg-white dark:bg-ink-light p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div>
            <h3 className="font-display text-lg font-extrabold text-paper">Edit Profile & Delivery Details</h3>
            <p className="text-xs text-muted mt-0.5">
              Update your contact number and shipping address for orders and deliveries.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-paper hover:bg-ink-inset cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-alert/30 bg-alert-dim text-xs font-bold text-alert flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl border border-verified/30 bg-verified-dim text-xs font-bold text-verified flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Details updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sreyansh Dixit"
              required
              maxLength={80}
              className={inputClass}
            />
          </div>

          {/* Email (Readonly) & Mobile Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={customer?.email || ''}
                disabled
                className="w-full bg-ink-inset/50 border border-border rounded-xl px-3.5 py-2 text-sm font-semibold text-muted cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" /> Mobile / Phone No.
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                maxLength={20}
                className={inputClass}
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Delivery Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House/Flat No., Street, Landmark"
              maxLength={200}
              className={inputClass}
            />
          </div>

          {/* City & PIN Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary" /> City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai"
                maxLength={50}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-primary" /> PIN Code
              </label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 400001"
                maxLength={10}
                className={inputClass}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2 rounded-xl border border-border-strong text-xs font-bold text-muted hover:text-paper hover:bg-ink-inset cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-[#265B55] text-white text-xs font-bold cursor-pointer transition-all shadow-xs neon-glow-teal active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? 'Saving details…' : 'Save Details'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
