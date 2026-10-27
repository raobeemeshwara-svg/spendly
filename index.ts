import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const APP = Deno.env.get('APP_URL')!, FROM = Deno.env.get('FROM_EMAIL') || 'Spendly <onboarding@resend.dev>';

const nowIn = (tz: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, min: (Number(p.hour) % 24) * 60 + Number(p.minute) };
};
const mins = (t: string) => { const [h, m] = t.split(':'); return Number(h) * 60 + Number(m); };
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('Unauthorized', { status: 401 });
  const { data: prefs, error } = await admin.from('notification_prefs').select('user_id,morning_time,evening_time,timezone').eq('email_enabled', true);
  if (error) return new Response(error.message, { status: 500 });
  let sent = 0;
  for (const p of prefs ?? []) {
    try {
      const { day, min } = nowIn(p.timezone || 'Asia/Kolkata');
      const slot = [['morning', p.morning_time], ['evening', p.evening_time]].find(([, t]) => { const d = min - mins(String(t)); return d >= 0 && d < 15; })?.[0];
      if (!slot) continue;
      const { error: dup } = await admin.from('reminder_log').insert({ user_id: p.user_id, slot, day });
      if (dup) continue; // already sent for this slot today
      const { data: u } = await admin.auth.admin.getUserById(p.user_id);
      const { data: pr } = await admin.from('profiles').select('display_name').eq('id', p.user_id).maybeSingle();
      if (!u?.user?.email) continue;
      const name = esc((pr?.display_name || '').split(' ')[0] || 'there');
      const text = slot === 'morning' ? 'A new day. Log your spending as it happens and the rest takes care of itself.' : 'Before the day ends, take a minute to log what you spent today.';
      const r = await fetch('https://api.resend.com/emails', { method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: u.user.email, subject: slot === 'morning' ? 'Good morning from Spendly' : 'Your Spendly evening check-in',
          html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h2 style="margin:0 0 12px">Hi ${name},</h2><p style="color:#444;line-height:1.6">${text}</p><p><a href="${APP}" style="background:#4F46E5;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700">Open Spendly</a></p><p style="color:#999;font-size:12px">Change or turn off reminders in Settings.</p></div>` }) });
      if (r.ok) sent++; else await admin.from('reminder_log').delete().match({ user_id: p.user_id, slot, day }); // retry next run
    } catch (e) { console.error(e); }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});
