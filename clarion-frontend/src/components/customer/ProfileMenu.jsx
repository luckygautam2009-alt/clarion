import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, FileText, LogOut, Package, Phone, UserCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { fetchMyAvatarUrl, uploadMyAvatar, removeMyAvatar } from '../../api/client';
import { goTo } from '../../auth/nav';
import EditProfileModal from './EditProfileModal';

function Avatar({ src, name, size }) {
  const px = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-7 h-7 text-xs';
  return src
    ? <img src={src} alt={name} className={`${px} rounded-full object-cover border border-border-strong`} />
    : <span className={`${px} rounded-full bg-[#34484A] text-white font-bold flex items-center justify-center shrink-0`}>{name.charAt(0).toUpperCase()}</span>;
}

export default function ProfileMenu({ customer, onLogout }) {
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const current = useRef(null);

  const loadAvatar = useCallback(async () => {
    const url = await fetchMyAvatarUrl().catch(() => null);
    if (current.current) URL.revokeObjectURL(current.current);
    current.current = url;
    setAvatar(url);
  }, []);

  useEffect(() => { loadAvatar(); return () => { if (current.current) URL.revokeObjectURL(current.current); }; }, [loadAvatar]);
  useEffect(() => {
    function onDoc(e) { if (box.current && !box.current.contains(e.target)) { setOpen(false); } }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function onPick(e) {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    setMsg(null);
    if (!file.type.startsWith('image/')) { setMsg({ ok: false, text: 'Please choose an image file.' }); return; }
    if (file.size > 2 * 1024 * 1024) { setMsg({ ok: false, text: 'The photo must be under 2 MB.' }); return; }
    setBusy(true);
    try { await uploadMyAvatar(file); await loadAvatar(); setMsg({ ok: true, text: 'Profile photo updated.' }); }
    catch (err) { setMsg({ ok: false, text: err.message || 'Could not upload the photo.' }); }
    finally { setBusy(false); }
  }

  async function onRemove() {
    setBusy(true); setMsg(null);
    try { await removeMyAvatar(); await loadAvatar(); setMsg({ ok: true, text: 'Photo removed.' }); }
    catch (err) { setMsg({ ok: false, text: err.message || 'Could not remove the photo.' }); }
    finally { setBusy(false); }
  }

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl border border-border-strong bg-ink-light hover:bg-ink-lighter transition-all duration-150 cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-amber focus-visible:outline-offset-1"
        aria-label="User profile menu"
      >
        <Avatar src={avatar} name={customer.name} />
        <span className="hidden sm:inline text-xs sm:text-sm font-semibold text-paper">{customer.name.split(' ')[0]}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2.5 w-84 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border-strong bg-white dark:bg-ink-light shadow-2xl z-50 overflow-hidden animate-in fade-in">
          <div className="p-4 flex items-center gap-3.5 border-b border-border bg-ink-inset/40">
            <div className="relative shrink-0">
              <Avatar src={avatar} name={customer.name} size="lg" />
              <label title="Change photo" className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#2F6F68] hover:bg-[#265B55] text-white flex items-center justify-center cursor-pointer shadow-sm transition-colors border-2 border-white dark:border-ink-light">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={onPick} disabled={busy} />
              </label>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-sm text-paper truncate flex items-center gap-1.5">
                <span>{customer.name}</span>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  title="Edit profile & delivery details"
                >
                  Edit
                </button>
              </div>
              <div className="text-xs text-muted truncate mt-0.5">{customer.email}</div>
              {customer.phone ? (
                <div className="text-xs font-bold text-primary flex items-center gap-1 mt-0.5 truncate">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{customer.phone}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="text-[11px] font-bold text-amber hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                >
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>+ Add mobile no.</span>
                </button>
              )}
              <div className="text-[11px] font-mono text-muted/70 mt-0.5">{customer.id}</div>
            </div>
          </div>
          {msg && <p className={`px-4.5 pt-2.5 text-xs font-semibold ${msg.ok ? 'text-verified' : 'text-alert'}`}>{msg.text}</p>}
          <div className="py-2">
            <label className="w-full flex items-center gap-3 px-4.5 py-2.5 text-sm text-paper hover:bg-ink-lighter transition-colors cursor-pointer">
              <Camera className="w-4 h-4 text-amber shrink-0" />
              <span>{avatar ? 'Change photo' : 'Add a profile photo'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={onPick} disabled={busy} />
            </label>
            {avatar && (
              <button type="button" onClick={onRemove} disabled={busy} className="w-full text-left px-4.5 py-2 text-xs sm:text-sm text-muted hover:text-alert hover:bg-alert-dim/50 transition-colors cursor-pointer">
                Remove photo
              </button>
            )}
            <button
              type="button"
              id="menu-edit-profile"
              onClick={() => { setOpen(false); setShowModal(true); }}
              className="w-full flex items-center gap-3 px-4.5 py-2.5 text-sm font-semibold text-paper hover:bg-ink-lighter transition-colors cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-primary shrink-0" />
              <span>Edit profile details</span>
            </button>
            <button
              type="button"
              id="menu-my-orders"
              onClick={() => { setOpen(false); goTo('/orders'); }}
              className="w-full flex items-center gap-3 px-4.5 py-2.5 text-sm font-semibold text-paper hover:bg-ink-lighter transition-colors cursor-pointer"
            >
              <Package className="w-4 h-4 text-amber shrink-0" />
              <span>My orders</span>
            </button>
            <button
              type="button"
              id="menu-my-complaints"
              onClick={() => { setOpen(false); goTo('/complaints'); }}
              className="w-full flex items-center gap-3 px-4.5 py-2.5 text-sm font-semibold text-paper hover:bg-ink-lighter transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber shrink-0" />
              <span>My complaints</span>
            </button>
            <div className="pt-1 mt-1 border-t border-border">
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4.5 py-2.5 text-sm text-muted hover:text-paper hover:bg-ink-lighter transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <EditProfileModal
        open={showModal}
        onClose={() => setShowModal(false)}
        customer={customer}
      />
    </div>
  );
}
