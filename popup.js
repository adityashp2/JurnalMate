// popup.js - Controller for JurnalMate AI Chrome Extension Popup

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements - Navigation & Toast
  const tabs = document.querySelectorAll('.nav-segment');
  const panes = document.querySelectorAll('.tab-pane');
  const popupToast = document.getElementById('popup-toast');

  // Header Status Chips & Actions
  const statusChipGemini = document.getElementById('status-chip-gemini');
  const statusChipAlarm = document.getElementById('status-chip-alarm');
  const lblStatusWa = document.getElementById('lbl-status-wa');
  const noticeNoKey = document.getElementById('notice-no-key');
  const btnGotoSettings = document.getElementById('btn-goto-settings');
  const btnOpenOptions = document.getElementById('btn-open-options');

  // Tab 1 Elements: Jurnal AI
  const selCategory = document.getElementById('journal-category');
  const selStyle = document.getElementById('journal-style');
  const colPekan = document.getElementById('col-pekan');
  const colStyle = document.getElementById('col-style');
  const inputPekan = document.getElementById('journal-pekan');
  const txtNotes = document.getElementById('journal-notes');
  const btnGenerateAi = document.getElementById('btn-generate-ai');
  const btnGenerateText = document.getElementById('btn-generate-text');
  const spinnerGenerate = document.getElementById('spinner-generate');

  // Result Section Elements
  const draftTitle = document.getElementById('draft-title');
  const starPillsBar = document.getElementById('star-pills-bar');
  const starPills = document.querySelectorAll('.star-pill');
  const starFieldDesc = document.getElementById('star-field-desc');
  const txtOutput = document.getElementById('journal-output');
  const wordCount = document.getElementById('word-count');
  const charCount = document.getElementById('char-count');

  // Actions
  const btnCopyResult = document.getElementById('btn-copy-result');
  const btnCopyText = document.getElementById('btn-copy-text');
  const btnAutofillWeb = document.getElementById('btn-autofill-web');
  const btnAutofillText = document.getElementById('btn-autofill-text');
  const btnPickWeb = document.getElementById('btn-pick-web');
  const btnSaveDraft = document.getElementById('btn-save-draft');

  // Tab 2 Elements: Pengingat & Notifikasi (Absensi & Jurnal)
  const txtWaTargetDisplay = document.getElementById('txt-wa-target-display');
  const btnTestChromeNotif = document.getElementById('btn-test-chrome-notif');

  // Absensi (Daily) Elements
  const cfgAbsensiEnabled = document.getElementById('cfg-absensi-enabled');
  const cfgAbsensiTime = document.getElementById('cfg-absensi-time');
  const cfgAbsensiDays = document.getElementById('cfg-absensi-days');
  const txtAbsensiCountdown = document.getElementById('txt-absensi-countdown');
  const btnTriggerAbsensiNow = document.getElementById('btn-trigger-absensi-now');
  const spinnerAbsensiManual = document.getElementById('spinner-absensi-manual');

  // Jurnal (Weekly) Elements
  const cfgJurnalEnabled = document.getElementById('cfg-jurnal-enabled');
  const cfgJurnalDay = document.getElementById('cfg-jurnal-day');
  const cfgJurnalTime = document.getElementById('cfg-jurnal-time');
  const txtJurnalCountdown = document.getElementById('txt-jurnal-countdown');
  const btnTriggerJurnalNow = document.getElementById('btn-trigger-jurnal-now');
  const spinnerJurnalManual = document.getElementById('spinner-jurnal-manual');

  // Template Elements
  const selTemplateType = document.getElementById('sel-template-type');
  const txtReminderTemplate = document.getElementById('reminder-template');
  const btnSaveTemplate = document.getElementById('btn-save-template');
  const tagChips = document.querySelectorAll('.chip-btn');
  const waLogsList = document.getElementById('wa-logs-list');
  const btnClearLogs = document.getElementById('btn-clear-logs');

  // Tab 3 Elements: Riwayat
  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // App State
  let appConfig = {};

  // STAR Multi-Column State
  let starData = {
    situation: '',
    task: '',
    action: '',
    result: '',
    komentar: ''
  };
  let activeSection = 'situation'; // 'situation' | 'task' | 'action' | 'result' | 'komentar' | 'all'

  const STAR_DESCS = {
    situation: 'Silahkan ceritakan situasi yang terjadi dengan detail selama kegiatan PKL pekan ini.',
    task: 'Silakan ceritakan tugas dan tanggung jawab yang dilakukan pada kegiatan PKL pekan ini.',
    action: 'Silakan ceritakan aksi yang dilakukan untuk menyelesaikan tugas dan tanggung jawab kegiatan PKL pekan ini.',
    result: 'Silakan ceritakan hasil yang didapatkan setelah melakukan aksi kegiatan PKL pekan ini.',
    komentar: 'Silahkan ceritakan tantangan-hambatan, solusi dan tindak lanjut pada kegiatan PKL pekan ini.',
    all: 'Tampilan lengkap gabungan seluruh kolom logbook STAR (Pekan, Situasi, Tugas, Aksi, Hasil, Komentar).'
  };

  // Show Toast Inside Popup
  function showToast(message, isError = false) {
    if (!popupToast) return;
    popupToast.textContent = message;
    popupToast.className = `toast-popup ${isError ? 'error' : ''}`;
    popupToast.classList.remove('hidden');

    setTimeout(() => {
      popupToast.classList.add('hidden');
    }, 2800);
  }

  // Open Chrome Extension Options Page
  function openOptions() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  }

  if (btnGotoSettings) {
    btnGotoSettings.addEventListener('click', openOptions);
  }

  if (btnOpenOptions) {
    btnOpenOptions.addEventListener('click', openOptions);
  }

  // Helper: Compile all STAR sections into formatted readable text
  function compileAllStarText(data, pekan) {
    const parts = [];
    if (pekan) parts.push(`Pekan Ke: ${pekan}`);
    if (data.situation) parts.push(`[Situation (Situasi)]\n${data.situation}`);
    if (data.task) parts.push(`[Task (Tugas)]\n${data.task}`);
    if (data.action) parts.push(`[Action (Aksi)]\n${data.action}`);
    if (data.result) parts.push(`[Result (Hasil)]\n${data.result}`);
    if (data.komentar) parts.push(`[Komentar / Tantangan & Solusi]\n${data.komentar}`);
    return parts.join('\n\n');
  }

  // Load Section Content into Textarea Output
  function loadSectionToOutput(section) {
    if (!txtOutput) return;

    if (section === 'all') {
      txtOutput.value = compileAllStarText(starData, inputPekan ? inputPekan.value : '');
    } else {
      txtOutput.value = starData[section] || '';
    }

    if (starFieldDesc) {
      starFieldDesc.textContent = STAR_DESCS[section] || '';
    }

    if (btnCopyText) {
      btnCopyText.textContent = section === 'all' ? 'Salin Semua' : 'Salin Kolom';
    }

    updateWordAndCharCount();
    updatePillFilledStatus();
  }

  function updatePillFilledStatus() {
    starPills.forEach(pill => {
      const sec = pill.dataset.section;
      if (sec === 'all') return;
      if (starData[sec] && starData[sec].trim().length > 0) {
        pill.classList.add('filled');
      } else {
        pill.classList.remove('filled');
      }
    });
  }

  // Update Category / Mode (STAR vs 1-Kolom)
  function updateCategoryMode() {
    const isStar = selCategory.value === 'star';
    if (isStar) {
      if (colPekan) colPekan.classList.remove('hidden');
      if (colStyle) colStyle.classList.add('hidden');
      if (starPillsBar) starPillsBar.classList.remove('hidden');
      if (starFieldDesc) starFieldDesc.classList.remove('hidden');
      if (draftTitle) draftTitle.textContent = 'Draft Logbook STAR (5 Kolom)';
      if (btnAutofillText) btnAutofillText.textContent = 'Isi 5 Kolom ke Web';
      if (btnGenerateText) btnGenerateText.textContent = 'Generate 5 Kolom STAR dengan AI';
      loadSectionToOutput(activeSection);
    } else {
      if (colPekan) colPekan.classList.add('hidden');
      if (colStyle) colStyle.classList.remove('hidden');
      if (starPillsBar) starPillsBar.classList.add('hidden');
      if (starFieldDesc) starFieldDesc.classList.add('hidden');
      if (draftTitle) draftTitle.textContent = 'Draft Jurnal';
      if (btnAutofillText) btnAutofillText.textContent = 'Isi Otomatis ke Web';
      if (btnGenerateText) btnGenerateText.textContent = 'Generate Jurnal dengan AI';
      if (btnCopyText) btnCopyText.textContent = 'Salin';
      updateWordAndCharCount();
    }
  }

  selCategory.addEventListener('change', updateCategoryMode);

  // STAR Pills Navigation
  starPills.forEach(pill => {
    pill.addEventListener('click', () => {
      // Save current edited text to active section if not 'all'
      if (activeSection !== 'all') {
        starData[activeSection] = txtOutput.value;
      }

      starPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      activeSection = pill.dataset.section;
      loadSectionToOutput(activeSection);
    });
  });

  // Track text updates in real time
  txtOutput.addEventListener('input', () => {
    if (selCategory.value === 'star' && activeSection !== 'all') {
      starData[activeSection] = txtOutput.value;
      updatePillFilledStatus();
    }
    updateWordAndCharCount();
  });

  // Load and populate view state
  async function loadSettings() {
    appConfig = await chrome.storage.local.get(null);

    // Default template strings
    const DEFAULT_ABSENSI_TMPL = '⏰ *Halo {nama}!*\n\nJangan lupa lakukan *ABSENSI* hari ini ya!\n📅 {hari}, {tanggal}\n⏰ Jam: {jam}\n\nPastikan sudah absen tepat waktu. Semangat beraktivitas! 🌟';
    const DEFAULT_JURNAL_TMPL = '🚨 *Halo {nama}!*\n\nSudah akhir pekan nih! Jangan lupa isi *JURNAL MINGGUAN* / Logbook PKL pekan ini ya!\n📅 {hari}, {tanggal}\n⏰ Jam: {jam}\n\nBuka ekstensi JurnalMate AI untuk generate 5 kolom STAR otomatis! Tetap semangat! 💪';

    if (!appConfig.absensiTemplate) {
      appConfig.absensiTemplate = DEFAULT_ABSENSI_TMPL;
    }
    if (!appConfig.jurnalTemplate) {
      appConfig.jurnalTemplate = DEFAULT_JURNAL_TMPL;
    }

    updateTemplateField();

    // Absensi Harian inputs
    if (cfgAbsensiEnabled) cfgAbsensiEnabled.checked = appConfig.absensiEnabled !== undefined ? !!appConfig.absensiEnabled : true;
    if (cfgAbsensiTime) cfgAbsensiTime.value = appConfig.absensiTime || '08:00';
    if (cfgAbsensiDays) cfgAbsensiDays.value = appConfig.absensiDays || 'workdays';

    // Jurnal Mingguan inputs
    if (cfgJurnalEnabled) cfgJurnalEnabled.checked = appConfig.jurnalEnabled !== undefined ? !!appConfig.jurnalEnabled : true;
    if (cfgJurnalDay) cfgJurnalDay.value = appConfig.jurnalDay !== undefined ? String(appConfig.jurnalDay) : '5';
    if (cfgJurnalTime) cfgJurnalTime.value = appConfig.jurnalTime || '16:00';

    updateStatusIndicators();
    await renderWaInfo();
    renderWaLogs();
    renderHistory();
    updateCategoryMode();
  }

  function updateTemplateField() {
    if (!txtReminderTemplate || !selTemplateType) return;
    const type = selTemplateType.value;
    if (type === 'absensi') {
      txtReminderTemplate.value = appConfig.absensiTemplate || '';
    } else {
      txtReminderTemplate.value = appConfig.jurnalTemplate || '';
    }
  }

  if (selTemplateType) {
    selTemplateType.addEventListener('change', updateTemplateField);
  }

  // Save Schedule Settings (Absensi & Jurnal) in Real-time
  async function saveScheduleSettings() {
    const absensiEnabled = cfgAbsensiEnabled ? cfgAbsensiEnabled.checked : true;
    const absensiTime = cfgAbsensiTime ? cfgAbsensiTime.value || '08:00' : '08:00';
    const absensiDays = cfgAbsensiDays ? cfgAbsensiDays.value || 'workdays' : 'workdays';

    const jurnalEnabled = cfgJurnalEnabled ? cfgJurnalEnabled.checked : true;
    const jurnalDay = cfgJurnalDay ? cfgJurnalDay.value || '5' : '5';
    const jurnalTime = cfgJurnalTime ? cfgJurnalTime.value || '16:00' : '16:00';

    const updated = {
      absensiEnabled,
      absensiTime,
      absensiDays,
      jurnalEnabled,
      jurnalDay,
      jurnalTime,
      reminderEnabled: absensiEnabled,
      reminderTime: absensiTime,
      reminderDays: absensiDays
    };

    await chrome.storage.local.set(updated);
    Object.assign(appConfig, updated);

    await chrome.runtime.sendMessage({ action: 'UPDATE_ALL_ALARMS' });
    updateStatusIndicators();
    await renderWaInfo();
    showToast('💾 Jadwal Absensi & Jurnal diperbarui!');
  }

  // Absensi change listeners
  if (cfgAbsensiEnabled) cfgAbsensiEnabled.addEventListener('change', saveScheduleSettings);
  if (cfgAbsensiTime) {
    cfgAbsensiTime.addEventListener('change', saveScheduleSettings);
    cfgAbsensiTime.addEventListener('input', saveScheduleSettings);
  }
  if (cfgAbsensiDays) cfgAbsensiDays.addEventListener('change', saveScheduleSettings);

  // Jurnal change listeners
  if (cfgJurnalEnabled) cfgJurnalEnabled.addEventListener('change', saveScheduleSettings);
  if (cfgJurnalDay) cfgJurnalDay.addEventListener('change', saveScheduleSettings);
  if (cfgJurnalTime) {
    cfgJurnalTime.addEventListener('change', saveScheduleSettings);
    cfgJurnalTime.addEventListener('input', saveScheduleSettings);
  }

  // Listen for storage changes from Options page
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      loadSettings();
    }
  });

  // Update Status Indicators
  function updateStatusIndicators() {
    const hasKey = appConfig.geminiApiKey && appConfig.geminiApiKey.trim().length > 10;
    if (statusChipGemini) {
      if (hasKey) {
        statusChipGemini.className = 'status-indicator online';
        statusChipGemini.title = `Gemini API Siap (${appConfig.geminiModel || 'gemini-3.5-flash-lite'})`;
      } else {
        statusChipGemini.className = 'status-indicator error';
        statusChipGemini.title = 'API Key Gemini Belum Diisi';
      }
    }

    if (noticeNoKey) {
      if (hasKey) {
        noticeNoKey.classList.add('hidden');
      } else {
        noticeNoKey.classList.remove('hidden');
      }
    }

    const presetName = appConfig.gowaPreset === 'fonnte' ? 'Fonnte' : 'WA';
    if (lblStatusWa) {
      lblStatusWa.textContent = presetName;
    }

    const isAnyActive = appConfig.absensiEnabled || appConfig.jurnalEnabled;
    if (statusChipAlarm) {
      if (isAnyActive) {
        statusChipAlarm.className = 'status-indicator online';
        statusChipAlarm.title = `Alarm Aktif (Absensi: ${appConfig.absensiTime || '08:00'} | Jurnal: ${appConfig.jurnalTime || '16:00'})`;
      } else {
        statusChipAlarm.className = 'status-indicator';
        statusChipAlarm.title = 'Pengingat Nonaktif';
      }
    }
  }

  // Render WA tab overview with live alarm countdowns
  async function renderWaInfo() {
    if (txtWaTargetDisplay) {
      const phone = appConfig.gowaPhone;
      const provider = appConfig.gowaPreset === 'fonnte' ? 'Fonnte' : 'Go-WA';
      if (phone) {
        txtWaTargetDisplay.textContent = `Tujuan: +${phone.replace(/[^0-9]/g, '')} (${appConfig.userName || 'Boss'}) • ${provider}`;
      } else {
        txtWaTargetDisplay.textContent = `Tujuan: Belum diatur • ${provider}`;
      }
    }

    try {
      const resp = await chrome.runtime.sendMessage({ action: 'GET_ALL_ALARMS_INFO' });
      const now = Date.now();

      // Render Absensi Countdown
      if (txtAbsensiCountdown) {
        if (!appConfig.absensiEnabled) {
          txtAbsensiCountdown.innerHTML = '<span style="color: #94a3b8;">Pengingat absensi harian sedang dinonaktifkan.</span>';
        } else if (resp && resp.absensiAlarm && resp.absensiAlarm.scheduledTime) {
          const diffMs = resp.absensiAlarm.scheduledTime - now;
          const targetDate = new Date(resp.absensiAlarm.scheduledTime);
          const timeStr = targetDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const isToday = targetDate.toDateString() === new Date().toDateString();
          const dayLabel = isToday ? 'Hari ini' : (new Date(now + 86400000).toDateString() === targetDate.toDateString() ? 'Besok' : targetDate.toLocaleDateString('id-ID', { weekday: 'long' }));

          if (diffMs > 0) {
            const diffMin = Math.ceil(diffMs / 60000);
            if (diffMin <= 1) {
              const diffSec = Math.max(1, Math.ceil(diffMs / 1000));
              txtAbsensiCountdown.innerHTML = `⚡ <span style="color: #10b981; font-weight: 600;">Alarm siap: ${dayLabel} ${timeStr} WIB (dalam ~${diffSec} detik)</span>`;
            } else {
              txtAbsensiCountdown.innerHTML = `🕒 <span style="color: #38bdf8; font-weight: 600;">Jadwal berikutnya: ${dayLabel} ${timeStr} WIB (dalam ~${diffMin} menit)</span>`;
            }
          } else {
            txtAbsensiCountdown.innerHTML = `⏰ Jadwal aktif: ${dayLabel} ${timeStr} WIB`;
          }
        } else {
          txtAbsensiCountdown.textContent = `⏰ Aktif jam ${appConfig.absensiTime || '08:00'} WIB (${appConfig.absensiDays === 'workdays' ? 'Senin - Jumat' : 'Setiap Hari'}).`;
        }
      }

      // Render Jurnal Countdown
      if (txtJurnalCountdown) {
        if (!appConfig.jurnalEnabled) {
          txtJurnalCountdown.innerHTML = '<span style="color: #94a3b8;">Pengingat jurnal mingguan sedang dinonaktifkan.</span>';
        } else if (resp && resp.jurnalAlarm && resp.jurnalAlarm.scheduledTime) {
          const diffMs = resp.jurnalAlarm.scheduledTime - now;
          const targetDate = new Date(resp.jurnalAlarm.scheduledTime);
          const timeStr = targetDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const isToday = targetDate.toDateString() === new Date().toDateString();
          const dayLabel = isToday ? 'Hari ini' : (new Date(now + 86400000).toDateString() === targetDate.toDateString() ? 'Besok' : targetDate.toLocaleDateString('id-ID', { weekday: 'long' }));

          if (diffMs > 0) {
            const diffMin = Math.ceil(diffMs / 60000);
            if (diffMin <= 1) {
              const diffSec = Math.max(1, Math.ceil(diffMs / 1000));
              txtJurnalCountdown.innerHTML = `⚡ <span style="color: #10b981; font-weight: 600;">Alarm siap: ${dayLabel} ${timeStr} WIB (dalam ~${diffSec} detik)</span>`;
            } else if (diffMin <= 120) {
              txtJurnalCountdown.innerHTML = `🕒 <span style="color: #38bdf8; font-weight: 600;">Jadwal berikutnya: ${dayLabel} ${timeStr} WIB (dalam ~${diffMin} menit)</span>`;
            } else {
              const diffHours = Math.round(diffMin / 60);
              txtJurnalCountdown.innerHTML = `📅 <span style="color: #a78bfa; font-weight: 600;">Jadwal berikutnya: ${dayLabel} ${timeStr} WIB (~${diffHours} jam lagi)</span>`;
            }
          } else {
            txtJurnalCountdown.innerHTML = `📝 Jadwal aktif: ${dayLabel} ${timeStr} WIB`;
          }
        } else {
          txtJurnalCountdown.textContent = `📝 Aktif mingguan jam ${appConfig.jurnalTime || '16:00'} WIB.`;
        }
      }
    } catch (e) {
      console.warn('Error fetching alarm info:', e);
    }
  }

  // Render WA delivery logs
  function renderWaLogs() {
    if (!waLogsList) return;

    const logs = appConfig.reminder_logs || [];
    if (logs.length === 0) {
      waLogsList.innerHTML = '<div class="empty-state-sm">Belum ada catatan aktivitas pengiriman.</div>';
      return;
    }

    waLogsList.innerHTML = logs.map(item => {
      const isSuccess = item.status === 'success';
      const timeStr = new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const titleTag = item.reminderTitle ? `[${item.reminderTitle}] ` : '';
      return `
        <div class="log-item ${isSuccess ? '' : 'error'}">
          <div>
            <div class="log-title">${isSuccess ? '✅ Terkirim ke' : '❌ Gagal kirim ke'} +${item.phone}</div>
            <div class="text-muted-sm" style="margin: 0;">${titleTag}${isSuccess ? `HTTP ${item.statusCode} (${item.durationMs}ms)` : (item.error || 'Request Error')}${item.detail ? ` — ${item.detail}` : ''}</div>
          </div>
          <div class="log-time">${dateStr} ${timeStr}</div>
        </div>
      `;
    }).join('');
  }

  // Render Journal History
  function renderHistory() {
    if (!historyList) return;

    const history = appConfig.history || [];
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div class="empty-title">Belum Ada Draft Tersimpan</div>
          <div class="empty-desc">Jurnal yang berhasil dibuat akan otomatis tersimpan di sini.</div>
        </div>
      `;
      return;
    }

    historyList.innerHTML = history.map((item, idx) => {
      const dateStr = new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="history-card" data-idx="${idx}">
          <div class="history-meta">
            <span class="history-badge">${item.category || 'Jurnal'}</span>
            <span>${dateStr}</span>
          </div>
          <div class="history-text">${escapeHtml(item.content)}</div>
          <div class="history-actions">
            <button class="btn btn-secondary btn-sm btn-reuse-history" data-idx="${idx}" title="Muat ke editor">Gunakan</button>
            <button class="btn btn-ghost btn-sm btn-copy-history" data-idx="${idx}" title="Salin teks">Salin</button>
            <button class="btn btn-ghost btn-sm btn-delete-history" data-idx="${idx}" title="Hapus">Hapus</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach History Click Handlers
    historyList.querySelectorAll('.btn-reuse-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.dataset.idx;
        const item = appConfig.history[idx];
        if (item) {
          if (item.isStar && item.starData) {
            starData = { ...item.starData };
            selCategory.value = 'star';
            if (inputPekan && item.pekan) inputPekan.value = item.pekan;
            updateCategoryMode();
            activeSection = 'situation';
            starPills.forEach(p => {
              if (p.dataset.section === 'situation') p.classList.add('active');
              else p.classList.remove('active');
            });
            loadSectionToOutput('situation');
          } else {
            selCategory.value = 'kantor';
            updateCategoryMode();
            txtOutput.value = item.content;
            updateWordAndCharCount();
          }
          switchTab('tab-journal');
          showToast('Draft logbook dimuat ke editor!');
        }
      });
    });

    historyList.querySelectorAll('.btn-copy-history').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = e.currentTarget.dataset.idx;
        const item = appConfig.history[idx];
        if (item) {
          await navigator.clipboard.writeText(item.content);
          showToast('📋 Logbook disalin ke clipboard!');
        }
      });
    });

    historyList.querySelectorAll('.btn-delete-history').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        appConfig.history.splice(idx, 1);
        await chrome.storage.local.set({ history: appConfig.history });
        renderHistory();
        showToast('Item riwayat dihapus.');
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
  }

  // Word and Char Count Tracker
  function updateWordAndCharCount() {
    if (!txtOutput || !wordCount || !charCount) return;
    const text = txtOutput.value.trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).length : 0;
    wordCount.textContent = `${words} kata`;
    charCount.textContent = `${chars} karakter`;
  }

  // Switch Tab Helper
  function switchTab(targetTabId) {
    tabs.forEach(btn => {
      if (btn.dataset.tab === targetTabId) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    panes.forEach(pane => {
      if (pane.id === targetTabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    if (targetTabId === 'tab-history') {
      renderWaLogs();
      renderHistory();
    }
  }

  // Tab Navigation Listeners
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Tag chip click to insert variable into template
  tagChips.forEach(chip => {
    chip.addEventListener('click', () => {
      if (!txtReminderTemplate) return;
      const variable = chip.dataset.var;
      const start = txtReminderTemplate.selectionStart || txtReminderTemplate.value.length;
      const end = txtReminderTemplate.selectionEnd || txtReminderTemplate.value.length;
      const text = txtReminderTemplate.value;
      txtReminderTemplate.value = text.substring(0, start) + variable + text.substring(end);
      txtReminderTemplate.focus();
      txtReminderTemplate.selectionStart = txtReminderTemplate.selectionEnd = start + variable.length;
    });
  });

  // Save Reminder Template
  if (btnSaveTemplate) {
    btnSaveTemplate.addEventListener('click', async () => {
      const type = selTemplateType ? selTemplateType.value : 'absensi';
      const newTemplate = txtReminderTemplate.value;
      if (type === 'jurnal') {
        await chrome.storage.local.set({ jurnalTemplate: newTemplate });
        appConfig.jurnalTemplate = newTemplate;
        showToast('✅ Template Pesan Jurnal Mingguan disimpan!');
      } else {
        await chrome.storage.local.set({ absensiTemplate: newTemplate, reminderTemplate: newTemplate });
        appConfig.absensiTemplate = newTemplate;
        appConfig.reminderTemplate = newTemplate;
        showToast('✅ Template Pesan Absensi Harian disimpan!');
      }
    });
  }

  // Clear Logs
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', async () => {
      await chrome.storage.local.set({ reminder_logs: [] });
      appConfig.reminder_logs = [];
      renderWaLogs();
      showToast('Riwayat pengiriman WA dibersihkan.');
    });
  }

  // Clear History
  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', async () => {
      if (confirm('Yakin ingin menghapus seluruh riwayat draft jurnal?')) {
        await chrome.storage.local.set({ history: [] });
        appConfig.history = [];
        renderHistory();
        showToast('Seluruh riwayat jurnal telah dihapus.');
      }
    });
  }

  // Save to Draft History manually
  if (btnSaveDraft) {
    btnSaveDraft.addEventListener('click', async () => {
      const isStar = selCategory.value === 'star';
      let contentToSave = '';
      let categoryText = '';

      if (isStar) {
        if (activeSection !== 'all') {
          starData[activeSection] = txtOutput.value;
        }
        contentToSave = compileAllStarText(starData, inputPekan ? inputPekan.value : '9');
        categoryText = `PKL STAR (Pekan ${inputPekan ? inputPekan.value : '9'})`;
      } else {
        contentToSave = txtOutput.value.trim();
        categoryText = selCategory.options[selCategory.selectedIndex].text.split(' ')[0] || 'Jurnal';
      }

      if (!contentToSave.trim()) {
        showToast('Tidak ada teks jurnal untuk disimpan.', true);
        return;
      }

      const newItem = {
        timestamp: new Date().toISOString(),
        category: categoryText,
        content: contentToSave,
        isStar: isStar,
        starData: isStar ? { ...starData } : null,
        pekan: isStar && inputPekan ? inputPekan.value : null
      };

      let history = appConfig.history || [];
      history.unshift(newItem);
      if (history.length > 50) history = history.slice(0, 50);

      await chrome.storage.local.set({ history });
      appConfig.history = history;
      renderHistory();
      showToast('💾 Jurnal berhasil disimpan ke Riwayat!');
    });
  }

  // Copy Result Text
  if (btnCopyResult) {
    btnCopyResult.addEventListener('click', async () => {
      const isStar = selCategory.value === 'star';
      let textToCopy = txtOutput.value.trim();

      if (isStar && activeSection !== 'all') {
        starData[activeSection] = txtOutput.value;
      }

      if (!textToCopy) {
        showToast('Teks masih kosong.', true);
        return;
      }

      await navigator.clipboard.writeText(textToCopy);
      showToast(isStar && activeSection !== 'all' ? `📋 Kolom ${activeSection.toUpperCase()} disalin!` : '📋 Teks logbook disalin ke clipboard!');
    });
  }

  // Auto-Fill Web Page
  if (btnAutofillWeb) {
    btnAutofillWeb.addEventListener('click', async () => {
      const isStar = selCategory.value === 'star';

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          showToast('Tidak dapat mendeteksi tab web aktif.', true);
          return;
        }

        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
          showToast('Tidak dapat mengisi di halaman sistem browser.', true);
          return;
        }

        if (isStar) {
          if (activeSection !== 'all') {
            starData[activeSection] = txtOutput.value;
          }

          const hasContent = Object.values(starData).some(v => v && v.trim().length > 0);
          if (!hasContent) {
            showToast('Generate logbook STAR terlebih dahulu sebelum auto-fill.', true);
            return;
          }

          chrome.tabs.sendMessage(tab.id, {
            action: 'AUTO_FILL_MULTI',
            data: {
              pekan: inputPekan ? inputPekan.value : '9',
              situation: starData.situation,
              task: starData.task,
              action: starData.action,
              result: starData.result,
              komentar: starData.komentar
            }
          }, (response) => {
            if (chrome.runtime.lastError) {
              showToast(`Gagal: ${chrome.runtime.lastError.message}. Refresh tab web target.`, true);
              return;
            }
            if (response && response.success) {
              showToast(`⚡ Berhasil mengisi ${response.count || 5} kolom logbook ke web!`);
            } else {
              showToast('Kolom tidak cocok otomatis. Coba tombol "Pilih Kolom Web".', true);
            }
          });
        } else {
          // Single-column mode
          const text = txtOutput.value.trim();
          if (!text) {
            showToast('Generate atau tulis teks jurnal terlebih dahulu.', true);
            return;
          }

          chrome.tabs.sendMessage(tab.id, { action: 'AUTO_FILL', text }, (response) => {
            if (chrome.runtime.lastError) {
              showToast(`Gagal: ${chrome.runtime.lastError.message}. Coba refresh web.`, true);
              return;
            }
            if (response && response.success) {
              showToast('⚡ Berhasil disuntikkan ke kolom web!');
            } else {
              showToast('Kolom tidak ditemukan. Coba tombol "Pilih Kolom".', true);
            }
          });
        }
      } catch (err) {
        showToast(`Error: ${err.message}`, true);
      }
    });
  }

  // Pick Element on Web Page
  if (btnPickWeb) {
    btnPickWeb.addEventListener('click', async () => {
      const text = txtOutput.value.trim();
      if (!text) {
        showToast('Teks jurnal masih kosong.', true);
        return;
      }

      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) {
          showToast('Tidak dapat mendeteksi tab aktif.', true);
          return;
        }

        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
          showToast('Tidak dapat memilih di halaman internal browser.', true);
          return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'START_PICKER', text }, (response) => {
          if (chrome.runtime.lastError) {
            showToast(`Gagal: ${chrome.runtime.lastError.message}. Refresh tab target.`, true);
            return;
          }
          window.close();
        });
      } catch (err) {
        showToast(`Error: ${err.message}`, true);
      }
    });
  }

  // AI Generation with Gemini
  if (btnGenerateAi) {
    btnGenerateAi.addEventListener('click', async () => {
      const apiKey = appConfig.geminiApiKey?.trim();
      if (!apiKey) {
        showToast('Silakan isi Gemini API Key di Pengaturan!', true);
        setTimeout(openOptions, 1200);
        return;
      }

      const notes = txtNotes.value.trim();
      if (!notes) {
        showToast('Masukkan poin kegiatan pekan ini terlebih dahulu.', true);
        txtNotes.focus();
        return;
      }

      const isStar = selCategory.value === 'star';
      const category = selCategory.value;
      const style = selStyle ? selStyle.value : 'formal';
      const model = appConfig.geminiModel || 'gemini-3.5-flash-lite';
      const pekanVal = inputPekan ? inputPekan.value : '9';

      btnGenerateAi.disabled = true;
      spinnerGenerate.classList.remove('hidden');
      btnGenerateText.textContent = isStar ? 'Menyusun 5 Kolom STAR...' : 'Menyusun Jurnal dengan AI...';

      try {
        if (isStar) {
          const generatedStar = await callGeminiStarApi(apiKey, model, notes, pekanVal);
          starData = generatedStar;
          activeSection = 'situation';

          // Reset pill active state
          starPills.forEach(p => {
            if (p.dataset.section === 'situation') p.classList.add('active');
            else p.classList.remove('active');
          });

          loadSectionToOutput('situation');

          // Automatically save to history
          const fullContent = compileAllStarText(starData, pekanVal);
          const historyItem = {
            timestamp: new Date().toISOString(),
            category: `PKL STAR (Pekan ${pekanVal})`,
            content: fullContent,
            isStar: true,
            starData: { ...starData },
            pekan: pekanVal
          };
          let history = appConfig.history || [];
          history.unshift(historyItem);
          if (history.length > 50) history = history.slice(0, 50);
          await chrome.storage.local.set({ history });
          appConfig.history = history;
          renderHistory();

          showToast('✨ 5 Kolom STAR berhasil disusun!');
        } else {
          // Single-column narrative generation
          const generatedJournal = await callGeminiSingleApi(apiKey, model, category, style, notes);
          txtOutput.value = generatedJournal;
          updateWordAndCharCount();

          const categoryText = selCategory.options[selCategory.selectedIndex].text.split(' ')[0] || 'Jurnal';
          const historyItem = {
            timestamp: new Date().toISOString(),
            category: categoryText,
            content: generatedJournal,
            isStar: false
          };
          let history = appConfig.history || [];
          history.unshift(historyItem);
          if (history.length > 50) history = history.slice(0, 50);
          await chrome.storage.local.set({ history });
          appConfig.history = history;
          renderHistory();

          showToast('✨ Jurnal berhasil dibuat oleh AI!');
        }
      } catch (err) {
        console.error('[JurnalMate AI] Generation error:', err);
        showToast(`Gagal membuat jurnal: ${err.message}`, true);
      } finally {
        btnGenerateAi.disabled = false;
        spinnerGenerate.classList.add('hidden');
        btnGenerateText.textContent = isStar ? 'Generate 5 Kolom STAR dengan AI' : 'Generate Jurnal dengan AI';
      }
    });
  }

  // Call Gemini for Multi-Column STAR Logbook
  async function callGeminiStarApi(apiKey, model, notes, pekan) {
    const todayDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const fullPrompt = `
Anda adalah asisten AI profesional untuk pembuatan Logbook Praktik Kerja Lapangan (PKL) / Magang mahasiswa di Indonesia.
Format penulisan logbook WAJIB menggunakan metode STAR (Situation, Task, Action, Result) ditambah Komentar/Refleksi mingguan.

Pekan Ke: ${pekan || '9'}
Hari/Tanggal: ${todayDate}
Poin Kegiatan Kasar dari Mahasiswa:
"""
${notes}
"""

Instruksi Khusus:
Susun logbook kegiatan menjadi 5 bagian yang terpisah, detail, formal (bahasa Indonesia baku EYD), dan siap dimasukkan ke formulir PKL:
1. situation: Ceritakan situasi, konteks operasional, dan lingkungan kerja PKL pekan ini secara komprehensif.
2. task: Ceritakan rincian tugas dan tanggung jawab spesifik yang diamanatkan pembimbing lapangan.
3. action: Ceritakan aksi dan langkah nyata teknis/prosedural yang dilakukan untuk menuntaskan penugasan.
4. result: Ceritakan hasil konkrit, efisiensi, dan dampak positif yang tercapai setelah aksi dijalankan.
5. komentar: Ceritakan tantangan/kendala teknis yang dihadapi, solusi pemecahan yang diterapkan, serta tindak lanjut atau rencana kerja pekan depan.

FORMAT OUTPUT WAJIB: KEMBALIKAN HANYA JSON VALID MURNI TANPA MARKDOWN FENCE DAN TANPA PENJELASAN LAIN:
{
  "situation": "...",
  "task": "...",
  "action": "...",
  "result": "...",
  "komentar": "..."
}
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.65,
          topK: 40,
          topP: 0.95
        }
      })
    });

    if (!response.ok) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson.error?.message || response.statusText;
      } catch (e) {
        errDetail = response.statusText;
      }
      throw new Error(`Gemini API Error (${response.status}): ${errDetail}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const textPart = parts
      .filter(p => typeof p.text === 'string')
      .map(p => p.text)
      .join('\n');

    if (!textPart || !textPart.trim()) {
      throw new Error('AI tidak mengembalikan respon teks.');
    }

    return parseStarResponse(textPart.trim());
  }

  function parseStarResponse(raw) {
    let clean = raw.trim();
    const startIdx = clean.indexOf('{');
    const endIdx = clean.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      clean = clean.slice(startIdx, endIdx + 1);
    }

    // Try JSON parsing
    try {
      const json = JSON.parse(clean);
      return {
        situation: json.situation || json.situasi || '',
        task: json.task || json.tugas || '',
        action: json.action || json.aksi || '',
        result: json.result || json.hasil || '',
        komentar: json.komentar || json.refleksi || json.tantangan || ''
      };
    } catch (e) {
      console.warn('JSON parse error in parseStarResponse:', e);
    }

    // Fallback regex extractor if JSON parse failed
    function extractBetween(text, startPattern, endPattern) {
      const regex = new RegExp(`(?:${startPattern})[:\\s]*([\\s\\S]*?)(?=(?:${endPattern})|$)`, 'i');
      const match = text.match(regex);
      return match ? match[1].replace(/^[":\s]+|[",\s]+$/g, '').trim() : '';
    }

    return {
      situation: extractBetween(clean, 'situation|situasi', 'task|tugas') || clean,
      task: extractBetween(clean, 'task|tugas', 'action|aksi'),
      action: extractBetween(clean, 'action|aksi', 'result|hasil'),
      result: extractBetween(clean, 'result|hasil', 'komentar|tantangan'),
      komentar: extractBetween(clean, 'komentar|tantangan', '$$$')
    };
  }

  // Construct Prompt and Call Gemini API for Single-Column mode
  async function callGeminiSingleApi(apiKey, model, category, style, notes) {
    let systemRole = 'Anda adalah asisten AI profesional pembuat jurnal dan logbook kegiatan harian di Indonesia.';

    if (category === 'asn') {
      systemRole += ' Fokus pada pelaporan kinerja pegawai negeri (ASN/PNS/PPPK) sesuai SKP dan tupoksi kedinasan yang formal, akuntabel, dan rapi.';
    } else if (category === 'tech') {
      systemRole += ' Fokus pada daily standup / worklog software engineering (fitur, bug fixing, code review, tech stack, progress).';
    } else {
      systemRole += ' Gunakan tata bahasa profesional, sopan, dan jelas untuk lingkungan perkantoran.';
    }

    let styleInstruction = '';
    if (style === 'formal') {
      styleInstruction = 'Tuliskan dalam 1-2 paragraf narasi formal yang terstruktur, menggunakan bahasa baku (EYD) yang rapi dan mengalir.';
    } else if (style === 'terstruktur') {
      styleInstruction = 'Tuliskan dalam bentuk poin-poin terstruktur dengan pola: [Aktivitas/Tindakan] - [Hasil/Output yang Dicapai]. Sertakan status pengerjaan yang jelas.';
    } else if (style === 'ringkas') {
      styleInstruction = 'Tuliskan secara sangat ringkas dan padat dalam 2-3 kalimat langsung pada inti pekerjaan tanpa basa-basi.';
    }

    const todayDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const fullPrompt = `
${systemRole}

Hari/Tanggal: ${todayDate}
Gaya Penulisan: ${styleInstruction}

Poin Kegiatan Kasar dari Pengguna:
"""
${notes}
"""

Instruksi Tambahan:
- Langsung berikan hasil teks jurnal siap pakai tanpa intro seperti "Tentu, ini hasil jurnalnya:" atau penutup basa-basi.
- Jangan gunakan markdown heading besar (# atau ##).
- Pastikan kalimat profesional, jelas, dan siap langsung diisikan ke kolom formulir jurnal/e-kinerja.
`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95
        }
      })
    });

    if (!response.ok) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson.error?.message || response.statusText;
      } catch (e) {
        errDetail = response.statusText;
      }
      throw new Error(`Gemini API Error (${response.status}): ${errDetail}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const textPart = parts
      .filter(p => typeof p.text === 'string')
      .map(p => p.text)
      .join('\n');

    if (!textPart || !textPart.trim()) {
      throw new Error('AI tidak mengembalikan respon teks.');
    }

    return textPart.trim();
  }

  // Test Desktop Chrome Notification
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
        showToast(`Gagal: ${err.message}`, true);
      } finally {
        btnTestChromeNotif.disabled = false;
      }
    });
  }

  // Instant Trigger Absensi Reminder (Desktop Notif + WhatsApp)
  if (btnTriggerAbsensiNow) {
    btnTriggerAbsensiNow.addEventListener('click', async () => {
      const isFonnte = (appConfig.gowaPreset || 'fonnte') === 'fonnte';
      const hasToken = appConfig.gowaToken && appConfig.gowaToken.trim().length > 0;

      btnTriggerAbsensiNow.disabled = true;
      if (spinnerAbsensiManual) spinnerAbsensiManual.classList.remove('hidden');

      try {
        // Trigger Chrome Desktop Notification first
        await chrome.runtime.sendMessage({
          action: 'TEST_CHROME_NOTIFICATION',
          reminderType: 'absensi'
        });

        // Send WhatsApp Reminder
        if (isFonnte && !hasToken) {
          showToast('🔔 Notif Chrome aktif! (WA dilewati: token belum diatur)', false);
        } else {
          const response = await chrome.runtime.sendMessage({
            action: 'SEND_MANUAL_WA',
            reminderType: 'absensi',
            customMessage: null
          });

          if (response && response.success) {
            showToast('🚀 Notifikasi Chrome & Pesan WA Absensi terkirim!');
          } else {
            showToast(`Notif Chrome muncul. WA: ${response?.error || 'Gagal kirim'}`, true);
          }
        }
      } catch (err) {
        showToast(`Error: ${err.message}`, true);
      } finally {
        btnTriggerAbsensiNow.disabled = false;
        if (spinnerAbsensiManual) spinnerAbsensiManual.classList.add('hidden');

        // Reload logs
        const updated = await chrome.storage.local.get('reminder_logs');
        appConfig.reminder_logs = updated.reminder_logs || [];
        renderWaLogs();
      }
    });
  }

  // Instant Trigger Jurnal Reminder (Desktop Notif + WhatsApp)
  if (btnTriggerJurnalNow) {
    btnTriggerJurnalNow.addEventListener('click', async () => {
      const isFonnte = (appConfig.gowaPreset || 'fonnte') === 'fonnte';
      const hasToken = appConfig.gowaToken && appConfig.gowaToken.trim().length > 0;

      btnTriggerJurnalNow.disabled = true;
      if (spinnerJurnalManual) spinnerJurnalManual.classList.remove('hidden');

      try {
        // Trigger Chrome Desktop Notification first
        await chrome.runtime.sendMessage({
          action: 'TEST_CHROME_NOTIFICATION',
          reminderType: 'jurnal'
        });

        // Send WhatsApp Reminder
        if (isFonnte && !hasToken) {
          showToast('📝 Notif Chrome aktif! (WA dilewati: token belum diatur)', false);
        } else {
          const response = await chrome.runtime.sendMessage({
            action: 'SEND_MANUAL_WA',
            reminderType: 'jurnal',
            customMessage: null
          });

          if (response && response.success) {
            showToast('🚀 Notifikasi Chrome & Pesan WA Jurnal terkirim!');
          } else {
            showToast(`Notif Chrome muncul. WA: ${response?.error || 'Gagal kirim'}`, true);
          }
        }
      } catch (err) {
        showToast(`Error: ${err.message}`, true);
      } finally {
        btnTriggerJurnalNow.disabled = false;
        if (spinnerJurnalManual) spinnerJurnalManual.classList.add('hidden');

        // Reload logs
        const updated = await chrome.storage.local.get('reminder_logs');
        appConfig.reminder_logs = updated.reminder_logs || [];
        renderWaLogs();
      }
    });
  }

  // Initial Load
  await loadSettings();
});
