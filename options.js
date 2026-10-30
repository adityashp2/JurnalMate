// options.js - Logic for JurnalMate Settings Page

document.addEventListener('DOMContentLoaded', async () => {
  const cfgGeminiKey = document.getElementById('cfg-gemini-key');
  const btnToggleKey = document.getElementById('btn-toggle-key-visibility');
  const cfgGeminiModel = document.getElementById('cfg-gemini-model');
  const btnTestGemini = document.getElementById('btn-test-gemini');
  const spinnerTestGemini = document.getElementById('spinner-test-gemini');

  const cfgGowaPreset = document.getElementById('cfg-gowa-preset');
  const cfgGowaBaseUrl = document.getElementById('cfg-gowa-baseurl');
  const cfgGowaEndpoint = document.getElementById('cfg-gowa-endpoint');
  const cfgGowaPhone = document.getElementById('cfg-gowa-phone');
  const cfgUserName = document.getElementById('cfg-user-name');
  const cfgGowaToken = document.getElementById('cfg-gowa-token');
  const lblGowaToken = document.getElementById('lbl-gowa-token');
  const boxCustomGowa = document.getElementById('box-custom-gowa');
  const cfgGowaMethod = document.getElementById('cfg-gowa-method');
  const cfgGowaPayload = document.getElementById('cfg-gowa-payload');
  const btnTestGowa = document.getElementById('btn-test-gowa');
  const spinnerTestGowa = document.getElementById('spinner-test-gowa');

  const btnTestChromeNotif = document.getElementById('btn-test-chrome-notif');
  const cfgAbsensiEnabled = document.getElementById('cfg-absensi-enabled');
  const cfgAbsensiTime = document.getElementById('cfg-absensi-time');
  const cfgAbsensiDays = document.getElementById('cfg-absensi-days');
  const cfgAbsensiTemplate = document.getElementById('cfg-absensi-template');

  const cfgJurnalEnabled = document.getElementById('cfg-jurnal-enabled');
  const cfgJurnalDay = document.getElementById('cfg-jurnal-day');
  const cfgJurnalTime = document.getElementById('cfg-jurnal-time');
  const cfgJurnalTemplate = document.getElementById('cfg-jurnal-template');

  const btnSaveAllSettings = document.getElementById('btn-save-all-settings');
  const toast = document.getElementById('options-toast');

  const DEFAULT_ABSENSI_TMPL = '🔔 *Pengingat Absensi Harian*\nHalo {nama}, jangan lupa lakukan absensi hari ini ({hari}, {tanggal}). Jam sekarang: {jam}. Tetap semangat!';
  const DEFAULT_JURNAL_TMPL = '📝 *Pengingat Jurnal Mingguan*\nHalo {nama}, hari ini ({hari}, {tanggal}) saatnya mengisi laporan jurnal logbook PKL mingguan STAR. Silakan buka web dan lengkapi logbook Anda!';

  let appConfig = {};

  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  async function loadSettings() {
    appConfig = await chrome.storage.local.get(null);

    cfgGeminiKey.value = appConfig.geminiApiKey || '';
    cfgGeminiModel.value = appConfig.geminiModel || 'gemini-3.5-flash-lite';
    cfgGowaPreset.value = appConfig.gowaPreset || 'fonnte';
    cfgGowaBaseUrl.value = appConfig.gowaBaseUrl || 'https://api.fonnte.com';
    cfgGowaEndpoint.value = appConfig.gowaEndpoint || '/send';
    cfgGowaPhone.value = appConfig.gowaPhone || '';
    cfgUserName.value = appConfig.userName || 'Boss';
    cfgGowaToken.value = appConfig.gowaToken || '';
    cfgGowaMethod.value = appConfig.gowaMethod || 'POST';
    cfgGowaPayload.value = appConfig.gowaCustomPayload || '{\n  "target": "{phone}",\n  "message": "{message}"\n}';

    cfgAbsensiEnabled.checked = appConfig.absensiEnabled !== undefined ? !!appConfig.absensiEnabled : (appConfig.reminderEnabled !== undefined ? !!appConfig.reminderEnabled : true);
    cfgAbsensiTime.value = appConfig.absensiTime || appConfig.reminderTime || '08:00';
    cfgAbsensiDays.value = appConfig.absensiDays || appConfig.reminderDays || 'workdays';
    cfgAbsensiTemplate.value = appConfig.absensiTemplate || appConfig.reminderTemplate || DEFAULT_ABSENSI_TMPL;

    cfgJurnalEnabled.checked = appConfig.jurnalEnabled !== undefined ? !!appConfig.jurnalEnabled : true;
    cfgJurnalDay.value = appConfig.jurnalDay || '5';
    cfgJurnalTime.value = appConfig.jurnalTime || '16:00';
    cfgJurnalTemplate.value = appConfig.jurnalTemplate || DEFAULT_JURNAL_TMPL;

    toggleCustomBox(cfgGowaPreset.value);
  }

  function toggleCustomBox(preset) {
    if (preset === 'custom') {
      boxCustomGowa.classList.remove('hidden');
      if (lblGowaToken) lblGowaToken.textContent = 'API Key / Auth Header (Opsional)';
    } else {
      boxCustomGowa.classList.add('hidden');
      if (preset === 'fonnte') {
        cfgGowaBaseUrl.value = 'https://api.fonnte.com';
        cfgGowaEndpoint.value = '/send';
        if (lblGowaToken) lblGowaToken.textContent = 'Token Fonnte (Wajib)';
        cfgGowaToken.placeholder = 'Tempel token perangkat Fonnte di sini...';
      } else if (preset === 'gowa-standard') {
        cfgGowaBaseUrl.value = 'http://localhost:8000';
        cfgGowaEndpoint.value = '/send/message';
        if (lblGowaToken) lblGowaToken.textContent = 'API Token (Opsional)';
        cfgGowaToken.placeholder = 'Kosongkan jika Go-WA tanpa password';
      } else if (preset === 'gowa-rest') {
        cfgGowaBaseUrl.value = 'http://localhost:8000';
        cfgGowaEndpoint.value = '/send-text';
        if (lblGowaToken) lblGowaToken.textContent = 'API Token (Opsional)';
        cfgGowaToken.placeholder = 'Kosongkan jika Go-WA tanpa password';
      }
    }
  }

  cfgGowaPreset.addEventListener('change', () => {
    toggleCustomBox(cfgGowaPreset.value);
  });

  btnToggleKey.addEventListener('click', () => {
    if (cfgGeminiKey.type === 'password') {
      cfgGeminiKey.type = 'text';
      btnToggleKey.textContent = '🔒';
    } else {
      cfgGeminiKey.type = 'password';
      btnToggleKey.textContent = '👁️';
    }
  });

  // Test Gemini
  btnTestGemini.addEventListener('click', async () => {
    const key = cfgGeminiKey.value.trim();
    if (!key) {
      showToast('Masukkan API Key terlebih dahulu!', true);
      return;
    }

    btnTestGemini.disabled = true;
    spinnerTestGemini.classList.remove('hidden');

    try {
      const model = cfgGeminiModel.value;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Tes koneksi Gemini. Balas "OK"' }] }]
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || res.statusText);
      }

      showToast('✅ Koneksi Google Gemini API Berhasil!');
    } catch (err) {
      showToast(`❌ Tes gagal: ${err.message}`, true);
    } finally {
      btnTestGemini.disabled = false;
      spinnerTestGemini.classList.add('hidden');
    }
  });

  // Test WhatsApp
  btnTestGowa.addEventListener('click', async () => {
    btnTestGowa.disabled = true;
    spinnerTestGowa.classList.remove('hidden');

    try {
      await saveFormSettings(false);
      const res = await chrome.runtime.sendMessage({
        action: 'SEND_MANUAL_WA',
        customMessage: '🔔 *Tes Koneksi JurnalMate* - Sambungan WhatsApp berhasil terhubung!'
      });

      if (res && res.success) {
        showToast('✅ Berhasil! Pesan tes telah dikirim ke nomor WhatsApp Anda.');
      } else {
        throw new Error(res?.error || 'Tidak ada respon dari server WhatsApp');
      }
    } catch (err) {
      showToast(`❌ Gagal: ${err.message}`, true);
    } finally {
      btnTestGowa.disabled = false;
      spinnerTestGowa.classList.add('hidden');
    }
  });

  // Test Chrome Desktop Notification
  if (btnTestChromeNotif) {
    btnTestChromeNotif.addEventListener('click', async () => {
      try {
        btnTestChromeNotif.disabled = true;
        await chrome.runtime.sendMessage({
          action: 'TEST_CHROME_NOTIFICATION',
          reminderType: 'absensi'
        });
        showToast('🔔 Notifikasi desktop Chrome berhasil dimunculkan!');
      } catch (err) {
        showToast(`❌ Gagal: ${err.message}`, true);
      } finally {
        btnTestChromeNotif.disabled = false;
      }
    });
  }

  // Save Settings
  btnSaveAllSettings.addEventListener('click', async () => {
    await saveFormSettings(true);
  });

  async function saveFormSettings(showToastNotification = true) {
    const updatedConfig = {
      geminiApiKey: cfgGeminiKey.value.trim(),
      geminiModel: cfgGeminiModel.value,
      gowaPreset: cfgGowaPreset.value,
      gowaBaseUrl: cfgGowaBaseUrl.value.trim(),
      gowaEndpoint: cfgGowaEndpoint.value.trim(),
      gowaPhone: cfgGowaPhone.value.trim(),
      userName: cfgUserName.value.trim() || 'Boss',
      gowaToken: cfgGowaToken.value.trim(),
      gowaMethod: cfgGowaMethod.value,
      gowaCustomPayload: cfgGowaPayload.value,

      // Absensi Harian
      absensiEnabled: cfgAbsensiEnabled.checked,
      absensiTime: cfgAbsensiTime.value,
      absensiDays: cfgAbsensiDays.value,
      absensiTemplate: cfgAbsensiTemplate.value,

      // Jurnal Mingguan
      jurnalEnabled: cfgJurnalEnabled.checked,
      jurnalDay: cfgJurnalDay.value,
      jurnalTime: cfgJurnalTime.value,
      jurnalTemplate: cfgJurnalTemplate.value,

      // Fallback backwards-compatibility fields
      reminderEnabled: cfgAbsensiEnabled.checked,
      reminderTime: cfgAbsensiTime.value,
      reminderDays: cfgAbsensiDays.value,
      reminderTemplate: cfgAbsensiTemplate.value
    };

    await chrome.storage.local.set(updatedConfig);
    await chrome.runtime.sendMessage({ action: 'UPDATE_ALL_ALARMS' });

    if (showToastNotification) {
      showToast('💾 Pengaturan berhasil disimpan!');
    }
  }

  await loadSettings();
});
