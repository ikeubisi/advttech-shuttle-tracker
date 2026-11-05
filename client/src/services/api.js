export async function api(url, options = {}) {
  const r = await fetch('/api' + url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) throw Error(data.error || 'Request failed');

  return data;
}
