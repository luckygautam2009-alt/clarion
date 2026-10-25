require('dotenv').config();
const BASE = `http://localhost:${process.env.PORT || 5001}/api`;
let pass = 0, fail = 0;
const check = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const call = async (m, p, b, h = {}) => { const r = await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, json: await r.json().catch(() => ({})) }; };
const photo = async (token, buf, mime, name) => { const fd = new FormData(); fd.append('photo', new Blob([buf], { type: mime }), name); const r = await fetch(BASE + '/me/profile/photo', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd }); return { status: r.status, json: await r.json().catch(() => ({})) }; };

(async () => {
  const su = async (n) => (await call('POST', '/auth/signup', { name: n, email: `${n.replace(/\W/g, '').toLowerCase()}${Date.now()}@example.com`, password: 'Str0ng-pass-123' })).json.data;
  const a = await su('Profile Tester'); const b = await su('Other Person');
  const A = { Authorization: `Bearer ${a.token}` }; const B = { Authorization: `Bearer ${b.token}` };
  check('no photo at first', (await call('GET', '/me/profile', null, A)).json.data.hasAvatar === false);
  check('a real PNG is accepted', (await photo(a.token, PNG, 'image/png', 'me.png')).json.data.hasAvatar === true);
  const got = await fetch(BASE + '/me/profile/photo', { headers: A });
  check('owner can fetch the photo', got.status === 200 && got.headers.get('content-type') === 'image/png');
  check('other customer has no photo (isolated)', (await fetch(BASE + '/me/profile/photo', { headers: B })).status === 404);
  check('no token: refused', (await fetch(BASE + '/me/profile/photo')).status === 401);
  check('fake image rejected', (await photo(a.token, Buffer.from('definitely not an image'), 'image/png', 'x.png')).status === 400);
  check('oversized photo rejected', (await photo(a.token, Buffer.concat([PNG, Buffer.alloc(2.5 * 1024 * 1024)]), 'image/png', 'big.png')).status === 400);
  const rn = await call('POST', '/me/profile/name', { name: 'Profile Renamed' }, A);
  check('name can be changed', rn.json.success && rn.json.data.name === 'Profile Renamed');
  check('/auth/me shows the new name', (await call('GET', '/auth/me', null, A)).json.data.name === 'Profile Renamed');
  check('bad name rejected', (await call('POST', '/me/profile/name', { name: 'x' }, A)).status === 400);
  const rm = await fetch(BASE + '/me/profile/photo', { method: 'DELETE', headers: A });
  check('photo can be removed', rm.status === 200 && (await fetch(BASE + '/me/profile/photo', { headers: A })).status === 404);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
