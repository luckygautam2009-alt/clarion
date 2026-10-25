const KEY = 'clarion.adminSession';

export function getAdminSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.token) return null;
    if (s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function getAdminToken() {
  const s = getAdminSession();
  return s && s.token ? s.token : null;
}

export function saveAdminSession({ token, expiresAt, admin, name, email, idVerified = true }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      token,
      expiresAt,
      name: admin?.name || name || '',
      email: admin?.email || email || '',
      idVerified: Boolean(idVerified),
    }));
  } catch { /* storage unavailable */ }
}

export function clearAdminSession() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export function isAdminSessionVerified() {
  const s = getAdminSession();
  return Boolean(s && s.token && s.idVerified);
}
