// background.js - Background Service Worker for JurnalMate AI
const ALARM_ABSENSI = 'daily_absensi_reminder';
const ALARM_JURNAL = 'weekly_journal_reminder';
const ALARM_LEGACY = 'daily_journal_reminder';

// Default configuration
const DEFAULT_CONFIG = {
  geminiApiKey: '',
  geminiModel: 'gemini-3.5-flash-lite',
  gowaPreset: 'fonnte',
  gowaBaseUrl: 'https://api.fonnte.com',
  gowaEndpoint: '/send',
  gowaPhone: '',
  gowaToken: '',
  gowaMethod: 'POST',
  gowaCustomHeaders: 'Content-Type: application/json',
  gowaCustomPayload: '{\n  "target": "{phone}",\n  "message": "{message}"\n}',

  // 1. Pengingat Absensi (Tiap Hari)
  absensiEnabled: true,
  absensiTime: '08:00',
  absensiDays: 'workdays', // 'workdays' | 'everyday'
  absensiTemplate: '⏰ *Halo {nama}!*\n\nJangan lupa lakukan *ABSENSI* hari ini ya!\n📅 {hari}, {tanggal}\n⏰ Jam: {jam}\n\nPastikan sudah absen tepat waktu. Semangat beraktivitas! 🌟',

  // 2. Pengingat Jurnal (Tiap Minggu)
  jurnalEnabled: true,
  jurnalDay: '5', // 5 = Jumat (0=Minggu, 1=Senin, ..., 5=Jumat, 6=Sabtu)
  jurnalTime: '16:00',
  jurnalTemplate: '🚨 *Halo {nama}!*\n\nSudah akhir pekan nih! Jangan lupa isi *JURNAL MINGGUAN* / Logbook PKL pekan ini ya!\n📅 {hari}, {tanggal}\n⏰ Jam: {jam}\n\nBuka ekstensi JurnalMate AI untuk generate 5 kolom STAR otomatis! Tetap semangat! 💪',

  // 3. Notifikasi Desktop Chrome
  chromeNotifyEnabled: true,

  // Legacy fallback compatibility
  reminderEnabled: true,
  reminderTime: '08:00',
  reminderDays: 'workdays',
  reminderTemplate: '⏰ *Halo {nama}!*\n\nJangan lupa lakukan *ABSENSI* hari ini ya!\n📅 {hari}, {tanggal}\n⏰ Jam: {jam}\n\nPastikan sudah absen tepat waktu! 🌟',

  userName: 'Boss',
  history: [],
  reminder_logs: []
};

// On installed, setup defaults if not existing
chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await chrome.storage.local.get(null);
  const newConfig = { ...DEFAULT_CONFIG, ...current };
  if (newConfig.absensiEnabled === undefined) {
    newConfig.absensiEnabled = newConfig.reminderEnabled !== undefined ? !!newConfig.reminderEnabled : true;
  }
  if (newConfig.jurnalEnabled === undefined) {
    newConfig.jurnalEnabled = true;
  }
  if (newConfig.chromeNotifyEnabled === undefined) {
    newConfig.chromeNotifyEnabled = true;
  }

  await chrome.storage.local.set(newConfig);
  await setupAllAlarms(newConfig);
  console.log('[JurnalMate AI] Service worker installed & initialized (Absensi Daily & Jurnal Weekly).');
});

// Ensure alarms are active when browser starts up
chrome.runtime.onStartup.addListener(async () => {
  const config = await chrome.storage.local.get(null);
  await setupAllAlarms(config);
});

// Format phone number to international 62 format
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('+62')) {
    cleaned = cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length >= 9) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

// Generate human readable date and time in Indonesian
function getFormattedDateTime() {
  const now = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const hari = days[now.getDay()];
  const tanggal = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const jam = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

  return { hari, tanggal, jam, dayIndex: now.getDay() };
}

// Format template string
function parseTemplate(template, config) {
  const { hari, tanggal, jam } = getFormattedDateTime();
  const userName = config.userName || 'Boss';

  return (template || '')
    .replace(/\{nama\}/gi, userName)
    .replace(/\{tanggal\}/gi, tanggal)
    .replace(/\{jam\}/gi, jam)
    .replace(/\{hari\}/gi, hari);
}

// Dispatch request to Go-WA Gateway
async function sendWhatsAppMessage(config, customMessage = null, reminderType = 'general') {
  const rawPhone = config.gowaPhone || '';
  const phone = cleanPhoneNumber(rawPhone);

  if (!phone) {
    throw new Error('Nomor WhatsApp tujuan belum diatur. Silakan isi di menu Pengaturan.');
  }

  // Choose template based on reminder type
  let templateToUse = config.reminderTemplate;
  if (reminderType === 'absensi') {
    templateToUse = config.absensiTemplate || config.reminderTemplate;
  } else if (reminderType === 'jurnal') {
    templateToUse = config.jurnalTemplate || config.reminderTemplate;
  }

  const messageText = customMessage || parseTemplate(templateToUse, config);
  const baseUrl = (config.gowaBaseUrl || 'https://api.fonnte.com').replace(/\/+$/, '');
  const preset = config.gowaPreset || 'fonnte';

  let targetUrl = '';
  let method = (config.gowaMethod || 'POST').toUpperCase();
  let headers = {};
  let bodyData = null;
  let useFormData = false;

  if (preset === 'fonnte') {
    const fonnteToken = (config.gowaToken && config.gowaToken.trim() !== '') ? config.gowaToken.trim() : '';

    if (!fonnteToken) {
      throw new Error('Token Fonnte belum diatur. Silakan isi token di menu Pengaturan.');
    }

    // Fonnte API: POST https://api.fonnte.com/send
    // Fonnte requires Authorization header with raw token (no Bearer prefix)
    // and multipart/form-data body (let browser set Content-Type with boundary)
    const endpoint = config.gowaEndpoint || '/send';
    targetUrl = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    headers['Authorization'] = fonnteToken;

    const formData = new FormData();
    formData.append('target', phone);
    formData.append('message', messageText);
    bodyData = formData;
    useFormData = true;
  } else if (preset === 'gowa-standard') {
    // aldinokpn / standard go-wa: POST /send/message with { phone, message }
    const endpoint = config.gowaEndpoint || '/send/message';
    targetUrl = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    headers['Content-Type'] = 'application/json';

    // Add Auth Token if available for non-Fonnte presets
    if (config.gowaToken && config.gowaToken.trim() !== '') {
      const token = config.gowaToken.trim();
      if (token.startsWith('Bearer ') || token.startsWith('Basic ')) {
        headers['Authorization'] = token;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    bodyData = JSON.stringify({
      phone: phone,
      message: messageText
    });
  } else if (preset === 'gowa-rest') {
    // Go-WA REST format: POST /send-text with { number, message }
    targetUrl = `${baseUrl}/send-text`;
    headers['Content-Type'] = 'application/json';

    if (config.gowaToken && config.gowaToken.trim() !== '') {
      const token = config.gowaToken.trim();
      if (token.startsWith('Bearer ') || token.startsWith('Basic ')) {
        headers['Authorization'] = token;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    bodyData = JSON.stringify({
      number: phone,
      message: messageText
    });
  } else if (preset === 'custom') {
    // Custom endpoint & template
    const endpoint = config.gowaEndpoint || '/send/message';
    targetUrl = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    method = (config.gowaMethod || 'POST').toUpperCase();

    headers['Content-Type'] = 'application/json';

    // Add Auth Token if available
    if (config.gowaToken && config.gowaToken.trim() !== '') {
      const token = config.gowaToken.trim();
      if (token.startsWith('Bearer ') || token.startsWith('Basic ')) {
        headers['Authorization'] = token;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Parse custom headers (can override defaults above)
    if (config.gowaCustomHeaders) {
      const lines = config.gowaCustomHeaders.split('\n');
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const k = parts[0].trim();
          const v = parts.slice(1).join(':').trim();
          if (k) headers[k] = v;
        }
      }
    }

    if (method === 'GET') {
      const urlObj = new URL(targetUrl);
      urlObj.searchParams.set('phone', phone);
      urlObj.searchParams.set('message', messageText);
      targetUrl = urlObj.toString();
      bodyData = null;
    } else {
      let rawPayload = config.gowaCustomPayload || '{\n  "target": "{phone}",\n  "message": "{message}"\n}';
      // Safely escape message for JSON string replacement
      const safeMessage = JSON.stringify(messageText).slice(1, -1);
      rawPayload = rawPayload
        .replace(/\{phone\}/g, phone)
        .replace(/\{message\}/g, safeMessage);
      bodyData = rawPayload;
    }
  }

  const startTime = Date.now();
  console.log(`[JurnalMate] ====== WA SEND DEBUG ======`);
  console.log(`[JurnalMate] URL: ${targetUrl}`);
  console.log(`[JurnalMate] Method: ${method}`);
  console.log(`[JurnalMate] Preset: ${preset}`);
  console.log(`[JurnalMate] Phone: ${phone}`);
  console.log(`[JurnalMate] Headers:`, JSON.stringify(headers));
  console.log(`[JurnalMate] Body type: ${bodyData instanceof FormData ? 'FormData' : typeof bodyData}`);

  let response;
  try {
    const fetchOptions = {
      method: method,
      headers: headers
    };
    if (bodyData && method !== 'GET') {
      fetchOptions.body = bodyData;
    }

    response = await fetch(targetUrl, fetchOptions);
    console.log(`[JurnalMate] Response status: ${response.status}`);
    console.log(`[JurnalMate] Response time: ${Date.now() - startTime}ms`);
  } catch (err) {
    const duration = Date.now() - startTime;
    const logItem = {
      timestamp: new Date().toISOString(),
      phone: phone,
      reminderType: reminderType,
      reminderTitle: reminderType === 'absensi' ? 'Absensi Harian' : (reminderType === 'jurnal' ? 'Jurnal Mingguan' : 'Pengingat WA'),
      status: 'error',
      statusCode: 0,
      durationMs: duration,
      error: `Koneksi gagal: ${err.message}. Periksa koneksi ke ${baseUrl}`
    };
    await recordReminderLog(logItem);
    throw new Error(logItem.error);
  }

  const duration = Date.now() - startTime;
  let responseText = '';
  try {
    responseText = await response.text();
  } catch (e) {
    responseText = '(no response body)';
  }

  console.log(`[JurnalMate] Response body: ${responseText.slice(0, 500)}`);

  let isSuccess = response.ok;
  let parsedJson = null;
  try {
    parsedJson = JSON.parse(responseText);
  } catch (e) {}

  // Fonnte sometimes returns HTTP 200 with { status: false, reason: "..." }
  if (preset === 'fonnte' && parsedJson && parsedJson.status === false) {
    isSuccess = false;
  }

  // Extract detail/reason from Fonnte response for logging
  let detail = '';
  if (parsedJson) {
    detail = parsedJson.reason || parsedJson.detail || parsedJson.message || '';
    if (typeof detail === 'object') detail = JSON.stringify(detail);
  }

  const logItem = {
    timestamp: new Date().toISOString(),
    phone: phone,
    reminderType: reminderType,
    reminderTitle: reminderType === 'absensi' ? 'Absensi Harian' : (reminderType === 'jurnal' ? 'Jurnal Mingguan' : 'Pengingat WA'),
    status: isSuccess ? 'success' : 'error',
    statusCode: response.status,
    durationMs: duration,
    responseSnippet: responseText.slice(0, 300),
    error: !isSuccess ? (detail || `HTTP ${response.status}`) : undefined,
    detail: detail || undefined
  };

  await recordReminderLog(logItem);

  if (!isSuccess) {
    if (preset === 'fonnte' && parsedJson && parsedJson.reason) {
      throw new Error(`Fonnte: ${parsedJson.reason}`);
    }
    throw new Error(`Server mengembalikan status ${response.status}: ${responseText.slice(0, 150)}`);
  }

  return {
    success: true,
    statusCode: response.status,
    durationMs: duration,
    response: responseText
  };
}

// Save log into storage
async function recordReminderLog(logItem) {
  try {
    const data = await chrome.storage.local.get('reminder_logs');
    let logs = Array.isArray(data.reminder_logs) ? data.reminder_logs : [];
    logs.unshift(logItem);
    if (logs.length > 30) logs = logs.slice(0, 30); // keep last 30 logs
    await chrome.storage.local.set({ reminder_logs: logs });
  } catch (e) {
    console.error('[JurnalMate AI] Failed saving log:', e);
  }
}

// ==========================================
// DESKTOP & IN-TAB CHROME NOTIFICATION SYSTEM
// ==========================================
async function triggerChromeNotification(type, config) {
  if (config.chromeNotifyEnabled === false) return;

  const { hari, tanggal, jam } = getFormattedDateTime();
  const nama = config.userName || 'Boss';
  let title = '';
  let message = '';
  let notifId = `jurnalmate_${type}_${Date.now()}`;

  if (type === 'absensi') {
    title = '⏰ Waktunya Absensi Hari Ini!';
    message = `Halo ${nama}, jangan lupa lakukan absensi hari ini (${hari}, ${tanggal} jam ${jam})!`;
  } else if (type === 'jurnal') {
    title = '📝 Waktunya Isi Jurnal Mingguan!';
    message = `Halo ${nama}, sudah akhir pekan! Yuk isi logbook/jurnal PKL pekan ini di JurnalMate.`;
  } else {
    title = '🔔 Pengingat JurnalMate AI';
    message = `Halo ${nama}, ada pengingat kegiatan hari ini (${hari}, ${tanggal} jam ${jam}).`;
  }

  // 1. Native OS Desktop Notification via Chrome
  try {
    if (chrome.notifications) {
      chrome.notifications.create(notifId, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: title,
        message: message,
        priority: 2,
        requireInteraction: true, // Remains on screen in Windows until clicked/dismissed!
        buttons: [
          { title: 'Buka JurnalMate' },
          { title: 'Tutup' }
        ]
      }, (createdId) => {
        if (chrome.runtime.lastError) {
          console.warn('[JurnalMate] chrome.notifications error:', chrome.runtime.lastError);
        } else {
          console.log('[JurnalMate] 🔔 Chrome desktop notification shown:', createdId);
        }
      });
    }
  } catch (e) {
    console.warn('[JurnalMate] Failed to show chrome notification:', e);
  }

  // 2. In-Page Floating Toast Banner on all open webpage tabs
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'SHOW_NOTIFICATION_TOAST',
          title: title,
          message: message,
          isSuccess: true
        }).catch(() => {});
      }
    }
  } catch (e) {}
}

// Notification Click Listeners
if (chrome.notifications && chrome.notifications.onClicked) {
  chrome.notifications.onClicked.addListener((notifId) => {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  });

  chrome.notifications.onButtonClicked.addListener((notifId, buttonIndex) => {
    if (buttonIndex === 0) {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    }
  });
}

// ==========================================
// SCHEDULING LOGIC (ABSENSI DAILY & JURNAL WEEKLY)
// ==========================================

// Calculate target timestamp for Absensi (daily)
function getNextAbsensiTarget(timeStr, daysMode) {
  if (!timeStr) return null;
  const [targetH, targetM] = timeStr.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(targetH, targetM, 0, 0);

  // If user sets time to the CURRENT minute (testing mode), trigger in 3 seconds!
  if (now.getHours() === targetH && now.getMinutes() === targetM) {
    console.log(`[JurnalMate AI] Absensi target matches current minute (${timeStr}), scheduling test trigger in 3s.`);
    return new Date(Date.now() + 3000);
  }

  // If target time has already passed today, advance to next day
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  // If workdays only, ensure next target falls on Mon-Fri
  if (daysMode === 'workdays') {
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

// Calculate target timestamp for Jurnal (weekly)
function getNextJurnalWeeklyTarget(targetDayOfWeek, timeStr) {
  if (!timeStr) return null;
  const [targetH, targetM] = timeStr.split(':').map(Number);
  const targetDay = parseInt(targetDayOfWeek ?? '5', 10); // Default 5 = Friday
  const now = new Date();

  // Test mode: if today is targetDay and current hour & minute match, trigger in 3s!
  if (now.getDay() === targetDay && now.getHours() === targetH && now.getMinutes() === targetM) {
    console.log(`[JurnalMate AI] Jurnal target matches current day & minute (${targetDay} @ ${timeStr}), scheduling test trigger in 3s.`);
    return new Date(Date.now() + 3000);
  }

  const next = new Date();
  next.setHours(targetH, targetM, 0, 0);

  let dayDiff = (targetDay - now.getDay() + 7) % 7;
  if (dayDiff === 0 && next.getTime() <= now.getTime()) {
    dayDiff = 7; // Target is today but hour passed, schedule for next week
  }
  next.setDate(now.getDate() + dayDiff);

  return next;
}

// Setup Absensi Daily Alarm
async function setupAbsensiAlarm(config) {
  try {
    await chrome.alarms.clear(ALARM_ABSENSI);
    if (!config.absensiEnabled || !config.absensiTime) {
      console.log('[JurnalMate AI] Absensi alarm disabled.');
      return;
    }

    const nextTarget = getNextAbsensiTarget(config.absensiTime, config.absensiDays || 'workdays');
    if (!nextTarget) return;

    chrome.alarms.create(ALARM_ABSENSI, {
      when: nextTarget.getTime()
    });

    const diffSec = Math.max(1, Math.round((nextTarget.getTime() - Date.now()) / 1000));
    console.log(`[JurnalMate AI] ⏰ Alarm Absensi scheduled for: ${nextTarget.toLocaleString('id-ID')} (in ${diffSec}s)`);
  } catch (err) {
    console.error('[JurnalMate AI] Error setting up Absensi alarm:', err);
  }
}

// Setup Jurnal Weekly Alarm
async function setupJurnalAlarm(config) {
  try {
    await chrome.alarms.clear(ALARM_JURNAL);
    if (!config.jurnalEnabled || !config.jurnalTime) {
      console.log('[JurnalMate AI] Jurnal weekly alarm disabled.');
      return;
    }

    const nextTarget = getNextJurnalWeeklyTarget(config.jurnalDay || '5', config.jurnalTime);
    if (!nextTarget) return;

    chrome.alarms.create(ALARM_JURNAL, {
      when: nextTarget.getTime()
    });

    const diffSec = Math.max(1, Math.round((nextTarget.getTime() - Date.now()) / 1000));
    console.log(`[JurnalMate AI] 📝 Alarm Jurnal Mingguan scheduled for: ${nextTarget.toLocaleString('id-ID')} (in ${diffSec}s)`);
  } catch (err) {
    console.error('[JurnalMate AI] Error setting up Jurnal alarm:', err);
  }
}

// Setup both alarms
async function setupAllAlarms(config) {
  await setupAbsensiAlarm(config);
  await setupJurnalAlarm(config);
}

// Schedule daily alarm (Legacy compatibility)
async function setupDailyAlarm(timeStr) {
  const config = await chrome.storage.local.get(null);
  config.absensiTime = timeStr;
  await setupAllAlarms(config);
}

// ==========================================
// ALARM EVENT DISPATCHER
// ==========================================
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const triggerTime = new Date().toLocaleTimeString('id-ID');
  console.log(`[JurnalMate AI] 🔔 Alarm fired: [${alarm.name}] at ${triggerTime}!`);
  const config = await chrome.storage.local.get(null);

  // 1. ABSENSI HARIAN ALARM
  if (alarm.name === ALARM_ABSENSI || alarm.name === ALARM_LEGACY) {
    // Re-schedule next daily absensi alarm
    await setupAbsensiAlarm(config);

    const isAbsensiEnabled = config.absensiEnabled !== undefined ? !!config.absensiEnabled : (config.reminderEnabled !== undefined ? !!config.reminderEnabled : true);
    if (isAbsensiEnabled) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (config.absensiDays === 'workdays' && isWeekend) {
        console.log('[JurnalMate AI] Skipping weekend absensi (mode: workdays only).');
      } else {
        // Always trigger Chrome desktop notification & in-page toast!
        await triggerChromeNotification('absensi', config);

        // Send WhatsApp if configured
        try {
          await sendWhatsAppMessage(config, null, 'absensi');
        } catch (error) {
          console.error('[JurnalMate AI] Absensi WA dispatch error:', error);
        }
      }
    }
    return;
  }

  // 2. JURNAL MINGGUAN ALARM
  if (alarm.name === ALARM_JURNAL) {
    // Re-schedule next weekly jurnal alarm
    await setupJurnalAlarm(config);

    const isJurnalEnabled = config.jurnalEnabled !== undefined ? !!config.jurnalEnabled : true;
    if (isJurnalEnabled) {
      // Always trigger Chrome desktop notification & in-page toast!
      await triggerChromeNotification('jurnal', config);

      // Send WhatsApp if configured
      try {
        await sendWhatsAppMessage(config, null, 'jurnal');
      } catch (error) {
        console.error('[JurnalMate AI] Jurnal WA dispatch error:', error);
      }
    }
    return;
  }
});

// ==========================================
// RUNTIME MESSAGE HANDLERS
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Manual WhatsApp dispatch
  if (request.action === 'SEND_MANUAL_WA') {
    (async () => {
      try {
        const config = await chrome.storage.local.get(null);
        const result = await sendWhatsAppMessage(config, request.customMessage, request.reminderType || 'general');
        sendResponse({ success: true, result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // Test Chrome Desktop Notification
  if (request.action === 'TEST_CHROME_NOTIFICATION') {
    (async () => {
      try {
        const config = await chrome.storage.local.get(null);
        await triggerChromeNotification(request.reminderType || 'absensi', config);
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // Update all alarms
  if (request.action === 'UPDATE_ALL_ALARMS' || request.action === 'UPDATE_ALARM') {
    (async () => {
      try {
        const config = await chrome.storage.local.get(null);
        await setupAllAlarms(config);
        const absensiAlarm = await chrome.alarms.get(ALARM_ABSENSI);
        const jurnalAlarm = await chrome.alarms.get(ALARM_JURNAL);
        sendResponse({ success: true, absensiAlarm, jurnalAlarm, alarm: absensiAlarm || jurnalAlarm });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // Get info for all alarms
  if (request.action === 'GET_ALL_ALARMS_INFO' || request.action === 'GET_ALARM_INFO') {
    (async () => {
      const absensiAlarm = await chrome.alarms.get(ALARM_ABSENSI);
      const jurnalAlarm = await chrome.alarms.get(ALARM_JURNAL);
      sendResponse({ absensiAlarm, jurnalAlarm, alarm: absensiAlarm || jurnalAlarm });
    })();
    return true;
  }
});
