// src/callAPI/callAPI.js
// Couche Supabase (auth + CRUD) avec initialisation paresseuse pour éviter
// "Cannot access 'supabase' before initialization" en cas d’imports circulaires.

import { createClient } from '@supabase/supabase-js';

// ---------- Lazy singleton ----------
let _supabase = null;

export function getSupabase() {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] Variables manquantes: REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY');
    throw new Error('Clés Supabase manquantes dans les variables d’environnement.');
  }

  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _supabase;
}

// ---------- Helpers ----------
async function getUserIdOrThrow() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data?.user;
  if (!user) throw new Error('Utilisateur non connecté');
  return user.id;
}

const editablePlantFields = new Set(['name', 'start_date', 'duration_days', 'notes']);

function toSnakePatch(patch) {
  const out = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === 'startDate') out.start_date = v;
    else if (k === 'durationDays') out.duration_days = v;
    else if (editablePlantFields.has(k)) out[k] = v;
    else if (editablePlantFields.has(k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`))) {
      const key = k.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
      out[key] = v;
    }
  }
  return out;
}

// ---------- AUTH ----------
export async function signUpWithEmail(email, password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email, password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithMagicLink(email) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ---------- PLANTS (table: plants) ----------
export async function listPlants() {
  const supabase = getSupabase();
  const userId = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from('plants')
    .select('id, name, start_date, duration_days, notes, inserted_at, updated_at, is_archived, stage')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPlant(id) {
  const supabase = getSupabase();
  const userId = await getUserIdOrThrow();
  const { data, error } = await supabase
    .from('plants')
    .select('id, name, start_date, duration_days, notes, inserted_at, updated_at, is_archived, stage')
    .eq('user_id', userId)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createPlant({ name, startDate, durationDays, notes = '', stage = null, isArchived = false }) {
  const supabase = getSupabase();
  const userId = await getUserIdOrThrow();
  const payload = {
    user_id: userId,
    name,
    start_date: startDate,        // 'YYYY-MM-DD'
    duration_days: durationDays,  // number
    notes,
    stage,
    is_archived: !!isArchived,
  };
  const { data, error } = await supabase
    .from('plants')
    .insert(payload)
    .select('id, name, start_date, duration_days, notes, inserted_at, updated_at, is_archived, stage')
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlant(id, patch) {
  const supabase = getSupabase();
  const userId = await getUserIdOrThrow();
  const update = toSnakePatch(patch);
  if (Object.keys(update).length === 0) return await getPlant(id);

  const { data, error } = await supabase
    .from('plants')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, name, start_date, duration_days, notes, inserted_at, updated_at, is_archived, stage')
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlant(id) {
  const supabase = getSupabase();
  const userId = await getUserIdOrThrow();
  const { error } = await supabase.from('plants').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
  return { ok: true };
}

// ---------- Realtime (optionnel) ----------
export async function subscribePlants(onChange) {
  const supabase = getSupabase();
  await getUserIdOrThrow(); // s’assure qu’on est auth (et déclenche erreur sinon)

  const channel = supabase
    .channel('plants-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'plants' },
      payload => onChange?.(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// --- dans src/callAPI/callAPI.js ---

// Renvoie le user courant (ou null)
export async function getCurrentUser() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user ?? null;
}
// Profile CRUD (table 'profiles': id uuid (pk) = auth.uid, username, first_name, last_name)
export async function getProfile() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('username, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile({ username, first_name, last_name }) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Non connecté');
  const payload = {
    id: user.id,
    username: username ?? null,
    first_name: first_name ?? null,
    last_name: last_name ?? null,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return true;
}

// Email / Password
export async function updateEmail(newEmail) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.updateUser({
    email: newEmail
    // optionnel: emailRedirectTo: window.location.origin
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

// Abonnement (table 'subscriptions': user_id uuid, plan text)
export async function getSubscription() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data || { plan: 'free' };
}

export async function updateSubscription(plan) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!user) throw new Error('Non connecté');
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: user.id,
    plan,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) throw error;
  return true;
}
