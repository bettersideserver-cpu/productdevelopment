import { USE_SUPABASE, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { DEMO_STATUSES, DEMO_UNITS } from './demo-data.js';

let supabaseClient = null;
const UNITS_KEY = 'inventory_demo_units_v1';
const STATUSES_KEY = 'inventory_demo_statuses_v1';
const channelName = 'inventory-demo-sync';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getDemoUnits() {
  const saved = localStorage.getItem(UNITS_KEY);
  if (saved) return JSON.parse(saved);
  localStorage.setItem(UNITS_KEY, JSON.stringify(DEMO_UNITS));
  return clone(DEMO_UNITS);
}

function getDemoStatuses() {
  const saved = localStorage.getItem(STATUSES_KEY);
  if (saved) return JSON.parse(saved);
  localStorage.setItem(STATUSES_KEY, JSON.stringify(DEMO_STATUSES));
  return clone(DEMO_STATUSES);
}

function broadcast(message) {
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(message);
    channel.close();
  }
  window.dispatchEvent(new CustomEvent('inventory-local-change', { detail: message }));
}

export async function initDatabase() {
  if (!USE_SUPABASE) return { mode: 'demo' };

  const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0/+esm');
  supabaseClient = module.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return { mode: 'supabase' };
}

export function getMode() {
  return USE_SUPABASE ? 'supabase' : 'demo';
}

export async function getStatuses() {
  if (!USE_SUPABASE) return getDemoStatuses();

  const { data, error } = await supabaseClient
    .from('status_categories')
    .select('*')
    .eq('active', true)
    .order('sort_order');

  if (error) throw error;
  return data;
}

export async function getUnits(floor = null) {
  if (!USE_SUPABASE) {
    const units = getDemoUnits();
    return floor ? units.filter(unit => unit.floor === floor) : units;
  }

  let query = supabaseClient.from('units').select('*').order('floor').order('unit_number');
  if (floor) query = query.eq('floor', floor);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function saveUnitStatuses(changes) {
  if (!USE_SUPABASE) {
    const units = getDemoUnits();
    const byId = new Map(units.map(unit => [unit.id, unit]));

    for (const change of changes) {
      const unit = byId.get(change.id);
      if (unit) unit.status_id = change.status_id;
    }

    const next = [...byId.values()];
    localStorage.setItem(UNITS_KEY, JSON.stringify(next));
    broadcast({ type: 'units-updated', changes });
    return next;
  }

  const results = [];
  for (const change of changes) {
    const { data, error } = await supabaseClient
      .from('units')
      .update({ status_id: change.status_id, updated_at: new Date().toISOString() })
      .eq('id', change.id)
      .select()
      .single();

    if (error) throw error;
    results.push(data);
  }

  return results;
}

export async function addStatus(name, color) {
  if (!USE_SUPABASE) {
    const statuses = getDemoStatuses();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `status-${Date.now()}`;
    const status = { id, name, color, active: true };
    statuses.push(status);
    localStorage.setItem(STATUSES_KEY, JSON.stringify(statuses));
    broadcast({ type: 'statuses-updated' });
    return status;
  }

  const sortOrder = (await getStatuses()).length;
  const { data, error } = await supabaseClient
    .from('status_categories')
    .insert({ name, color, active: true, sort_order: sortOrder })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToInventory(callback) {
  if (!USE_SUPABASE) {
    const handler = event => {
      if (event.detail?.type === 'units-updated' || event.detail?.type === 'statuses-updated') {
        callback(event.detail);
      }
    };

    window.addEventListener('inventory-local-change', handler);

    let bc = null;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(channelName);
      bc.onmessage = event => callback(event.data);
    }

    return () => {
      window.removeEventListener('inventory-local-change', handler);
      bc?.close();
    };
  }

  const channel = supabaseClient
    .channel('inventory-unit-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'units' },
      payload => callback({ type: 'units-updated', payload })
    )
    .subscribe();

  return () => supabaseClient.removeChannel(channel);
}
