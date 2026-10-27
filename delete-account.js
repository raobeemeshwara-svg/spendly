import { createClient } from '@supabase/supabase-js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Unauthorized' });
  const { error: e } = await admin.auth.admin.deleteUser(data.user.id); // cascades to all user rows
  if (e) return res.status(500).json({ error: 'Could not delete account' });
  res.json({ ok: true });
}
