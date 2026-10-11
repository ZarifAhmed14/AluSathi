import {useCallback, useEffect, useState} from 'react';
import {Bell, CalendarPlus, Check, Trash2} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useLanguage} from '@/contexts/LanguageContext';
import {supabase} from '@/integrations/supabase/client';
import type {Database} from '@/integrations/supabase/types';
import {enablePush, disablePush} from '@/lib/push';
import {calendarReminder, downloadFile} from '@/lib/farmer-tools';

type Reminder = Database['public']['Tables']['treatment_reminders']['Row'];
export default function TreatmentReminders({ compact = false }: { compact?: boolean }) {
  const {user} = useAuth(); const {language} = useLanguage(); const bn = language === 'bn';
  const [rows, setRows] = useState<Reminder[]>([]);
  const [title, setTitle] = useState(''); const [due, setDue] = useState('');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [enabled, setEnabled] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    const {data, error} = await supabase.from('treatment_reminders').select('*').eq('user_id',user.id).order('due_at').limit(100);
    if (error) throw error;
    setRows(data || []);
  }, [user]);
  useEffect(() => {
    let active = true; setRows([]); setMessage(''); setEnabled(false);
    if (!user) return;
    const refresh = async () => {
      const {data, error} = await supabase.from('treatment_reminders').select('*').eq('user_id', user.id).order('due_at').limit(100);
      if (!active) return;
      if (error) setMessage(bn ? 'খাতা লোড হয়নি। ইন্টারনেট দেখে আবার খুলুন।' : 'Unable to load reminders. Check your connection and reopen.');
      else setRows(data || []);
    };
    refresh();
    navigator.serviceWorker?.getRegistration().then(async reg => {
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return;
      const {data} = await supabase.from('push_subscriptions').select('id').eq('user_id',user.id).eq('endpoint',sub.endpoint).maybeSingle();
      if (active) setEnabled(Boolean(data));
    }).catch(() => {});
    const timer = setInterval(refresh, 60000); window.addEventListener('online', refresh);
    return () => {active = false; clearInterval(timer); window.removeEventListener('online', refresh);};
  }, [user, bn]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!user || busy) return; setBusy(true); setMessage('');
    try {
      calendarReminder(title, due);
      const {error} = await supabase.from('treatment_reminders').insert({user_id:user.id, title:title.trim(), due_at:new Date(due).toISOString()});
      if (error) throw error;
      await load(); setTitle(''); setDue(''); setMessage(bn ? 'মনে রাখার সময় সেভ হয়েছে।' : 'Reminder saved.');
    } catch {setMessage(bn ? 'সেভ হয়নি। কাজ, ভবিষ্যতের সময় ও ইন্টারনেট দেখুন।' : 'Could not save. Check the task, future time and connection.');}
    finally {setBusy(false);}
  }
  async function update(id: string, remove = false) {
    if (!user) return;
    const query = remove ? supabase.from('treatment_reminders').delete() : supabase.from('treatment_reminders').update({completed:true});
    const {error} = await query.eq('id',id).eq('user_id',user.id);
    if (error) setMessage(bn ? 'পরিবর্তন হয়নি। আবার চেষ্টা করুন।' : 'Change not saved. Try again.');
    else await load();
  }
  return <div className={compact ? "today-reminders" : "farmer-tool reminder-tool"}>
    {compact && rows.some(r => !r.completed) && <ul className="today-due">{rows.filter(r => !r.completed).slice(0, 3).map(r => <li key={r.id}><strong>{r.title}</strong> · {new Date(r.due_at).toLocaleString(bn ? 'bn-BD' : 'en-GB')}</li>)}</ul>}
    <details><summary><Bell />{compact ? (bn ? 'কাজ মনে রাখুন / ক্যালেন্ডারে দিন' : 'Save a task / add to calendar') : (bn ? 'চিকিৎসার সময় মনে করান' : 'Treatment reminder')}</summary><div className="tool-body">
    <p>{bn ? 'বিশেষজ্ঞের দেওয়া কাজ ও সময় লিখুন। কোন চিকিৎসা করবেন, তা এখানে ঠিক করা হয় না।' : 'Save the task and time agreed with your adviser. This does not prescribe treatment.'}</p>
    <form className="tool-form" onSubmit={save}><label>{bn ? 'কী কাজ?' : 'What task?'}<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} /></label><label>{bn ? 'কখন?' : 'When?'}<input required type="datetime-local" value={due} onChange={e=>setDue(e.target.value)} /></label>
      <div className="report-actions"><button type="button" className="main-button" onClick={()=>{try {downloadFile('AluSathi-reminder.ics',calendarReminder(title,due),'text/calendar;charset=utf-8'); setMessage(bn ? 'ফাইলটি খুলে ফোনের ক্যালেন্ডারে যোগ করুন।' : 'Open the file and add it to your phone calendar.');} catch {setMessage(bn ? 'কাজ ও ভবিষ্যতের সময় দিন।' : 'Enter a task and future time.');}}}><CalendarPlus size={16}/>{bn ? 'ফোনের ক্যালেন্ডারে দিন' : 'Add to phone calendar'}</button>{user && <button className="secondary-main" disabled={busy}>{bn ? 'খাতায় রাখুন' : 'Save in account'}</button>}</div>
    </form>
    {user && <button className="text-button" disabled={busy} onClick={async ()=>{setBusy(true); try {if(enabled) await disablePush(user.id); else await enablePush(user.id,language); setEnabled(!enabled); setMessage(!enabled ? (bn ? 'এই ফোনে মনে করানোর খবর আসবে। সময়মতো পেতে ইন্টারনেট লাগবে।' : 'Background alerts enabled on this device. An internet connection is needed for delivery.') : (bn ? 'এই ফোনে খবর বন্ধ হয়েছে।' : 'Alerts disabled on this device.'));} catch {setMessage(bn ? 'খবর চালু হয়নি। ফোনের অনুমতি দেখুন। আইফোনে আগে হোম স্ক্রিনে অ্যাপ যোগ করুন। ক্যালেন্ডারও ব্যবহার করতে পারেন।' : 'Could not change push alerts. Check browser permission. On iPhone, install to the Home Screen first. Calendar reminders are also available.');} finally {setBusy(false);}}}><Bell size={16}/>{enabled ? (bn ? 'এই ফোনে খবর বন্ধ করুন' : 'Disable device alerts') : (bn ? 'এই ফোনে খবর চালু করুন' : 'Enable background alerts')}</button>}
    <small>{bn ? 'ক্যালেন্ডার ফাইলটি খুলে ফোনে যোগ করতে হবে। এই অ্যাপের নোটিফিকেশন সব ফোনে পরীক্ষিত নয়।' : 'Open the calendar file and add it on your phone. App notifications have not been verified on every device.'}</small>
    <ul className="reminder-list">{rows.map(r=><li key={r.id}><span><strong>{r.title}</strong><time>{new Date(r.due_at).toLocaleString(bn?'bn-BD':'en-GB')}</time><small>{r.completed ? (bn?'কাজ শেষ':'Completed') : r.notified_at ? (bn?'খবর পাঠানো হয়েছে':'Sent to push service') : Date.parse(r.due_at)<=Date.now() ? (bn?'সময় হয়েছে':'Due now') : (bn?'সময় হলে মনে করাবে':'Upcoming')}</small><button className="text-button" onClick={()=>{try {downloadFile('AluSathi-reminder.ics',calendarReminder(r.title,r.due_at),'text/calendar;charset=utf-8');} catch {setMessage(bn?'সময়টি পার হয়েছে। নতুন সময় দিন।':'This time has passed. Create a new reminder.');}}}>{bn?'ক্যালেন্ডারে দিন':'Add to calendar'}</button></span><span>{!r.completed && <button aria-label={bn?'কাজ শেষ':'Mark complete'} onClick={()=>update(r.id)}><Check size={17}/></button>}<button aria-label={bn?'মুছুন':'Delete reminder'} onClick={()=>update(r.id,true)}><Trash2 size={17}/></button></span></li>)}</ul>
    {user && !rows.length && <p>{bn?'এখনো মনে করানোর সময় নেই।':'No reminders yet.'}</p>}
    {message && <p className="tool-notice" role="status">{message}</p>}
  </div></details></div>;
}
