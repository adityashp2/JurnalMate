// content.js - In-page auto-fill and element picker script for JurnalMate AI

let isPickerActive = false;
let currentHoveredElement = null;
let pendingTextToFill = '';

// Smart keywords for journal fields in Indonesian and English
const JOURNAL_KEYWORDS = [
  'jurnal', 'kegiatan', 'uraian', 'deskripsi', 'catatan',
  'pekerjaan', 'aktivitas', 'logbook', 'laporan', 'tugas',
  'kinerja', 'hasil', 'daily', 'notes', 'summary', 'activity',
  'description', 'task', 'journal', 'content', 'isi'
];

// Show sleek in-page floating toast
function showToast(title, desc = '', isSuccess = true) {
  let container = document.getElementById('jurnalmate-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'jurnalmate-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'jurnalmate-toast';
  toast.style.borderLeftColor = isSuccess ? '#10b981' : '#ef4444';
  toast.innerHTML = `
    <div class="jurnalmate-toast-icon">${isSuccess ? '✅' : '⚠️'}</div>
    <div>
      <div class="jurnalmate-toast-title" style="color: ${isSuccess ? '#34d399' : '#f87171'}">${title}</div>
      ${desc ? `<div class="jurnalmate-toast-desc">${desc}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Safely set element value handling React/Vue/Angular synthetic value trackers
function injectValueToElement(element, text) {
  if (!element) return false;

  element.focus();

  // If contenteditable div
  if (element.isContentEditable) {
    element.innerText = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    triggerSuccessVisual(element);
    return true;
  }

  // Determine prototype setter (for React 16+ which overrides .value)
  let prototype = Object.getPrototypeOf(element);
  let valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (valueSetter) {
    valueSetter.call(element, text);
  } else {
    element.value = text;
  }

  // Trigger standard events so frontends detect state change
  element.dispatchEvent(new Event('focus', { bubbles: true }));
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));

  triggerSuccessVisual(element);
  return true;
}

// Highlight element when filled
function triggerSuccessVisual(element) {
  element.classList.add('jurnalmate-fill-flash');
  setTimeout(() => {
    element.classList.remove('jurnalmate-fill-flash');
  }, 1600);
}

// Check if an element is an editable input/textarea
function isEditableField(el) {
  if (!el || el === document.body || el === document.documentElement) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return true;
  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return ['text', 'search', 'url', ''].includes(type);
  }
  if (el.isContentEditable) return true;
  return false;
}

// Score elements to find best journal field candidate
function scoreElement(el) {
  let score = 0;
  const tag = el.tagName.toLowerCase();

  // Textarea gets higher priority for journal
  if (tag === 'textarea') score += 50;
  if (el.isContentEditable) score += 30;

  // Visible area
  const rect = el.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    score += Math.min(30, Math.floor((rect.width * rect.height) / 1000));
  } else {
    return -999; // hidden element
  }

  // Attributes search
  const textProps = [
    el.id || '',
    el.name || '',
    el.placeholder || '',
    el.getAttribute('aria-label') || '',
    el.className || ''
  ].join(' ').toLowerCase();

  for (const kw of JOURNAL_KEYWORDS) {
    if (textProps.includes(kw)) {
      score += 40;
    }
  }

  return score;
}

// Auto find best candidate element
function findBestField() {
  // If activeElement is valid, prioritize it
  if (isEditableField(document.activeElement)) {
    return document.activeElement;
  }

  const candidates = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type]), [contenteditable="true"]'));
  if (candidates.length === 0) return null;

  let bestEl = null;
  let maxScore = -1;

  for (const el of candidates) {
    const s = scoreElement(el);
    if (s > maxScore) {
      maxScore = s;
      bestEl = el;
    }
  }

  return bestEl;
}

// Start visual element picker
function startElementPicker(textToFill) {
  if (isPickerActive) stopElementPicker();
  isPickerActive = true;
  pendingTextToFill = textToFill;

  // Create top banner
  const banner = document.createElement('div');
  banner.id = 'jurnalmate-picker-banner';
  banner.innerHTML = `
    <div>🎯 <span>Mode Pemilih Kolom:</span> Klik kolom form yang ingin diisi jurnal</div>
    <button id="jurnalmate-picker-cancel">Batal (ESC)</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('jurnalmate-picker-cancel').addEventListener('click', stopElementPicker);

  // Add listeners
  document.addEventListener('mouseover', onPickerMouseOver, true);
  document.addEventListener('mouseout', onPickerMouseOut, true);
  document.addEventListener('click', onPickerClick, true);
  document.addEventListener('keydown', onPickerKeyDown, true);
}

function stopElementPicker() {
  if (!isPickerActive) return;
  isPickerActive = false;
  pendingTextToFill = '';

  if (currentHoveredElement) {
    currentHoveredElement.classList.remove('jurnalmate-target-hover');
    currentHoveredElement = null;
  }

  const banner = document.getElementById('jurnalmate-picker-banner');
  if (banner) banner.remove();

  document.removeEventListener('mouseover', onPickerMouseOver, true);
  document.removeEventListener('mouseout', onPickerMouseOut, true);
  document.removeEventListener('click', onPickerClick, true);
  document.removeEventListener('keydown', onPickerKeyDown, true);
}

function onPickerMouseOver(e) {
  if (!isPickerActive) return;
  const target = e.target;
  if (isEditableField(target)) {
    if (currentHoveredElement && currentHoveredElement !== target) {
      currentHoveredElement.classList.remove('jurnalmate-target-hover');
    }
    currentHoveredElement = target;
    target.classList.add('jurnalmate-target-hover');
  }
}

function onPickerMouseOut(e) {
  if (!isPickerActive) return;
  const target = e.target;
  if (target === currentHoveredElement) {
    target.classList.remove('jurnalmate-target-hover');
    currentHoveredElement = null;
  }
}

function onPickerClick(e) {
  if (!isPickerActive) return;

  // Ignore clicks on banner itself
  if (e.target.closest('#jurnalmate-picker-banner')) return;

  const target = e.target.closest('textarea, input, [contenteditable="true"]') || e.target;
  if (isEditableField(target)) {
    e.preventDefault();
    e.stopPropagation();

    injectValueToElement(target, pendingTextToFill);
    showToast('Jurnal Berhasil Diisi! ✨', 'Teks jurnal telah dimasukkan ke kolom pilihan Anda.');
    stopElementPicker();
  }
}

function onPickerKeyDown(e) {
  if (e.key === 'Escape') {
    stopElementPicker();
    showToast('Pemilihan Dibatalkan', 'Mode pemilih kolom ditutup.', false);
  }
}

// Specifications for PKL / STAR multi-column matching
const STAR_SPECS = [
  {
    key: 'situation',
    name: 'Situasi',
    isTextarea: true,
    keywords: ['situation', 'situasi', 'kondisi', 'latar belakang', 'lingkungan', 'ceritakan situasi']
  },
  {
    key: 'task',
    name: 'Tugas',
    isTextarea: true,
    keywords: ['task', 'tugas', 'tanggung jawab', 'penugasan', 'sasaran', 'ceritakan tugas']
  },
  {
    key: 'action',
    name: 'Aksi',
    isTextarea: true,
    keywords: ['action', 'aksi', 'tindakan', 'pelaksanaan', 'implementasi', 'langkah', 'ceritakan aksi']
  },
  {
    key: 'result',
    name: 'Hasil',
    isTextarea: true,
    keywords: ['result', 'hasil', 'capaian', 'output', 'dampak', 'pencapaian', 'ceritakan hasil']
  },
  {
    key: 'komentar',
    name: 'Komentar',
    isTextarea: true,
    keywords: ['komentar', 'tantangan', 'hambatan', 'kendala', 'solusi', 'tindak lanjut', 'evaluasi', 'refleksi']
  },
  {
    key: 'pekan',
    name: 'Pekan Ke',
    isTextarea: false,
    keywords: ['pekan ke', 'pekan', 'minggu ke', 'minggu', 'week']
  }
];

function getElementSearchText(el) {
  let texts = [];

  // Check explicit label
  if (el.id) {
    try {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) texts.push(lbl.textContent);
    } catch (e) {}
  }

  // Check enclosing label
  const parentLabel = el.closest('label');
  if (parentLabel) texts.push(parentLabel.textContent);

  // Check parent container
  const container = el.closest('.form-group, .field, tr, td, .col, div:not(#app):not(body)');
  if (container) {
    const headings = container.querySelectorAll('label, h1, h2, h3, h4, h5, h6, strong, b, .label, .title');
    headings.forEach(h => texts.push(h.textContent));

    let prev = el.previousElementSibling;
    let limit = 3;
    while (prev && limit > 0) {
      texts.push(prev.textContent || '');
      prev = prev.previousElementSibling;
      limit--;
    }
  }

  // Check attributes
  texts.push(el.getAttribute('placeholder') || '');
  texts.push(el.getAttribute('name') || '');
  texts.push(el.getAttribute('id') || '');
  texts.push(el.getAttribute('aria-label') || '');
  texts.push(el.getAttribute('title') || '');

  return texts.join(' ').toLowerCase();
}

function autoFillMultiColumns(data) {
  // 1. Separate and sort textareas by vertical DOM position (top to bottom)
  const allTextareas = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]'))
    .filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !el.disabled && !el.readOnly;
    })
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

  const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])'))
    .filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !el.disabled && !el.readOnly;
    });

  if (allTextareas.length === 0 && allInputs.length === 0) {
    showToast('Kolom Tidak Ditemukan', 'Tidak ada kolom formulir aktif di halaman ini.', false);
    return { success: false, reason: 'NO_FIELDS_FOUND' };
  }

  const assignedElements = new Set();
  const filledFields = [];

  // Step 1: Match Pekan Ke input
  if (data.pekan) {
    for (const inp of allInputs) {
      const txt = getElementSearchText(inp);
      if (txt.includes('pekan') || txt.includes('minggu') || txt.includes('week')) {
        injectValueToElement(inp, String(data.pekan));
        assignedElements.add(inp);
        filledFields.push('Pekan Ke');
        break;
      }
    }
  }

  // Step 2: Match 5 STAR Textareas by keywords
  const starKeys = [
    { key: 'situation', name: 'Situasi', keywords: ['situation', 'situasi', 'kondisi', 'latar belakang', 'lingkungan'] },
    { key: 'task', name: 'Tugas', keywords: ['task', 'tugas', 'tanggung jawab', 'penugasan', 'sasaran'] },
    { key: 'action', name: 'Aksi', keywords: ['action', 'aksi', 'tindakan', 'pelaksanaan', 'implementasi', 'langkah'] },
    { key: 'result', name: 'Hasil', keywords: ['result', 'hasil', 'capaian', 'output', 'dampak', 'pencapaian'] },
    { key: 'komentar', name: 'Komentar', keywords: ['komentar', 'tantangan', 'hambatan', 'kendala', 'solusi', 'tindak lanjut', 'evaluasi', 'refleksi'] }
  ];

  for (const item of starKeys) {
    const val = data[item.key];
    if (!val) continue;

    let bestEl = null;
    let highestScore = 0;

    for (const ta of allTextareas) {
      if (assignedElements.has(ta)) continue;
      const searchText = getElementSearchText(ta);
      let score = 0;

      for (const kw of item.keywords) {
        if (searchText.includes(kw)) {
          score += (kw.length > 5 ? 60 : 40);
        }
      }

      if (score > highestScore && score >= 30) {
        highestScore = score;
        bestEl = ta;
      }
    }

    if (bestEl) {
      assignedElements.add(bestEl);
      injectValueToElement(bestEl, String(val));
      filledFields.push(item.name);
    }
  }

  // Step 3: For any STAR keys that were not matched by keyword, map to remaining unassigned textareas in sequential order!
  const unassignedKeys = starKeys.filter(item => data[item.key] && !filledFields.includes(item.name));
  const unassignedTextareas = allTextareas.filter(ta => !assignedElements.has(ta));

  for (let i = 0; i < Math.min(unassignedKeys.length, unassignedTextareas.length); i++) {
    const item = unassignedKeys[i];
    const ta = unassignedTextareas[i];
    assignedElements.add(ta);
    injectValueToElement(ta, String(data[item.key]));
    filledFields.push(item.name);
  }

  if (filledFields.length > 0) {
    showToast(`Berhasil Mengisi ${filledFields.length} Kolom! ✨`, `Kolom: ${filledFields.join(', ')} telah diisi otomatis.`);
    return { success: true, count: filledFields.length, filledFields };
  } else {
    showToast('Kolom Tidak Cocok', 'Tidak dapat mencocokkan kolom PKL. Gunakan tombol "Pilih Kolom Web".', false);
    return { success: false, reason: 'NO_MATCHING_FIELDS' };
  }
}

// Runtime message listener from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'AUTO_FILL_MULTI') {
    const res = autoFillMultiColumns(request.data || {});
    sendResponse(res);
    return;
  }

  if (request.action === 'AUTO_FILL') {
    const targetEl = findBestField();
    if (!targetEl) {
      showToast('Kolom Tidak Ditemukan', 'Tidak menemukan kolom input/textarea yang sesuai. Coba gunakan "Pilih Kolom di Web".', false);
      sendResponse({ success: false, reason: 'NO_FIELD_FOUND' });
      return;
    }

    injectValueToElement(targetEl, request.text);
    showToast('Jurnal Berhasil Diisi Otomatis! ✨', 'Teks jurnal telah disuntikkan ke kolom formulir.');
    sendResponse({ success: true });
    return;
  }

  if (request.action === 'START_PICKER') {
    startElementPicker(request.text);
    sendResponse({ success: true });
    return;
  }

  if (request.action === 'SHOW_NOTIFICATION_TOAST') {
    showToast(request.title || 'Pengingat JurnalMate AI', request.message || '', request.isSuccess !== false);
    sendResponse({ success: true });
    return;
  }
});
