import {
  initDatabase,
  getMode,
  getStatuses,
  getUnits,
  saveUnitStatuses,
  addStatus,
  subscribeToInventory
} from './db.js';

let units = [];
let statuses = [];
const pendingChanges = new Map();

const $ = id => document.getElementById(id);

function render() {
  const search = $('searchInput').value.trim().toLowerCase();
  const floor = $('floorFilter').value;
  const status = $('statusFilter').value;

  const filtered = units.filter(unit => {
    const matchesSearch =
      !search ||
      unit.unit_number.toLowerCase().includes(search) ||
      unit.svg_id.toLowerCase().includes(search) ||
      unit.unit_type.toLowerCase().includes(search);

    const matchesFloor = !floor || unit.floor === floor;
    const matchesStatus = !status || unit.status_id === status;

    return matchesSearch && matchesFloor && matchesStatus;
  });

  $('inventoryBody').innerHTML = filtered.map(unit => {
    const currentStatus = pendingChanges.get(unit.id) ?? unit.status_id;

    return `
      <tr>
        <td>${escapeHtml(unit.floor)}</td>
        <td><strong>${escapeHtml(unit.unit_number)}</strong></td>
        <td>${escapeHtml(unit.unit_type)}</td>
        <td><code>${escapeHtml(unit.svg_id)}</code></td>
        <td>
          <select class="unit-status" data-unit-id="${unit.id}">
            ${statuses.map(item => `
              <option value="${escapeHtml(item.id)}" ${item.id === currentStatus ? 'selected' : ''}>
                ${escapeHtml(item.name)}
              </option>
            `).join('')}
          </select>
        </td>
        <td>${Number(unit.area || 0).toLocaleString()} sq ft</td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.unit-status').forEach(select => {
    select.addEventListener('change', event => {
      pendingChanges.set(Number(event.target.dataset.unitId), event.target.value);
      $('saveMessage').textContent = `${pendingChanges.size} unsaved change${pendingChanges.size === 1 ? '' : 's'}.`;
    });
  });
}

function populateStatusFilter() {
  $('statusFilter').innerHTML =
    '<option value="">All statuses</option>' +
    statuses.map(status => `<option value="${escapeHtml(status.id)}">${escapeHtml(status.name)}</option>`).join('');
}

async function reload() {
  [statuses, units] = await Promise.all([getStatuses(), getUnits()]);
  populateStatusFilter();
  render();
}

async function save() {
  if (!pendingChanges.size) {
    $('saveMessage').textContent = 'No changes to save.';
    return;
  }

  const changes = [...pendingChanges.entries()].map(([id, status_id]) => ({ id, status_id }));

  $('saveButton').disabled = true;
  $('saveMessage').textContent = 'Saving...';

  try {
    await saveUnitStatuses(changes);
    pendingChanges.clear();
    await reload();
    $('saveMessage').textContent = 'Saved successfully.';
  } catch (error) {
    console.error(error);
    $('saveMessage').textContent = `Save failed: ${error.message}`;
  } finally {
    $('saveButton').disabled = false;
  }
}

async function createStatus() {
  $('statusDialog').showModal();
}

$('addStatusButton')?.addEventListener('click', createStatus);

export async function initAdminPage() {
  try {
    await initDatabase();

    $('connectionStatus')?.remove();
    await reload();

    $('searchInput').addEventListener('input', render);
    $('floorFilter').addEventListener('change', render);
    $('statusFilter').addEventListener('change', render);
    $('saveButton').addEventListener('click', save);

    $('statusForm').addEventListener('submit', async event => {
      event.preventDefault();

      const name = $('newStatusName').value.trim();
      const color = $('newStatusColor').value;

      if (!name) return;

      try {
        await addStatus(name, color);
        $('statusDialog').close();
        $('newStatusName').value = '';
        await reload();
        $('saveMessage').textContent = `Status "${name}" added.`;
      } catch (error) {
        console.error(error);
        $('saveMessage').textContent = `Could not add status: ${error.message}`;
      }
    });

    subscribeToInventory(async message => {
      if (message?.type === 'units-updated' || message?.type === 'statuses-updated') {
        await reload();
      }
    });
  } catch (error) {
    console.error(error);
    $('saveMessage').textContent = `Database initialization failed: ${error.message}`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}
