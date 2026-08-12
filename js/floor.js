import {
  initDatabase,
  getMode,
  getStatuses,
  getUnits,
  subscribeToInventory
} from './db.js';

const fallbackColors = {
  available: '#16a34a',
  reserved: '#f59e0b',
  sold: '#dc2626',
  hold: '#7c3aed'
};

function statusColor(status) {
  return status?.color || fallbackColors[status?.id] || '#64748b';
}

function applyUnit(unit, statusMap) {
  const element = document.getElementById(unit.svg_id);
  if (!element) return;

  const status = statusMap.get(unit.status_id);
  const color = statusColor(status);

  element.style.setProperty('--unit-color', color);
  element.dataset.status = status?.name || unit.status_id || 'Unknown';
  element.dataset.unit = unit.unit_number;
  element.dataset.floor = unit.floor;
  element.dataset.type = unit.unit_type;

  element.classList.add('inventory-unit');
  element.setAttribute('fill', color);
  element.setAttribute('aria-label', `${unit.unit_type} ${unit.unit_number}, ${status?.name || unit.status_id}`);
}

function setupHover(units, statusMap) {
  const tooltip = document.getElementById('unitTooltip');

  for (const unit of units) {
    const element = document.getElementById(unit.svg_id);
    if (!element) continue;

    element.addEventListener('pointerenter', event => {
      const status = statusMap.get(unit.status_id);
      tooltip.innerHTML = `
        <div class="tooltip-title">${escapeHtml(unit.unit_number)}</div>
        <div class="tooltip-row"><span>Floor</span><strong>${escapeHtml(unit.floor)}</strong></div>
        <div class="tooltip-row"><span>Type</span><strong>${escapeHtml(unit.unit_type)}</strong></div>
        <div class="tooltip-row"><span>Status</span><strong>${escapeHtml(status?.name || unit.status_id)}</strong></div>
        <div class="tooltip-row"><span>Area</span><strong>${Number(unit.area || 0).toLocaleString()} sq ft</strong></div>
      `;
      tooltip.hidden = false;
      moveTooltip(event);
    });

    element.addEventListener('pointermove', moveTooltip);
    element.addEventListener('pointerleave', () => {
      tooltip.hidden = true;
    });
  }
}

function moveTooltip(event) {
  const tooltip = document.getElementById('unitTooltip');
  if (tooltip.hidden) return;

  const gap = 16;
  const maxX = window.innerWidth - tooltip.offsetWidth - 12;
  const maxY = window.innerHeight - tooltip.offsetHeight - 12;

  tooltip.style.left = `${Math.max(12, Math.min(event.clientX + gap, maxX))}px`;
  tooltip.style.top = `${Math.max(12, Math.min(event.clientY + gap, maxY))}px`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

export async function initFloorPage(floor, floorName) {
  const connectionStatus = document.getElementById('connectionStatus');
  const count = document.getElementById('floorCount');

  try {
    await initDatabase();

    const [statuses, units] = await Promise.all([
      getStatuses(),
      getUnits(floor)
    ]);

    const statusMap = new Map(statuses.map(status => [status.id, status]));

    units.forEach(unit => applyUnit(unit, statusMap));
    setupHover(units, statusMap);

    count.textContent = `${units.length} units`;
    connectionStatus.textContent = getMode() === 'supabase' ? 'Live Database' : 'Demo Mode';
    connectionStatus.className = `status-pill ${getMode() === 'supabase' ? 'live' : ''}`;

    subscribeToInventory(async () => {
      const [freshStatuses, freshUnits] = await Promise.all([
        getStatuses(),
        getUnits(floor)
      ]);

      const freshMap = new Map(freshStatuses.map(status => [status.id, status]));

      freshUnits.forEach(unit => applyUnit(unit, freshMap));

      count.textContent = `${freshUnits.length} units`;
    });
  } catch (error) {
    console.error(error);
    connectionStatus.textContent = 'Database Error';
    connectionStatus.className = 'status-pill error';
  }
}
