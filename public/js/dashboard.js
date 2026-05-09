const temperatureValue = document.getElementById('temperatureValue');
const humidityValue = document.getElementById('humidityValue');
const deviceStatus = document.getElementById('deviceStatus');
const statusDot = document.getElementById('statusDot');
const lastUpdated = document.getElementById('lastUpdated');
const historyTable = document.getElementById('historyTable');
const lcdForm = document.getElementById('lcdForm');
const lcdMessage = document.getElementById('lcdMessage');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const currentUser = document.getElementById('currentUser');
const thresholdForm = document.getElementById('thresholdForm');
const thresholdMessage = document.getElementById('thresholdMessage');
const alertsList = document.getElementById('alertsList');
const socketStatus = document.createElement('p');

socketStatus.className = 'mt-2 text-xs text-slate-400';
socketStatus.textContent = 'Realtime updates: connecting...';
refreshBtn.parentElement.appendChild(socketStatus);

function formatTime(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function setStatus(status) {
  deviceStatus.textContent = status || 'offline';
  statusDot.className = 'h-4 w-4 rounded-full ' + (status === 'online' ? 'bg-emerald-400' : 'bg-rose-400');
}

function applyRealtimeReading(reading) {
  if (!reading) {
    return;
  }

  temperatureValue.textContent = reading.temperature;
  humidityValue.textContent = reading.humidity;
  lastUpdated.textContent = `Last updated: ${formatTime(reading.time)}`;
  setStatus('online');
}

function renderAlerts(alerts) {
  if (!alerts.length) {
    alertsList.innerHTML = '<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">No alerts yet.</div>';
    return;
  }

  alertsList.innerHTML = alerts
    .map(
      (alert) => `
        <div class="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
          <p class="text-sm font-semibold text-amber-200">${formatTime(alert.time)}</p>
          <p class="mt-2 text-sm text-slate-100">${alert.messages.join('<br />')}</p>
          <p class="mt-2 text-xs text-slate-300">${alert.temperature} °C | ${alert.humidity} %</p>
        </div>
      `
    )
    .join('');
}

async function loadSession() {
  try {
    const response = await fetch('/api/auth/session');
    const result = await response.json();

    if (result.user) {
      currentUser.textContent = result.user.username;
    }
  } catch (error) {
    currentUser.textContent = 'Guest';
  }
}

async function loadLatest() {
  try {
    const response = await fetch('/api/sensor/latest');
    const result = await response.json();
    const latest = result.data;

    if (latest) {
      temperatureValue.textContent = latest.temperature;
      humidityValue.textContent = latest.humidity;
      lastUpdated.textContent = `Last updated: ${formatTime(result.lastUpdated)}`;
    } else {
      temperatureValue.textContent = '--';
      humidityValue.textContent = '--';
      lastUpdated.textContent = 'Last updated: --';
    }

    setStatus(result.deviceStatus);
  } catch (error) {
    setStatus('offline');
  }
}

async function loadHistory() {
  try {
    const response = await fetch('/api/sensor/history');
    const result = await response.json();
    const rows = result.data || [];

    if (!rows.length) {
      historyTable.innerHTML = '<tr><td class="px-4 py-4 text-slate-400" colspan="3">No sensor data yet.</td></tr>';
      return;
    }

    historyTable.innerHTML = rows
      .map(
        (entry) => `
          <tr>
            <td class="px-4 py-3">${formatTime(entry.time)}</td>
            <td class="px-4 py-3">${entry.temperature} °C</td>
            <td class="px-4 py-3">${entry.humidity} %</td>
          </tr>
        `
      )
      .join('');
  } catch (error) {
    historyTable.innerHTML = '<tr><td class="px-4 py-4 text-rose-300" colspan="3">Unable to load history.</td></tr>';
  }
}

async function loadThresholds() {
  try {
    const response = await fetch('/api/alerts/thresholds');
    const result = await response.json();

    if (!response.ok) {
      return;
    }

    const thresholds = result.data || {};
    thresholdForm.temperatureHigh.value = thresholds.temperatureHigh ?? '';
    thresholdForm.temperatureLow.value = thresholds.temperatureLow ?? '';
    thresholdForm.humidityHigh.value = thresholds.humidityHigh ?? '';
    thresholdForm.humidityLow.value = thresholds.humidityLow ?? '';
  } catch (error) {
    thresholdMessage.textContent = 'Could not load thresholds.';
  }
}

async function loadAlerts() {
  try {
    const response = await fetch('/api/alerts');
    const result = await response.json();
    renderAlerts(result.data || []);
  } catch (error) {
    alertsList.innerHTML = '<div class="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">Unable to load alerts.</div>';
  }
}

async function sendLcdMessage(event) {
  event.preventDefault();
  lcdMessage.textContent = 'Sending message...';

  const formData = new FormData(lcdForm);
  const payload = { message: formData.get('message') };

  try {
    const response = await fetch('/api/lcd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      lcdMessage.textContent = result.message || 'Unable to update LCD';
      return;
    }

    lcdMessage.textContent = `Message saved: ${result.data.message}`;
    lcdForm.reset();
  } catch (error) {
    lcdMessage.textContent = 'Network error. Please try again.';
  }
}

async function saveThresholds(event) {
  event.preventDefault();
  thresholdMessage.textContent = 'Saving...';

  const formData = new FormData(thresholdForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/alerts/thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      thresholdMessage.textContent = result.message || 'Unable to save thresholds';
      return;
    }

    thresholdMessage.textContent = 'Thresholds saved.';
  } catch (error) {
    thresholdMessage.textContent = 'Network error. Please try again.';
  }
}

async function logout() {
  try {
    await fetch('/api/auth/logout');
  } finally {
    window.location.href = '/login';
  }
}

refreshBtn.addEventListener('click', async () => {
  await Promise.all([loadLatest(), loadHistory(), loadAlerts()]);
});
lcdForm.addEventListener('submit', sendLcdMessage);
thresholdForm.addEventListener('submit', saveThresholds);
logoutBtn.addEventListener('click', logout);

if (window.io) {
  const socket = window.io();

  socket.on('connect', () => {
    socketStatus.textContent = 'Realtime updates: connected';
  });

  socket.on('disconnect', () => {
    socketStatus.textContent = 'Realtime updates: disconnected';
  });

  socket.on('sensor:update', async (reading) => {
    applyRealtimeReading(reading);
    await loadHistory();
  });

  socket.on('alert:update', async () => {
    thresholdMessage.textContent = 'New alert received.';
    await loadAlerts();
  });
} else {
  socketStatus.textContent = 'Realtime updates: unavailable';
}

loadSession();
loadLatest();
loadHistory();
loadThresholds();
loadAlerts();

setInterval(loadLatest, 5000);
setInterval(loadHistory, 10000);
