/* =========================================================
   Non-AI Local OCR PDF Handwriting / Scan Importer v26 (js/pdf-import.js)
   - ไม่ใช้ AI / ไม่ต้องใช้ API Key — ประมวลผล OCR ทั้งหมดในเบราว์เซอร์ของผู้ใช้ 100%
   - Auto Printed-Grid Detection (detectPasayaGrid): ตรวจจับเส้นกรอบตาราง PASAYA จริงบนกระดาษ
     ล็อกพิกัด (xLeft, xMid, xRight, yHeaderBot, yCustBot, yQuadTop, yQuadMid, yQuadBot) แม่นระดับพิกเซล
     ไม่เพี้ยนแม้สแกนเลื่อน ขอบกว้าง หรือซูมต่างกัน + แยกหน้าสเก็ตช์ (เช่น หน้า 2) ออกอัตโนมัติ
   - Smooth Anti-Aliased Blue-Ink Isolation: แยกหมึกปากกาน้ำเงินแบบไล่ระดับสีเนียน (ไม่ถมรูเลข 0/4/6/8/9)
     ลบเส้นกรอบหน้าต่าง ตาราง และเครื่องหมาย + ที่พิมพ์ไว้ 100%
   - Connected-Component Word-Blob Segmentation: แยกกลุ่มตัวเลขแต่ละชุดเป็นก้อนอิสระ (เช่น 479, 149.5, 500)
     ไม่ตัดแหว่งตัวเลข ไม่ซ้อนแถวรางม่าน 3 แถว และกรองลูกศร < > / รูปวาดขนาดใหญ่ออกอัตโนมัติ
   - Dual-Mode English/Thai OCR: ใช้เอนจิน eng ล้วนสำหรับรหัสผ้า/สี/ราง (PLENARY, CLASSIC-AM, NOVA NANO)
     และใช้ tha+eng สำหรับชื่อลูกค้า/ห้อง/รูปแบบม่าน
   - Math Cross-Check & Decimal Recovery + Per-Page Scan + Ink Preview + Drag-Crop OCR
   ========================================================= */
const PdfHandwritingImporter = (() => {
  const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

  let pageItems = []; // [{ pageNo, canvas, dataUrl, inkPreviewUrl, showInkPreview, text, ocrLog, hasBlueInk, isFormPage, grid }]
  let fileName = '';
  let draftData = null;
  let activeTargetInput = null;
  let ocrBusy = false;
  let ocrCancelRequested = false;

  let cachedWorkerTha = null;
  let cachedWorkerEng = null;

  const escP = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function emptyWin(idx = 1) {
    return {
      planNo: String(idx), label: 'W' + idx,
      width: '', height: '', extL: '', extR: '', extT: '', extB: '',
      wallL: '', wallR: '', ceilT: '', floorB: '', fullW: '', fullH: '',
      curtainStyle1: '', curtainStyle2: '', pieces1: '', hookSize: '', box: '', mount: '',
      railW: '', railH: '', railTracks: '',
    };
  }

  function emptySheet(num = 1, sourcePageNo = null) {
    return {
      sourcePageNo,
      roomName: `ห้องที่ ${num}`,
      notes: [],
      fabrics: {
        blackout: { name: '', design: '', color: '' },
        sheer: { name: '', design: '', color: '' },
        roller: { group: '', name: '', color: '' },
        blinds: { group: '', name: '', color: '' },
      },
      rods: { pleat: '', show: '', wave: '' },
      windows: [emptyWin(1)],
    };
  }

  function emptyDraft() {
    return {
      customer: { name: '', mobile: '', building: '', road: '', district: '', province: '' },
      staff: { orderNo: '-', name: '', branch: '' },
      sheets: [emptySheet(1, 1)],
    };
  }

  /* =========================================================
     1. Script Loaders & Cached Tesseract Workers (100% Local)
     ========================================================= */
  function loadScriptOnce(src, checkFn) {
    if (checkFn()) return Promise.resolve(checkFn());
    return new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = src;
      sc.onload = () => {
        const res = checkFn();
        if (res) resolve(res);
        else reject(new Error('Library loaded but global not found: ' + src));
      };
      sc.onerror = () => reject(new Error('ไม่สามารถโหลดไลบรารี: ' + src));
      document.head.appendChild(sc);
    });
  }

  async function loadPdfJs() {
    const lib = await loadScriptOnce(PDFJS_CDN, () => window.pdfjsLib);
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
    return lib;
  }

  async function loadTesseract() {
    return loadScriptOnce(TESSERACT_CDN, () => window.Tesseract);
  }

  async function ensureOcrWorkers(onProgress) {
    const Tesseract = await loadTesseract();
    if (!cachedWorkerTha) {
      if (onProgress) onProgress(12, '⏳ กำลังโหลดชุดภาษาไทย+อังกฤษ (tha+eng) ในเบราว์เซอร์ (โหลดครั้งเดียว)...');
      cachedWorkerTha = await Tesseract.createWorker('tha+eng');
    }
    if (!cachedWorkerEng) {
      if (onProgress) onProgress(22, '⏳ กำลังโหลดเอนจินอ่านตัวเลขและรหัสผ้า (eng)...');
      cachedWorkerEng = await Tesseract.createWorker('eng');
    }
    return { workerTha: cachedWorkerTha, workerEng: cachedWorkerEng };
  }

  /* =========================================================
     2. Thai, Handwritten Number & Fuzzy DB Matching Helpers
     ========================================================= */
  const THAI_DIGIT_MAP = { '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9' };

  function toArabicDigits(str) {
    return String(str || '').replace(/[๐-๙]/g, ch => THAI_DIGIT_MAP[ch] || ch);
  }

  function formatCleanNum(n) {
    if (isNaN(n) || !Number.isFinite(n)) return '';
    return String(Math.round(n * 10) / 10);
  }

  function normalizeOcrNumber(raw, { min = 0, max = 9999, aggressive = false } = {}) {
    let s = toArabicDigits(String(raw || '').trim());
    s = s
      .replace(/[OoQD]/g, '0')
      .replace(/[lI|!]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8');
    if (aggressive) {
      s = s
        .replace(/[A]/g, '4')
        .replace(/[G]/g, '6')
        .replace(/[T]/g, '7')
        .replace(/[gq]/g, '9');
    }
    s = s
      .replace(/[,]/g, '.')
      .replace(/[^\d.]/g, '');
    const parts = s.split('.');
    if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
    const n = parseFloat(s);
    if (isNaN(n) || !Number.isFinite(n) || n < min || n > max) return '';
    return formatCleanNum(n);
  }

  function fixLikelyDecimal(valStr, fieldType = 'dim') {
    const s = String(valStr || '').trim();
    if (!s || s.includes('.')) return s;
    const n = parseFloat(s);
    if (isNaN(n) || !Number.isFinite(n)) return '';
    if (s.length >= 3 && s.endsWith('5')) {
      if (fieldType === 'ext' && n >= 105 && n <= 995) return formatCleanNum(n / 10);
      if (fieldType === 'wall' && n >= 265 && n <= 2605) return formatCleanNum(n / 10);
      if (fieldType === 'ceil' && n >= 205 && n <= 2005) return formatCleanNum(n / 10);
      if (fieldType === 'dim' && n >= 655 && n <= 6505) return formatCleanNum(n / 10);
    }
    return s;
  }

  function reconcileWindowDimensions(win) {
    if (!win) return win;
    const p = v => {
      const n = parseFloat(v);
      return (!isNaN(n) && Number.isFinite(n)) ? n : null;
    };

    const rW = p(win.railW);
    const rH = p(win.railH);
    const fW = p(win.fullW);
    const fH = p(win.fullH);

    const tryFixWithTarget = (key, target, othersSum) => {
      const v = p(win[key]);
      if (v === null || target === null || String(win[key]).includes('.')) return;
      if (String(win[key]).endsWith('5') && v >= 55) {
        const div = v / 10;
        const errOrig = Math.abs((v + othersSum) - target);
        const errDiv = Math.abs((div + othersSum) - target);
        if (errDiv <= 6 && errDiv + 15 < errOrig) {
          win[key] = formatCleanNum(div);
        }
      }
    };

    if (rW !== null) {
      const w0 = p(win.width) || 0;
      const eR0 = p(win.extR) || 0;
      tryFixWithTarget('extL', rW, w0 + eR0);
      tryFixWithTarget('extR', rW, w0 + (p(win.extL) || 0));
      tryFixWithTarget('width', rW, (p(win.extL) || 0) + (p(win.extR) || 0));
    }
    if (fH !== null) {
      const h0 = p(win.height) || 0;
      const fB0 = p(win.floorB) || 0;
      tryFixWithTarget('ceilT', fH, h0 + fB0);
      tryFixWithTarget('floorB', fH, h0 + (p(win.ceilT) || 0));
      tryFixWithTarget('height', fH, (p(win.ceilT) || 0) + (p(win.floorB) || 0));
    }
    if (rH !== null) {
      const h0 = p(win.height) || 0;
      const eB0 = p(win.extB) || 0;
      tryFixWithTarget('extT', rH, h0 + eB0);
      tryFixWithTarget('extB', rH, h0 + (p(win.extT) || 0));
      tryFixWithTarget('height', rH, (p(win.extT) || 0) + (p(win.extB) || 0));
    }

    if (!win.width) {
      if (rW !== null && rW >= 20) {
        const est = rW - (p(win.extL) || 0) - (p(win.extR) || 0);
        win.width = formatCleanNum(est >= 20 ? est : rW);
      } else if (fW !== null && fW >= 20) {
        win.width = formatCleanNum(fW);
      }
    }
    if (!win.height) {
      if (rH !== null && rH >= 20) {
        const est = rH - (p(win.extT) || 0) - (p(win.extB) || 0);
        win.height = formatCleanNum(est >= 20 ? est : rH);
      } else if (fH !== null && fH >= 20) {
        win.height = formatCleanNum(fH);
      }
    }
    return win;
  }

  function detectThaiCurtainStyle(text) {
    const s = String(text || '').replace(/\s+/g, '');
    if (!s) return '';
    if (/ม่านม้วน|ม้วน|roller/i.test(s)) return 'ม่านม้วน';
    if (/มู่ลี่ไม้|ไม้บาส|basswood/i.test(s)) return 'มู่ลี่ไม้';
    if (/มู่ลี่อลู|อลูมิเนียม/i.test(s)) return 'มู่ลี่อลูมิเนียม';
    if (/มู่ลี่|blinds|blind/i.test(s)) return 'มู่ลี่ไม้';
    if (/ปรับแสง/i.test(s)) return 'ม่านปรับแสง';
    if (/ลอนไข่ปลา|ไข่ปลา/i.test(s)) return 'ม่านลอนไข่ปลา';
    if (/ลอนเทป/i.test(s)) return 'ม่านลอนเทป';
    if (/ม่านลอน|ลอน|wave/i.test(s)) return 'ม่านลอน';
    if (/ตาไก่|eyelet/i.test(s)) return 'ม่านตาไก่';
    if (/ม่านพับ|พับ|roman/i.test(s)) return 'ม่านพับ';
    if (/ม่านจีบ|จีบ|pleat/i.test(s)) return 'ม่านจีบ';
    return '';
  }

  function detectHookSize(text, allowBareDigit = false) {
    const s = toArabicDigits(String(text || ''));
    const m = /(?:No\.?|เบอร์|ตะขอ)\s*([5689])/i.exec(s);
    if (m) return `No.${m[1]}`;
    if (allowBareDigit) {
      const m2 = /\b([5689])\b/.exec(s.replace(/[Oo]/g, '0').replace(/[Bb]/g, '8').replace(/[Ss]/g, '5'));
      if (m2) return `No.${m2[1]}`;
    }
    return '';
  }

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = new Uint16Array(n + 1);
    let curr = new Uint16Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      const ca = a.charCodeAt(i - 1);
      for (let j = 1; j <= n; j++) {
        const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      const tmp = prev; prev = curr; curr = tmp;
    }
    return prev[n];
  }

  function normalizeDbToken(s) {
    return String(s || '').toUpperCase().replace(/[^A-Z0-9ก-๙-]/g, '').trim();
  }

  function fuzzyMatchDbItem(rawText, list, keys = ['name'], minScore = 0.62) {
    if (!Array.isArray(list) || !list.length) return null;
    const cleanRaw = normalizeDbToken(rawText);
    if (cleanRaw.length < 3) return null;

    let bestItem = null;
    let bestScore = 0;
    const rawTokens = String(rawText || '').toUpperCase().split(/[\s,/|]+/).map(normalizeDbToken).filter(t => t.length >= 3);
    const candidates = rawTokens.length > 1 ? [cleanRaw, ...rawTokens] : [cleanRaw];

    for (const item of list) {
      if (!item) continue;
      for (const k of keys) {
        const val = String(item[k] || '').trim();
        if (!val) continue;
        const cleanVal = normalizeDbToken(val);
        if (cleanVal.length < 3) continue;

        for (const cand of candidates) {
          let score = 0;
          if (cand === cleanVal) {
            score = 1.0;
          } else if (cleanVal.length >= 4 && (cand.includes(cleanVal) || cleanVal.includes(cand))) {
            score = 0.86 + 0.12 * (Math.min(cand.length, cleanVal.length) / Math.max(cand.length, cleanVal.length));
          } else {
            const dist = levenshtein(cand, cleanVal);
            score = 1 - dist / Math.max(cand.length, cleanVal.length);
          }
          if (score > bestScore) {
            bestScore = score;
            bestItem = item;
          }
        }
      }
    }
    return bestScore >= minScore ? bestItem : null;
  }

  function fuzzyMatchFabricFromDb(text) {
    if (typeof masterDB === 'undefined' || !Array.isArray(masterDB.fabrics)) return '';
    const hit = fuzzyMatchDbItem(text, masterDB.fabrics, ['name', 'design'], 0.64);
    return hit ? (hit.name || '') : '';
  }

  /* =========================================================
     3. Smooth Blue-Ink Isolation & Auto Printed-Grid Detector
     ========================================================= */
  function isBlueInkPixel(r, g, b, soft = false) {
    if (soft) return b >= 48 && r < 222 && (b - r) >= 11 && (b - g) >= 2;
    return b >= 52 && r < 212 && (b - r) >= 16 && (b - g) >= 4;
  }

  /**
   * คืนค่าความเข้มหมึกน้ำเงินแบบ Jet-Black Anti-Aliased (0 = ไม่ใช่หมึกน้ำเงิน/พื้นขาว, 1..255 = เข้มสุด)
   * แกนเส้นปากกาน้ำเงินจะถูกบูสต์เป็นสีดำสนิท (255) เพื่อไม่ให้ Tesseract Otsu ตัดเส้นจางหายไป
   * ขณะที่ขอบเส้นยังคงความเนียน anti-aliased ไม่ถมรูตัวเลข 0, 4, 6, 8, 9
   */
  function blueInkStrength(r, g, b) {
    const br = b - r;
    const bg = b - g;
    if (b < 42 || r >= 228 || br < 11 || bg < 2) return 0;
    // บูสต์ความเข้มให้แกนหมึกเป็น 255 (ดำสนิท) แม้เป็นหมึกน้ำเงินค่อนข้างอ่อน
    const chrom = Math.min(255, (br - 8) * 7.2);
    const dark = Math.min(255, (242 - r) * 2.3);
    return Math.max(115, Math.min(255, Math.round(0.68 * chrom + 0.32 * dark)));
  }

  function detectHasBlueInk(canvas) {
    const w = canvas.width, h = canvas.height;
    const sx = Math.floor(w * 0.04), sy = Math.floor(h * 0.11);
    const sw = Math.floor(w * 0.92), sh = Math.floor(h * 0.76);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const d = ctx.getImageData(sx, sy, sw, sh).data;
    let blueCount = 0, sampled = 0;
    for (let y = 0; y < sh; y += 2) {
      for (let x = 0; x < sw; x += 2) {
        const idx = (y * sw + x) * 4;
        sampled++;
        if (isBlueInkPixel(d[idx], d[idx + 1], d[idx + 2], false)) blueCount++;
      }
    }
    return blueCount >= 260 && (blueCount / Math.max(1, sampled)) >= 0.0004;
  }

  /**
   * ตรวจจับเส้นกรอบตารางที่พิมพ์จริงบนใบแบบฟอร์ม PASAYA MTO
   * คืนค่าพิกัดมาตรฐานที่แม่นระดับพิกเซล:
   * { isFormPage, xLeft, xMid, xRight, yHeaderTop, yHeaderBot, yCustBot, yQuadTop, yQuadMid, yQuadBot }
   */
  function detectPasayaGrid(canvas) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, w, h).data;

    // 1. ตรวจแถบหัวสีเข้ม PASAYA (y: 0.01..0.14)
    const bx0 = Math.floor(w * 0.07), bx1 = Math.floor(w * 0.93);
    const by0 = Math.floor(h * 0.01), by1 = Math.floor(h * 0.14);
    let curStart = -1, bestLen = 0, bestStart = -1, bestEnd = -1;
    for (let y = by0; y < by1; y++) {
      let dark = 0, cnt = 0;
      for (let x = bx0; x < bx1; x += 4) {
        const i = (y * w + x) * 4;
        const g = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
        cnt++;
        if (g < 185) dark++;
      }
      if ((dark / Math.max(1, cnt)) >= 0.40) {
        if (curStart < 0) curStart = y;
      } else if (curStart >= 0) {
        if (y - curStart > bestLen) { bestLen = y - curStart; bestStart = curStart; bestEnd = y; }
        curStart = -1;
      }
    }
    if (curStart >= 0 && (by1 - curStart) > bestLen) {
      bestLen = by1 - curStart; bestStart = curStart; bestEnd = by1;
    }

    const isFormPage = bestLen >= h * 0.018;
    const fallback = {
      isFormPage,
      xLeft: 0.032, xMid: 0.502, xRight: 0.970,
      yHeaderTop: 0.032, yHeaderBot: 0.088,
      yCustBot: 0.195, yQuadTop: 0.255, yQuadMid: 0.460, yQuadBot: 0.665,
    };
    if (!isFormPage) return fallback;

    const yHeaderTop = bestStart / h;
    const yHeaderBot = bestEnd / h;

    // 2. ตรวจเส้นกรอบแนวตั้งสีดำ (ไม่ใช่หมึกน้ำเงิน) -> xLeft, xMid, xRight
    const vy0 = Math.floor(h * 0.28), vy1 = Math.floor(h * 0.66);
    const findBestVLine = (xMinF, xMaxF, defVal) => {
      let bestX = defVal, bestScore = 0;
      const x0 = Math.floor(w * xMinF), x1 = Math.floor(w * xMaxF);
      for (let x = x0; x <= x1; x++) {
        let dark = 0, cnt = 0;
        for (let y = vy0; y < vy1; y += 3) {
          const i = (y * w + x) * 4;
          const r = img[i], g = img[i + 1], b = img[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          cnt++;
          if (gray < 175 && (b - r) < 16) dark++;
        }
        const ratio = dark / Math.max(1, cnt);
        if (ratio > bestScore) { bestScore = ratio; bestX = x / w; }
      }
      return bestScore >= 0.40 ? bestX : defVal;
    };

    const xLeft = findBestVLine(0.012, 0.085, 0.032);
    const xRight = findBestVLine(0.915, 0.988, 0.970);
    const xMid = findBestVLine(0.465, 0.540, (xLeft + xRight) / 2);

    // 3. ตรวจเส้นกรอบแนวนอนสีดำเต็มความกว้าง -> หา triple (yQuadTop, yQuadMid, yQuadBot) ที่ระยะห่าง Row1 ≈ Row2
    const hx0 = Math.floor(w * (xLeft + 0.02));
    const hx1 = Math.floor(w * (xRight - 0.02));
    const hy0 = Math.floor(h * (yHeaderBot + 0.04));
    const hy1 = Math.floor(h * 0.80);
    const hLines = [];
    let runStart = -1, runPeakScore = 0, runPeakY = 0;
    for (let y = hy0; y < hy1; y++) {
      let dark = 0, cnt = 0;
      for (let x = hx0; x < hx1; x += 3) {
        const i = (y * w + x) * 4;
        const r = img[i], g = img[i + 1], b = img[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        cnt++;
        if (gray < 178 && (b - r) < 16) dark++;
      }
      const ratio = dark / Math.max(1, cnt);
      if (ratio >= 0.48) {
        if (runStart < 0) { runStart = y; runPeakScore = ratio; runPeakY = y; }
        else if (ratio > runPeakScore) { runPeakScore = ratio; runPeakY = y; }
      } else if (runStart >= 0) {
        hLines.push({ y: runPeakY / h, score: runPeakScore });
        runStart = -1;
      }
    }
    if (runStart >= 0) hLines.push({ y: runPeakY / h, score: runPeakScore });

    // ค้นหาชุด (L1, L2, L3) ที่เป็นกรอบ 2 แถวของหน้าต่าง 4 บาน (สูงเท่ากัน 0.17..0.245)
    let bestTriple = null, bestTriScore = -1;
    for (let i = 0; i < hLines.length; i++) {
      const L1 = hLines[i];
      if (L1.y < 0.20 || L1.y > 0.34) continue;
      for (let j = i + 1; j < hLines.length; j++) {
        const L2 = hLines[j];
        const h1 = L2.y - L1.y;
        if (h1 < 0.165 || h1 > 0.25) continue;
        for (let k = j + 1; k < hLines.length; k++) {
          const L3 = hLines[k];
          const h2 = L3.y - L2.y;
          const diff = Math.abs(h2 - h1);
          if (diff <= 0.024 && L3.y <= 0.77) {
            const sc = (L1.score + L2.score + L3.score) - diff * 12;
            if (sc > bestTriScore) {
              bestTriScore = sc;
              bestTriple = [L1.y, L2.y, L3.y];
            }
          }
        }
      }
    }

    const yQuadTop = bestTriple ? bestTriple[0] : (yHeaderBot + 0.165);
    const yQuadMid = bestTriple ? bestTriple[1] : (yQuadTop + 0.203);
    const yQuadBot = bestTriple ? bestTriple[2] : (yQuadMid + 0.203);

    // หาเส้นแบ่งใต้ส่วนลูกค้า (yCustBot) ที่อยู่เหนือ yQuadTop ประมาณ 0.045..0.085
    let yCustBot = yQuadTop - 0.058;
    let bestCustScore = 0;
    for (const hl of hLines) {
      const dist = yQuadTop - hl.y;
      if (dist >= 0.042 && dist <= 0.088 && hl.score > bestCustScore) {
        bestCustScore = hl.score;
        yCustBot = hl.y;
      }
    }

    return {
      isFormPage: true,
      xLeft, xMid, xRight,
      yHeaderTop, yHeaderBot, yCustBot,
      yQuadTop, yQuadMid, yQuadBot,
    };
  }

  function measureBlueInkInRect(srcCanvas, normRect, soft = false) {
    const sx = Math.max(0, Math.floor(normRect.x * srcCanvas.width));
    const sy = Math.max(0, Math.floor(normRect.y * srcCanvas.height));
    const sw = Math.max(2, Math.min(srcCanvas.width - sx, Math.ceil(normRect.w * srcCanvas.width)));
    const sh = Math.max(2, Math.min(srcCanvas.height - sy, Math.ceil(normRect.h * srcCanvas.height)));
    const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    const d = ctx.getImageData(sx, sy, sw, sh).data;
    let count = 0;
    const total = sw * sh;
    for (let i = 0; i < total; i++) {
      const idx = i * 4;
      if (isBlueInkPixel(d[idx], d[idx + 1], d[idx + 2], soft)) count++;
    }
    return { count, total, ratio: count / Math.max(1, total) };
  }

  function generateInkPreviewDataUrl(srcCanvas) {
    const scale = 0.55;
    const out = document.createElement('canvas');
    out.width = Math.max(100, Math.round(srcCanvas.width * scale));
    out.height = Math.max(100, Math.round(srcCanvas.height * scale));
    const ctx = out.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0, out.width, out.height);
    const img = ctx.getImageData(0, 0, out.width, out.height);
    const d = img.data;
    const len = out.width * out.height;
    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const str = blueInkStrength(d[idx], d[idx + 1], d[idx + 2]);
      if (str > 0) {
        const k = str / 255;
        d[idx] = Math.round(255 - 240 * k);
        d[idx + 1] = Math.round(255 - 205 * k);
        d[idx + 2] = Math.round(255 - 85 * k);
        d[idx + 3] = 255;
      } else {
        const g = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
        const faded = Math.round(255 - (255 - g) * 0.08);
        d[idx] = faded; d[idx + 1] = faded; d[idx + 2] = faded; d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return out.toDataURL('image/jpeg', 0.84);
  }

  /* =========================================================
     4. Connected-Component Word-Blob Segmentation (0 AI, ~5ms)
     ========================================================= */
  /**
   * แยกก้อนตัวอักษร/ตัวเลข (Word Blobs) ออกจากภาพหมึกสีน้ำเงินภายใน 1 ช่องหน้าต่าง
   * - ไม่ตัดแหว่งตัวเลข ไม่รวมแถวรางม่าน 3 แถวปนกัน
   * - กรองลูกศร < > และเส้นวาดรูปหน้าต่างขนาดใหญ่ออกอัตโนมัติ
   * @param {Uint8Array} bin - 1 = blue ink, 0 = background (size sw * sh)
   * @param {number} sw
   * @param {number} sh
   * @returns {Array<{minX,maxX,minY,maxY,w,h,cx,cy,rx,ry,area}>}
   */
  function segmentInkBlobs(bin, sw, sh) {
    const visited = new Uint8Array(sw * sh);
    const chars = [];
    const dots = [];
    const qx = new Int32Array(sw * sh);
    const qy = new Int32Array(sw * sh);

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const start = y * sw + x;
        if (!bin[start] || visited[start]) continue;

        let head = 0, tail = 0;
        qx[tail] = x; qy[tail] = y; tail++;
        visited[start] = 1;

        let minX = x, maxX = x, minY = y, maxY = y, area = 0;
        while (head < tail) {
          const cx = qx[head], cy = qy[head]; head++;
          area++;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          for (let dy = -1; dy <= 1; dy++) {
            const ny = cy + dy;
            if (ny < 0 || ny >= sh) continue;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cx + dx;
              if (nx < 0 || nx >= sw) continue;
              const np = ny * sw + nx;
              if (bin[np] && !visited[np]) {
                visited[np] = 1;
                qx[tail] = nx; qy[tail] = ny; tail++;
              }
            }
          }
        }

        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        if (area < 4) continue;
        // กรองรูปวาดขนาดใหญ่ เช่น ลูกศรม่าน < > หรือกรอบวาดด้วยมือ
        if (bh > sh * 0.155 || bw > sw * 0.34) continue;
        if (bh > sh * 0.095 && (area / Math.max(1, bw * bh)) < 0.19) continue;

        const comp = { minX, maxX, minY, maxY, w: bw, h: bh, area };
        if (area < 18 && bw <= 11 && bh <= 11) {
          dots.push(comp);
        } else if (area >= 10 && bh >= 5) {
          chars.push(comp);
        }
      }
    }

    // รวมตัวอักษรที่อยู่บรรทัดเดียวกันและชิดกันเป็น 1 Word Blob (เช่น 4+7+9 -> 479, 1+4+9+.+5 -> 149.5)
    chars.sort((a, b) => a.minX - b.minX);
    const words = [];
    for (const c of chars) {
      let merged = false;
      for (let i = words.length - 1; i >= 0; i--) {
        const w = words[i];
        const gapX = c.minX - w.maxX;
        if (gapX > Math.max(13, Math.min(w.h, c.h) * 0.85) || gapX < -Math.min(w.w, c.w)) continue;
        const ovY = Math.min(w.maxY, c.maxY) - Math.max(w.minY, c.minY);
        const minH = Math.min(w.h, c.h);
        if (ovY >= minH * 0.28 && (Math.max(w.maxX, c.maxX) - Math.min(w.minX, c.minX)) < sw * 0.34) {
          w.minX = Math.min(w.minX, c.minX);
          w.maxX = Math.max(w.maxX, c.maxX);
          w.minY = Math.min(w.minY, c.minY);
          w.maxY = Math.max(w.maxY, c.maxY);
          w.w = w.maxX - w.minX + 1;
          w.h = w.maxY - w.minY + 1;
          w.area += c.area;
          merged = true;
          break;
        }
      }
      if (!merged) words.push({ ...c });
    }

    // ผนวกจุดทศนิยม (เช่น จุด . ใน 149.5) เข้ากับ word ที่อยู่ติดกันแล้วเช็ครวม 2 ข้างของจุดทศนิยม!
    for (const d of dots) {
      const dcy = (d.minY + d.maxY) / 2;
      for (const w of words) {
        const nearX = d.minX >= w.minX - 10 && d.maxX <= w.maxX + 10;
        const nearY = dcy >= w.minY + w.h * 0.30 && dcy <= w.maxY + 6;
        if (nearX && nearY) {
          w.minX = Math.min(w.minX, d.minX);
          w.maxX = Math.max(w.maxX, d.maxX);
          w.minY = Math.min(w.minY, d.minY);
          w.maxY = Math.max(w.maxY, d.maxY);
          w.w = w.maxX - w.minX + 1;
          w.h = w.maxY - w.minY + 1;
          w.area += d.area;
          break;
        }
      }
    }

    // รอบ merge ซ้ำหลังผนวกจุดทศนิยม (เช่น "149." + "5" -> "149.5")
    words.sort((a, b) => a.minX - b.minX);
    const finalWords = [];
    for (const c of words) {
      let merged = false;
      for (let i = finalWords.length - 1; i >= 0; i--) {
        const w = finalWords[i];
        const gapX = c.minX - w.maxX;
        const ovY = Math.min(w.maxY, c.maxY) - Math.max(w.minY, c.minY);
        if (gapX >= -4 && gapX <= Math.max(10, Math.min(w.h, c.h) * 0.65) && ovY >= Math.min(w.h, c.h) * 0.35) {
          w.minX = Math.min(w.minX, c.minX);
          w.maxX = Math.max(w.maxX, c.maxX);
          w.minY = Math.min(w.minY, c.minY);
          w.maxY = Math.max(w.maxY, c.maxY);
          w.w = w.maxX - w.minX + 1;
          w.h = w.maxY - w.minY + 1;
          w.area += c.area;
          merged = true;
          break;
        }
      }
      if (!merged) finalWords.push(c);
    }

    return finalWords.map(b => {
      const cx = (b.minX + b.maxX) / 2;
      const cy = (b.minY + b.maxY) / 2;
      return { ...b, cx, cy, rx: cx / Math.max(1, sw), ry: cy / Math.max(1, sh) };
    });
  }

  /**
   * วาด Word Blob ลงบน Canvas สีเทาเนียน (Anti-Aliased) ขนาดสูง ~42px พร้อมขอบขาว 26px รอบด้าน
   */
  function renderBlobToOcrCanvas(inkGray, sw, sh, blob, targetH = 46, pad = 28) {
    const x0 = Math.max(0, blob.minX - 2);
    const y0 = Math.max(0, blob.minY - 2);
    const x1 = Math.min(sw - 1, blob.maxX + 2);
    const y1 = Math.min(sh - 1, blob.maxY + 2);
    const tw = Math.max(4, x1 - x0 + 1);
    const th = Math.max(4, y1 - y0 + 1);

    const tmp = document.createElement('canvas');
    tmp.width = tw; tmp.height = th;
    const tctx = tmp.getContext('2d');
    const timg = tctx.createImageData(tw, th);
    const td = timg.data;
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const str = inkGray[(y0 + y) * sw + (x0 + x)];
        // แกนเส้นหมึกเข้มดำสนิท (0..18) ขอบเนียน anti-aliased
        const v = str > 0 ? Math.max(0, 255 - Math.round(str * 1.15)) : 255;
        const o = (y * tw + x) * 4;
        td[o] = v; td[o + 1] = v; td[o + 2] = v; td[o + 3] = 255;
      }
    }
    tctx.putImageData(timg, 0, 0);

    const effScale = Math.max(1.2, Math.min(3.0, targetH / Math.max(12, th)));
    const drawW = Math.round(tw * effScale);
    const drawH = Math.round(th * effScale);
    const out = document.createElement('canvas');
    out.width = Math.min(900, drawW + pad * 2);
    out.height = Math.min(500, drawH + pad * 2);
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tmp, 0, 0, tw, th, pad, pad, out.width - pad * 2, out.height - pad * 2);

    // เพิ่มคอนทราสต์อ่อนๆ หลัง scale เพื่อให้เส้นปากกาคมชัดในสายตา Tesseract 5 LSTM
    const fimg = ctx.getImageData(0, 0, out.width, out.height);
    const fd = fimg.data;
    for (let i = 0; i < out.width * out.height; i++) {
      const o = i * 4;
      const g = fd[o];
      if (g < 245) {
        const boosted = g < 170 ? Math.max(0, Math.round(g * 0.35)) : Math.min(255, Math.round((g - 170) * 3.0));
        fd[o] = boosted; fd[o + 1] = boosted; fd[o + 2] = boosted;
      }
    }
    ctx.putImageData(fimg, 0, 0);
    return out;
  }

  /**
   * อ่านตัวเลขลายมือแบบ Multi-Pass (PSM 7 -> PSM 13 Raw Line -> PSM 7 No-Whitelist)
   * แก้ปัญหา Tesseract 5 LSTM ข้ามเลขนำหน้าหรือคืนค่าว่างเมื่อลายมือเอียง (เช่น 479, 272, 500, 149.5)
   */
  async function recognizeNumericCanvas(workerEng, canvas, blobAspect = 1.0, range = { min: 1, max: 6505 }) {
    const expectMinDigits = blobAspect >= 1.55 ? 2 : 1;
    const scoreVal = v => {
      if (!v) return 0;
      const digs = v.replace(/[^\d]/g, '').length;
      return digs * 10 + (v.includes('.') ? 3 : 0);
    };

    // Pass 1: PSM 7 + numeric whitelist
    await workerEng.setParameters({ tessedit_char_whitelist: '0123456789.', tessedit_pageseg_mode: '7' });
    let r1 = await workerEng.recognize(canvas);
    let best = normalizeOcrNumber(r1.data.text, range);
    if (best && best.replace(/[^\d]/g, '').length >= expectMinDigits) return best;

    // Pass 2: PSM 13 (Raw single line — ไม่โดน heuristic ตัดลายมือเอียงทิ้ง)
    await workerEng.setParameters({ tessedit_char_whitelist: '0123456789.', tessedit_pageseg_mode: '13' });
    let r2 = await workerEng.recognize(canvas);
    let v2 = normalizeOcrNumber(r2.data.text, range);
    if (scoreVal(v2) > scoreVal(best)) best = v2;
    if (best && best.replace(/[^\d]/g, '').length >= expectMinDigits) return best;

    // Pass 3: PSM 7 without whitelist + aggressive digit mapping (O->0, l->1, A->4, S->5, B->8, g/q->9)
    await workerEng.setParameters({ tessedit_char_whitelist: '', tessedit_pageseg_mode: '7' });
    let r3 = await workerEng.recognize(canvas);
    let v3 = normalizeOcrNumber(r3.data.text, { ...range, aggressive: true });
    if (scoreVal(v3) > scoreVal(best)) best = v3;
    return best || '';
  }

  /**
   * ตัดกรอบและแยกหมึกแบบเนียน (ใช้กับช่องข้อความลูกค้า/ห้อง/ผ้า และลากกรอบอ่านเฉพาะจุด)
   */
  function cropAndPreprocess(srcCanvas, normRect, inkMode = 'auto_blue', scaleUp = 1.8, opts = {}) {
    const {
      hasBlueInk = false,
      autoTrim = false,
      targetTextH = 44,
      minInkPixels = 14,
      padding = 24,
      returnMeta = false,
    } = opts;

    const sx = Math.max(0, Math.floor(normRect.x * srcCanvas.width));
    const sy = Math.max(0, Math.floor(normRect.y * srcCanvas.height));
    const sw = Math.max(6, Math.min(srcCanvas.width - sx, Math.ceil(normRect.w * srcCanvas.width)));
    const sh = Math.max(6, Math.min(srcCanvas.height - sy, Math.ceil(normRect.h * srcCanvas.height)));

    const useBlueIsolation = (inkMode === 'blue_only') || (inkMode === 'auto_blue' && hasBlueInk);

    if (useBlueIsolation) {
      const sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
      const sd = sctx.getImageData(sx, sy, sw, sh).data;
      const len = sw * sh;
      const inkGray = new Uint8Array(len);
      const rawBin = new Uint8Array(len);
      let inkCount = 0;

      for (let i = 0; i < len; i++) {
        const idx = i * 4;
        const str = blueInkStrength(sd[idx], sd[idx + 1], sd[idx + 2]);
        if (str > 0) {
          inkGray[i] = str;
          rawBin[i] = 1;
          inkCount++;
        }
      }

      // ลบจุดรบกวนเดี่ยว 1px
      let cleanCount = 0;
      let minX = sw, maxX = -1, minY = sh, maxY = -1;
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const p = y * sw + x;
          if (!rawBin[p]) continue;
          let hasNbr = false;
          for (let dy = -1; dy <= 1 && !hasNbr; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= sh) continue;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              if (nx >= 0 && nx < sw && rawBin[ny * sw + nx]) { hasNbr = true; break; }
            }
          }
          if (hasNbr) {
            cleanCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          } else {
            inkGray[p] = 0;
          }
        }
      }

      if (cleanCount < minInkPixels || maxX < minX || maxY < minY) {
        return returnMeta ? { canvas: null, inkCount: cleanCount, inkRatio: cleanCount / Math.max(1, len) } : null;
      }

      const blob = autoTrim
        ? { minX, maxX, minY, maxY }
        : { minX: 0, maxX: sw - 1, minY: 0, maxY: sh - 1 };
      const out = renderBlobToOcrCanvas(inkGray, sw, sh, blob, autoTrim ? targetTextH : Math.round(sh * scaleUp), padding);
      return returnMeta ? { canvas: out, inkCount: cleanCount, inkRatio: cleanCount / Math.max(1, len) } : out;
    }

    // Fallback ภาพขาวดำ (Otsu + optional grid-line removal)
    const out = document.createElement('canvas');
    out.width = Math.round(sw * scaleUp) + padding * 2;
    out.height = Math.round(sh * scaleUp) + padding * 2;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(srcCanvas, sx, sy, sw, sh, padding, padding, Math.round(sw * scaleUp), Math.round(sh * scaleUp));

    const img = ctx.getImageData(0, 0, out.width, out.height);
    const d = img.data;
    const len = out.width * out.height;
    const gray = new Uint8Array(len);
    const hist = new Uint32Array(256);

    for (let i = 0; i < len; i++) {
      const g = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
      gray[i] = g;
      hist[g]++;
    }

    let sumAll = 0;
    for (let t = 0; t < 256; t++) sumAll += t * hist[t];
    let sumB = 0, wB = 0, maxVar = -1, threshold = 175;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (!wB) continue;
      const wF = len - wB;
      if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sumAll - sumB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > maxVar) { maxVar = v; threshold = t; }
    }
    if (inkMode === 'faint') threshold = Math.min(232, threshold + 28);
    else if (inkMode === 'bold') threshold = Math.max(95, threshold - 12);
    else threshold = Math.min(218, threshold + 8);

    const bin = new Uint8Array(len);
    let inkCount = 0;
    for (let i = 0; i < len; i++) {
      if (gray[i] < threshold) { bin[i] = 1; inkCount++; }
    }

    if (inkMode === 'bold' || inkMode === 'auto_blue') {
      const w = out.width, h = out.height;
      const minHRun = Math.max(40, Math.floor(w * 0.28));
      for (let y = 0; y < h; y++) {
        let run = 0;
        for (let x = 0; x <= w; x++) {
          if (x < w && bin[y * w + x]) run++;
          else {
            if (run >= minHRun) {
              for (let rx = x - run; rx < x; rx++) bin[y * w + rx] = 0;
            }
            run = 0;
          }
        }
      }
      const minVRun = Math.max(40, Math.floor(h * 0.30));
      for (let x = 0; x < w; x++) {
        let run = 0;
        for (let y = 0; y <= h; y++) {
          if (y < h && bin[y * w + x]) run++;
          else {
            if (run >= minVRun) {
              for (let ry = y - run; ry < y; ry++) bin[ry * w + x] = 0;
            }
            run = 0;
          }
        }
      }
    }

    for (let i = 0; i < len; i++) {
      const v = bin[i] ? 0 : 255;
      d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return returnMeta ? { canvas: out, inkCount, inkRatio: inkCount / Math.max(1, len) } : out;
  }

  /* =========================================================
     5. Blob-to-Window Spatial Classifier (Pure Deterministic Math)
     ========================================================= */
  /**
   * จับคู่ก้อนตัวเลขที่ OCR อ่านได้พร้อมพิกัด (rx, ry) ภายใน 1 ช่องหน้าต่าง ลงฟิลด์ที่ถูกต้อง
   * @param {Array<{val, n, rx, ry}>} numBlobs
   * @param {object} wObj
   */
  function assignBlobsToWindow(numBlobs, wObj) {
    if (!Array.isArray(numBlobs) || !numBlobs.length) return wObj;

    // 1. ตารางรางม่านด้านล่าง (ry: 0.75..0.89) -> เลือกตัวบนสุด (แถวรางม่าน) ของแต่ละคอลัมน์
    const railRow = numBlobs.filter(b => b.ry >= 0.74 && b.ry <= 0.89);
    const pickTopmost = list => list.sort((a, b) => a.ry - b.ry)[0];
    const rWBlob = pickTopmost(railRow.filter(b => b.rx >= 0.14 && b.rx <= 0.36 && b.n >= 20));
    const rHBlob = pickTopmost(railRow.filter(b => b.rx > 0.36 && b.rx <= 0.56 && b.n >= 20));
    const rTBlob = pickTopmost(railRow.filter(b => b.rx > 0.56 && b.rx <= 0.70 && b.n >= 1 && b.n <= 6 && !String(b.val).includes('.')));
    if (rWBlob) wObj.railW = fixLikelyDecimal(rWBlob.val, 'dim');
    if (rHBlob) wObj.railH = fixLikelyDecimal(rHBlob.val, 'dim');
    if (rTBlob) wObj.railTracks = String(Math.round(rTBlob.n));

    // 2. เหนือกรอบหน้าต่างฝั่งขวา (ceilT: ry 0.10..0.24, rx 0.54..0.82)
    const ceilCand = numBlobs
      .filter(b => b.ry >= 0.10 && b.ry <= 0.24 && b.rx >= 0.54 && b.rx <= 0.82 && b.n >= 1)
      .sort((a, b) => Math.abs(a.rx - 0.67) - Math.abs(b.rx - 0.67))[0];
    if (ceilCand) wObj.ceilT = fixLikelyDecimal(ceilCand.val, 'ceil');

    // 3. แถบบนแนวนอน (ry: 0.19..0.41) -> wallL, extL, width, extR, wallR
    const topBand = numBlobs
      .filter(b => b !== ceilCand && b.ry >= 0.19 && b.ry <= 0.41 && b.rx >= 0.01 && b.rx <= 0.94)
      .sort((a, b) => a.rx - b.rx);

    const used = new Set();
    if (ceilCand) used.add(ceilCand);

    // หา width ก่อน (อยู่ช่วงกลางกรอบ rx 0.33..0.57 และค่า >= 20)
    const widthCand = topBand
      .filter(b => b.rx >= 0.33 && b.rx <= 0.57 && b.n >= 20)
      .sort((a, b) => Math.abs(a.rx - 0.45) - Math.abs(b.rx - 0.45))[0];
    if (widthCand) {
      wObj.width = fixLikelyDecimal(widthCand.val, 'dim');
      used.add(widthCand);
    }

    // ซ้ายของ width -> extL (ชิดกรอบ) และ wallL (ชิดซ้ายสุด)
    const leftTop = topBand.filter(b => !used.has(b) && b.rx < (widthCand ? widthCand.rx - 0.05 : 0.35)).sort((a, b) => a.rx - b.rx);
    if (leftTop.length >= 2) {
      wObj.wallL = fixLikelyDecimal(leftTop[0].val, 'wall');
      wObj.extL = fixLikelyDecimal(leftTop[leftTop.length - 1].val, 'ext');
      leftTop.forEach(b => used.add(b));
    } else if (leftTop.length === 1) {
      const b = leftTop[0];
      if (b.rx >= 0.18 || b.n <= 40) wObj.extL = fixLikelyDecimal(b.val, 'ext');
      else wObj.wallL = fixLikelyDecimal(b.val, 'wall');
      used.add(b);
    }

    // ขวาของ width (ry <= 0.38) -> extR (rx 0.54..0.72) และ wallR (rx > 0.72)
    const rightTop = topBand.filter(b => !used.has(b) && b.rx > (widthCand ? widthCand.rx + 0.05 : 0.54) && b.ry <= 0.38).sort((a, b) => a.rx - b.rx);
    if (rightTop.length >= 2) {
      wObj.extR = fixLikelyDecimal(rightTop[0].val, 'ext');
      wObj.wallR = fixLikelyDecimal(rightTop[rightTop.length - 1].val, 'wall');
      rightTop.forEach(b => used.add(b));
    } else if (rightTop.length === 1) {
      const b = rightTop[0];
      if (b.rx <= 0.70 || b.n <= 45) wObj.extR = fixLikelyDecimal(b.val, 'ext');
      else wObj.wallR = fixLikelyDecimal(b.val, 'wall');
      used.add(b);
    }

    // 4. แถบขวาแนวตั้ง (rx: 0.62..0.93, ry: 0.33..0.78, ไม่ซ้ำกับ topBand) -> extT, height, extB, floorB
    const rightCol = numBlobs
      .filter(b => !used.has(b) && b.rx >= 0.62 && b.rx <= 0.93 && b.ry >= 0.33 && b.ry <= 0.78)
      .sort((a, b) => a.ry - b.ry);
    for (const b of rightCol) {
      if (b.ry < 0.46 && !wObj.extT && b.n <= 150) {
        wObj.extT = fixLikelyDecimal(b.val, 'ext');
      } else if (b.ry >= 0.44 && b.ry <= 0.61 && !wObj.height && b.n >= 20) {
        wObj.height = fixLikelyDecimal(b.val, 'dim');
      } else if (b.ry > 0.58 && b.ry < 0.69 && !wObj.extB && b.n <= 150) {
        wObj.extB = fixLikelyDecimal(b.val, 'ext');
      } else if (b.ry >= 0.67 && !wObj.floorB) {
        wObj.floorB = fixLikelyDecimal(b.val, 'wall');
      }
      used.add(b);
    }

    // 5. ฝั่งซ้ายกลาง (rx: 0.02..0.28, ry: 0.44..0.75) -> fullH (สูงเต็ม)
    const fullHCand = numBlobs
      .filter(b => !used.has(b) && b.rx >= 0.02 && b.rx <= 0.28 && b.ry >= 0.44 && b.ry <= 0.75 && b.n >= 40)
      .sort((a, b) => b.n - a.n)[0];
    if (fullHCand) {
      wObj.fullH = fixLikelyDecimal(fullHCand.val, 'dim');
      used.add(fullHCand);
    }

    // 6. ด้านล่างกลาง (rx: 0.28..0.63, ry: 0.63..0.77) -> fullW (กว้างเต็ม)
    const fullWCand = numBlobs
      .filter(b => !used.has(b) && b.rx >= 0.28 && b.rx <= 0.63 && b.ry >= 0.63 && b.ry <= 0.77 && b.n >= 25)
      .sort((a, b) => Math.abs(a.rx - 0.46) - Math.abs(b.rx - 0.46))[0];
    if (fullWCand) {
      wObj.fullW = fixLikelyDecimal(fullWCand.val, 'dim');
      used.add(fullWCand);
    }

    return reconcileWindowDimensions(wObj);
  }

  /* Backward-compatible v24 spatial mapper */
  function mapSpatialNumbersToWindow(words, imgW, imgH, win) {
    if (!Array.isArray(words) || !words.length) return;
    const nums = [];
    words.forEach(wd => {
      const clean = normalizeOcrNumber(wd.text, { min: 1, max: 1200 });
      if (!clean) return;
      const bb = wd.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
      const cx = ((bb.x0 + bb.x1) / 2) / Math.max(1, imgW);
      const cy = ((bb.y0 + bb.y1) / 2) / Math.max(1, imgH);
      nums.push({ val: clean, n: parseFloat(clean), cx, cy });
    });
    if (!nums.length) return;

    const topNums = nums.filter(p => p.cy >= 0.04 && p.cy <= 0.32 && p.cx >= 0.15 && p.cx <= 0.78).sort((a, b) => a.cx - b.cx);
    const usedTop = new Set(topNums);
    if (topNums.length >= 3) {
      if (!win.extL && topNums[0].n <= 150) win.extL = topNums[0].val;
      if (!win.width) win.width = topNums[1].val;
      if (!win.extR && topNums[topNums.length - 1].n <= 150) win.extR = topNums[topNums.length - 1].val;
    } else if (topNums.length === 2) {
      const s = topNums.slice().sort((a, b) => b.n - a.n);
      if (!win.width && s[0].n >= 30) win.width = s[0].val;
    } else if (topNums.length === 1 && !win.width && topNums[0].n >= 30) {
      win.width = topNums[0].val;
    }

    const rightNums = nums.filter(p => !usedTop.has(p) && p.cx >= 0.70 && p.cx <= 0.99 && p.cy >= 0.22 && p.cy <= 0.88).sort((a, b) => a.cy - b.cy);
    if (rightNums.length >= 3) {
      if (!win.extT && rightNums[0].n <= 150) win.extT = rightNums[0].val;
      if (!win.height) win.height = rightNums[1].val;
      if (!win.extB && rightNums[rightNums.length - 1].n <= 150) win.extB = rightNums[rightNums.length - 1].val;
    } else if (rightNums.length === 2) {
      const s = rightNums.slice().sort((a, b) => b.n - a.n);
      if (!win.height && s[0].n >= 30) win.height = s[0].val;
    } else if (rightNums.length === 1 && !win.height && rightNums[0].n >= 30) {
      win.height = rightNums[0].val;
    }

    const leftFull = nums.find(p => p.cx < 0.23 && p.cy >= 0.35 && p.cy <= 0.75 && p.n >= 100);
    if (leftFull && !win.fullH) win.fullH = leftFull.val;
    const botFull = nums.find(p => p.cy >= 0.78 && p.cx >= 0.25 && p.cx <= 0.75 && p.n >= 50);
    if (botFull && !win.fullW) win.fullW = botFull.val;
  }

  /* =========================================================
     6. Heuristic Thai + Number Text Parser
     ========================================================= */
  function heuristicParseText(pages) {
    const fullText = toArabicDigits(pages.map(p => p.text || '').join('\n'));
    const draft = emptyDraft();
    if (!fullText.trim()) {
      const formPages = pages.filter(p => p.isFormPage !== false);
      if (formPages.length > 0) {
        draft.sheets = formPages.map((pg, i) => emptySheet(i + 1, pg.pageNo || (i + 1)));
      }
      return draft;
    }

    const mCust = /(?:ชื่อลูกค้า|ลูกค้า|CUSTOMER\s*NAME|คุณ)\s*[:：]?\s*([ก-๙a-zA-Z.\s()]{2,45})/i.exec(fullText);
    if (mCust) draft.customer.name = mCust[1].trim().replace(/\s{2,}/g, ' ');
    const mMob = /(0\d{1,2}[-\s]?\d{3}[-\s]?\d{4})/.exec(fullText);
    if (mMob) draft.customer.mobile = mMob[1].replace(/\s+/g, '');
    const mLoc = /(?:โครงการ|หมู่บ้าน|อาคาร|สถานที่ติดตั้ง|สถานที่)\s*[:：]?\s*([^\n\r]{2,55})/i.exec(fullText);
    if (mLoc) draft.customer.building = mLoc[1].trim();
    const mStaff = /(?:พนักงานขาย|ผู้ขอ|พนักงาน)\s*[:：]?\s*([ก-๙a-zA-Z.\s]{2,35})/i.exec(fullText);
    if (mStaff) draft.staff.name = mStaff[1].trim();

    const sheets = [];
    pages.forEach((pg, pi) => {
      const txt = toArabicDigits(pg.text || '');
      const mRoom = /(?:ห้อง|MAP\s*ROOM|ROOM)\s*[:：(]?\s*([ก-๙a-zA-Z0-9\s\-]{2,35})/i.exec(txt);
      const roomName = mRoom ? mRoom[1].replace(/^\)|^\(/g, '').trim() : `ห้องที่ ${pi + 1}`;
      const wins = [];
      const winRegex = /\b([WD]\s*\d+)\b[^\n\r]{0,55}?(\d{2,3}(?:\.\d+)?)\s*[xX×*]\s*(\d{2,3}(?:\.\d+)?)/g;
      let m;
      while ((m = winRegex.exec(txt)) !== null) {
        const lbl = m[1].replace(/\s+/g, '').toUpperCase();
        const num = lbl.replace(/^[WD]/, '') || String(wins.length + 1);
        const w = emptyWin(num);
        w.label = lbl; w.width = m[2]; w.height = m[3];
        w.curtainStyle1 = detectThaiCurtainStyle(txt);
        w.hookSize = detectHookSize(txt);
        wins.push(w);
      }
      if (!wins.length) {
        const thaiDimRe = /กว้าง\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)[^\d]{1,15}สูง\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)/g;
        let tm;
        while ((tm = thaiDimRe.exec(txt)) !== null && wins.length < 8) {
          const w = emptyWin(wins.length + 1);
          w.width = tm[1]; w.height = tm[2];
          w.curtainStyle1 = detectThaiCurtainStyle(txt);
          w.hookSize = detectHookSize(txt);
          wins.push(w);
        }
      }
      if (!wins.length) {
        const dimRegex = /(\d{2,3}(?:\.\d+)?)\s*[xX×*]\s*(\d{2,3}(?:\.\d+)?)/g;
        let dm;
        while ((dm = dimRegex.exec(txt)) !== null && wins.length < 8) {
          const w = emptyWin(wins.length + 1);
          w.width = dm[1]; w.height = dm[2];
          w.curtainStyle1 = detectThaiCurtainStyle(txt);
          w.hookSize = detectHookSize(txt);
          wins.push(w);
        }
      }
      if (!wins.length) wins.push(emptyWin(1));

      const matchedFab = fuzzyMatchFabricFromDb(txt);
      const sh = emptySheet(pi + 1, pg.pageNo || (pi + 1));
      sh.roomName = roomName;
      sh.fabrics.blackout.name = matchedFab;
      sh.windows = wins;
      sheets.push(sh);
    });
    if (sheets.length) draft.sheets = sheets;
    return draft;
  }

  /* =========================================================
     7. Exact PASAYA MTO Grid + Blob OCR Engine (v26)
     ========================================================= */
  async function ocrZoneText(worker, canvas, rect, inkMode, hasBlueInk, psm = '7', whitelist = '') {
    const meta = cropAndPreprocess(canvas, rect, inkMode, 2.0, {
      hasBlueInk,
      autoTrim: true,
      targetTextH: 44,
      minInkPixels: 14,
      padding: 24,
      returnMeta: true,
    });
    if (!meta || !meta.canvas) return '';
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      tessedit_char_whitelist: whitelist || '',
    });
    const res = await worker.recognize(meta.canvas);
    return toArabicDigits(String(res.data.text || '')).replace(/\s+/g, ' ').trim();
  }

  async function ocrSinglePasayaPage(pg, pi, totalPages, layoutMode, inkMode, workers, onStatus) {
    const { workerTha, workerEng } = workers;
    const useBlue = (inkMode === 'blue_only') || (inkMode === 'auto_blue' && pg.hasBlueInk);
    const g = pg.grid || detectPasayaGrid(pg.canvas);
    const logs = [];
    logs.push(
      `[โหมด] ${useBlue ? 'Blue-Ink Blob OCR' : 'ขาวดำ (' + inkMode + ')'} | ${g.isFormPage ? 'แบบฟอร์ม PASAYA' : 'แผ่นสเก็ตช์'} | ` +
      `X=[${(g.xLeft * 100).toFixed(1)}, ${(g.xMid * 100).toFixed(1)}, ${(g.xRight * 100).toFixed(1)}] ` +
      `Y=[H:${(g.yHeaderBot * 100).toFixed(1)} C:${(g.yCustBot * 100).toFixed(1)} Q:${(g.yQuadTop * 100).toFixed(1)}/${(g.yQuadMid * 100).toFixed(1)}/${(g.yQuadBot * 100).toFixed(1)}]`
    );

    if (layoutMode === 'freeform' || !g.isFormPage) {
      if (onStatus) onStatus(`📝 หน้า ${pg.pageNo}/${totalPages}: แผ่นสเก็ตช์เพิ่มเติม — กำลังอ่านข้อความ...`);
      const pre = cropAndPreprocess(pg.canvas, { x: 0.02, y: 0.02, w: 0.96, h: 0.96 }, inkMode, 1.35, {
        hasBlueInk: pg.hasBlueInk, autoTrim: false, padding: 16, returnMeta: true,
      });
      let txt = pg.text || '';
      if (pre && pre.canvas) {
        await workerTha.setParameters({ tessedit_pageseg_mode: '6', tessedit_char_whitelist: '' });
        const res = await workerTha.recognize(pre.canvas);
        txt = [txt, res.data.text || ''].join('\n').trim();
      }
      pg.ocrLog = logs.join('\n') + '\n[ข้อความสเก็ตช์] ' + txt.replace(/\s+/g, ' ').trim();
      const parsed = heuristicParseText([{ text: txt, pageNo: pg.pageNo }]);
      return {
        isSketchPage: !g.isFormPage && layoutMode !== 'freeform',
        sketchText: txt.replace(/\s+/g, ' ').trim(),
        customer: pi === 0 ? parsed.customer : null,
        staff: pi === 0 ? parsed.staff : null,
        sheet: parsed.sheets[0] || emptySheet(pi + 1, pg.pageNo),
      };
    }

    const formW = g.xRight - g.xLeft;
    const fx = (rx, rw) => ({ x: g.xLeft + rx * formW, w: rw * formW });
    const custH = Math.max(0.06, g.yCustBot - g.yHeaderBot);
    const mapH = Math.max(0.035, g.yQuadTop - g.yCustBot);

    // 1. ข้อมูลลูกค้าและสาขา (หน้าแรก — อ้างอิงจาก yHeaderBot..yCustBot แม่นเป๊ะ ไม่ทับแถบ PASAYA!)
    let customer = null, staff = null;
    if (pi === 0) {
      if (onStatus) onStatus(`🔍 หน้า ${pg.pageNo}/${totalPages}: กำลังอ่านข้อมูลลูกค้า (ชื่อ, ที่อยู่, เบอร์โทร)...`);
      customer = { name: '', mobile: '', building: '', road: '', district: '', province: '' };
      staff = { orderNo: '-', name: '', branch: '' };

      const cName = await ocrZoneText(workerTha, pg.canvas, { ...fx(0.14, 0.50), y: g.yHeaderBot + custH * 0.04, h: custH * 0.21 }, inkMode, pg.hasBlueInk, '7');
      const cAddrNo = await ocrZoneText(workerEng, pg.canvas, { ...fx(0.15, 0.16), y: g.yHeaderBot + custH * 0.20, h: custH * 0.18 }, inkMode, pg.hasBlueInk, '7', '0123456789/- ');
      const cRoad = await ocrZoneText(workerTha, pg.canvas, { ...fx(0.43, 0.27), y: g.yHeaderBot + custH * 0.20, h: custH * 0.18 }, inkMode, pg.hasBlueInk, '7');
      const cBldg = await ocrZoneText(workerTha, pg.canvas, { ...fx(0.07, 0.30), y: g.yHeaderBot + custH * 0.36, h: custH * 0.20 }, inkMode, pg.hasBlueInk, '7');
      const cMobRaw = await ocrZoneText(workerEng, pg.canvas, { ...fx(0.07, 0.26), y: g.yHeaderBot + custH * 0.66, h: custH * 0.22 }, inkMode, pg.hasBlueInk, '7', '0123456789- ');
      const cBranch = await ocrZoneText(workerEng, pg.canvas, { ...fx(0.80, 0.19), y: g.yHeaderBot + custH * 0.32, h: custH * 0.35 }, inkMode, pg.hasBlueInk, '6', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/- ');

      if (cName) customer.name = cName;
      if (cBldg) customer.building = [cAddrNo, cBldg].filter(Boolean).join(' ');
      else if (cAddrNo) customer.building = cAddrNo;
      if (cRoad) customer.road = cRoad;
      const mobDigits = cMobRaw.replace(/\s+/g, '');
      const mMob = /(0\d{1,2}-?\d{3}-?\d{4})/.exec(mobDigits);
      if (mMob) customer.mobile = mMob[1];
      else if (mobDigits.replace(/[^\d]/g, '').length >= 9) customer.mobile = mobDigits;
      if (cBranch) staff.branch = cBranch.slice(0, 18);

      logs.push(`[ลูกค้า] ชื่อ="${customer.name}" | โทร="${customer.mobile}" | สถานที่="${customer.building}" | ถนน="${customer.road}" | สาขา="${staff.branch}"`);
    }

    // 2. ชื่อห้อง (MAP ROOM) & หมายเหตุ (อ้างอิงจาก yCustBot..yQuadTop ครบไม่แหว่ง!)
    if (onStatus) onStatus(`🔍 หน้า ${pg.pageNo}/${totalPages}: กำลังอ่านชื่อห้อง...`);
    const shObj = emptySheet(pi + 1, pg.pageNo);
    shObj.windows = [];

    const roomRect = { ...fx(0.11, 0.26), y: g.yCustBot + mapH * 0.22, h: mapH * 0.74 };
    const roomTxt = await ocrZoneText(workerTha, pg.canvas, roomRect, inkMode, pg.hasBlueInk, '7');
    const noteTxt = await ocrZoneText(workerTha, pg.canvas, { ...fx(0.37, 0.37), y: g.yCustBot + mapH * 0.05, h: mapH * 0.88 }, inkMode, pg.hasBlueInk, '6');
    if (roomTxt) {
      shObj.roomName = roomTxt.replace(/^(?:MAP\s*ROOM|ROOM|ห้อง)\s*[:：)]?\s*/i, '').trim() || `ห้องที่ ${pi + 1}`;
    }
    if (noteTxt && noteTxt.length >= 2) shObj.notes.push(noteTxt);
    logs.push(`[ห้อง] "${shObj.roomName}"${noteTxt ? ' | หมายเหตุ: ' + noteTxt : ''}`);

    // 3. 4 ช่องหน้าต่าง/ประตู (ใช้พิกัดตารางจริง 100% + Connected-Component Blob OCR!)
    const qH1 = g.yQuadMid - g.yQuadTop;
    const qH2 = g.yQuadBot - g.yQuadMid;
    const qW1 = g.xMid - g.xLeft;
    const qW2 = g.xRight - g.xMid;
    const quads = [
      { idx: 1, x: g.xLeft, y: g.yQuadTop, w: qW1, h: qH1 },
      { idx: 2, x: g.xMid,  y: g.yQuadTop, w: qW2, h: qH1 },
      { idx: 3, x: g.xLeft, y: g.yQuadMid, w: qW1, h: qH2 },
      { idx: 4, x: g.xMid,  y: g.yQuadMid, w: qW2, h: qH2 },
    ];

    for (let qi = 0; qi < quads.length; qi++) {
      if (ocrCancelRequested) break;
      const q = quads[qi];

      if (useBlue) {
        const qInk = measureBlueInkInRect(pg.canvas, {
          x: q.x + 0.008, y: q.y + 0.008, w: q.w - 0.016, h: q.h - 0.016,
        }, false);
        if (qInk.ratio < 0.00055 || qInk.count < 80) {
          logs.push(`[บาน ${q.idx}] (ว่าง — ข้ามอัตโนมัติ)`);
          continue;
        }
      }

      if (onStatus) onStatus(`🔍 หน้า ${pg.pageNo}/${totalPages} (${shObj.roomName}): กำลังอ่านตัวเลขบานที่ ${q.idx}/4...`);
      const wObj = emptyWin(q.idx);
      const rel = (rx, ry, rw, rh) => ({
        x: Math.max(0, Math.min(0.99, q.x + rx * q.w)),
        y: Math.max(0, Math.min(0.99, q.y + ry * q.h)),
        w: Math.max(0.004, Math.min(1, rw * q.w)),
        h: Math.max(0.004, Math.min(1, rh * q.h)),
      });

      // 3a. เช็คบ็อกซ์ กล่องม่าน & ขาจับราง (ความหนาแน่นหมึก — แม่นยำมาก)
      if (useBlue) {
        const inkBoxNo = measureBlueInkInRect(pg.canvas, rel(0.225, 0.075, 0.080, 0.095), true).ratio;
        const inkBoxYes = measureBlueInkInRect(pg.canvas, rel(0.335, 0.075, 0.080, 0.095), true).ratio;
        if (Math.max(inkBoxNo, inkBoxYes) >= 0.008) {
          if (inkBoxYes > inkBoxNo * 1.25) wObj.box = 'Yes';
          else if (inkBoxNo > inkBoxYes * 1.25) wObj.box = 'No';
        }
        const inkWall = measureBlueInkInRect(pg.canvas, rel(0.225, 0.145, 0.080, 0.095), true).ratio;
        const inkCeil = measureBlueInkInRect(pg.canvas, rel(0.335, 0.145, 0.080, 0.095), true).ratio;
        if (Math.max(inkWall, inkCeil) >= 0.008) {
          if (inkCeil > inkWall * 1.25) wObj.mount = 'เพดาน';
          else if (inkWall > inkCeil * 1.25) wObj.mount = 'ผนัง';
        }
      }

      // 3b. รูปแบบม่าน & ตะขอ (แถวหัวช่อง)
      const styleRaw = await ocrZoneText(workerTha, pg.canvas, rel(0.18, -0.01, 0.42, 0.12), inkMode, pg.hasBlueInk, '7');
      const detStyle = detectThaiCurtainStyle(styleRaw);
      if (detStyle) wObj.curtainStyle1 = detStyle;

      const hookRaw = await ocrZoneText(workerEng, pg.canvas, rel(0.62, -0.01, 0.25, 0.12), inkMode, pg.hasBlueInk, '8', '0123456789No. ');
      const detHook = detectHookSize(hookRaw, true);
      if (detHook) wObj.hookSize = detHook;

      // 3c. Connected-Component Word-Blob OCR (แยกโซนไดอะแกรม ry: 0..0.77 ออกจากแถวรางม่าน ry: 0.775..0.858)
      const blobDebug = [];
      if (useBlue) {
        const sx = Math.max(0, Math.floor(q.x * pg.canvas.width));
        const sy = Math.max(0, Math.floor(q.y * pg.canvas.height));
        const sw = Math.max(10, Math.min(pg.canvas.width - sx, Math.ceil(q.w * pg.canvas.width)));
        const sh = Math.max(10, Math.min(pg.canvas.height - sy, Math.ceil(q.h * pg.canvas.height)));
        const sd = pg.canvas.getContext('2d', { willReadFrequently: true }).getImageData(sx, sy, sw, sh).data;

        const len = sw * sh;
        const inkGray = new Uint8Array(len);
        const binDiag = new Uint8Array(len);
        const diagCutY = Math.floor(sh * 0.775);

        for (let y = 0; y < sh; y++) {
          for (let x = 0; x < sw; x++) {
            const p = y * sw + x;
            const idx = p * 4;
            const str = blueInkStrength(sd[idx], sd[idx + 1], sd[idx + 2]);
            if (str > 0) {
              inkGray[p] = str;
              if (y < diagCutY) binDiag[p] = 1;
            }
          }
        }

        const blobs = segmentInkBlobs(binDiag, sw, sh);
        const numBlobs = [];

        for (const b of blobs) {
          // ตรวจเลขบานมุมซ้ายบน (rx < 0.15, ry < 0.14)
          if (b.rx < 0.15 && b.ry < 0.14) {
            const c = renderBlobToOcrCanvas(inkGray, sw, sh, b, 44, 24);
            const dig = await recognizeNumericCanvas(workerEng, c, 0.8, { min: 1, max: 20 });
            if (dig && !dig.includes('.')) { wObj.planNo = dig; wObj.label = 'W' + dig; }
            continue;
          }
          if (b.ry < 0.18 && b.rx < 0.54) continue;
          if (b.rx >= 0.21 && b.rx <= 0.44 && b.ry >= 0.08 && b.ry <= 0.24) continue;
          if (b.ry < 0.11) continue;

          const c = renderBlobToOcrCanvas(inkGray, sw, sh, b, 48, 28);
          const aspect = b.w / Math.max(1, b.h);
          const val = await recognizeNumericCanvas(workerEng, c, aspect, { min: 1, max: 6505 });
          if (val) {
            numBlobs.push({ val, n: parseFloat(val), rx: b.rx, ry: b.ry });
            blobDebug.push(`${val}@(${(b.rx * 100).toFixed(0)},${(b.ry * 100).toFixed(0)})`);
          } else if (b.area >= 24) {
            blobDebug.push(`?@(${(b.rx * 100).toFixed(0)},${(b.ry * 100).toFixed(0)})`);
          }
        }

        // แยกอ่านแถวที่ 1 ของตารางคำนวณ (รางม่าน: railW x railH = tracks) ที่ ry = 0.778..0.858
        // เพื่อตัดแถวผ้าทึบ/โปร่งที่ซ้อนติดกันด้านล่างออก 100% (แก้ปัญหา 500/166/266 แตะกัน!)
        const railCells = [
          { key: 'railW',      rx: 0.15, rw: 0.21, range: { min: 20, max: 6505 }, fType: 'dim',  aspect: 2.0 },
          { key: 'railH',      rx: 0.37, rw: 0.19, range: { min: 20, max: 6505 }, fType: 'dim',  aspect: 2.0 },
          { key: 'railTracks', rx: 0.56, rw: 0.12, range: { min: 1,  max: 6 },    fType: 'int',  aspect: 0.8 },
        ];
        for (const rc of railCells) {
          const meta = cropAndPreprocess(pg.canvas, rel(rc.rx, 0.778, rc.rw, 0.080), inkMode, 2.2, {
            hasBlueInk: pg.hasBlueInk, autoTrim: true, targetTextH: 48, minInkPixels: 14, padding: 26, returnMeta: true,
          });
          if (!meta || !meta.canvas) continue;
          const v = await recognizeNumericCanvas(workerEng, meta.canvas, rc.aspect, rc.range);
          if (v) {
            wObj[rc.key] = rc.fType === 'int' ? String(Math.round(parseFloat(v))) : fixLikelyDecimal(v, rc.fType);
            blobDebug.push(`${rc.key}=${wObj[rc.key]}`);
          }
        }

        assignBlobsToWindow(numBlobs, wObj);
      } else {
        // Fallback โหมดขาวดำ
        const diagC = cropAndPreprocess(pg.canvas, rel(0.01, 0.18, 0.96, 0.62), inkMode, 1.9, { hasBlueInk: false });
        if (diagC) {
          await workerEng.setParameters({ tessedit_char_whitelist: '0123456789.+/-xX ', tessedit_pageseg_mode: '6' });
          const diagRes = await workerEng.recognize(diagC);
          mapSpatialNumbersToWindow(diagRes.data.words || [], diagC.width, diagC.height, wObj);
        }
        const calcC = cropAndPreprocess(pg.canvas, rel(0.15, 0.75, 0.56, 0.14), inkMode, 2.0, { hasBlueInk: false });
        if (calcC) {
          await workerEng.setParameters({ tessedit_char_whitelist: '0123456789.xX= ', tessedit_pageseg_mode: '7' });
          const calcRes = await workerEng.recognize(calcC);
          const mDim = /(\d{2,3}(?:\.\d+)?)\s*[xX×]\s*(\d{2,3}(?:\.\d+)?)/.exec(calcRes.data.text || '');
          if (mDim) { wObj.railW = mDim[1]; wObj.railH = mDim[2]; }
        }
        reconcileWindowDimensions(wObj);
      }

      const hasAnyVal = !!(wObj.width || wObj.height || wObj.fullW || wObj.fullH || wObj.railW || wObj.railH || wObj.curtainStyle1);
      logs.push(
        `[บาน ${q.idx}] ${wObj.label} กว้าง=${wObj.width || '-'} สูง=${wObj.height || '-'} ` +
        `(+ซ${wObj.extL || '-'} +ข${wObj.extR || '-'} +บ${wObj.extT || '-'} +ล${wObj.extB || '-'}) ` +
        `เต็ม=${wObj.fullW || '-'}x${wObj.fullH || '-'} ราง=${wObj.railW || '-'}x${wObj.railH || '-'} ` +
        `${wObj.curtainStyle1 || ''} ${wObj.hookSize || ''} กล่อง:${wObj.box || '-'} ขา:${wObj.mount || '-'}` +
        (blobDebug.length ? `\n   ↳ blobs: ${blobDebug.join(', ')}` : '')
      );
      if (hasAnyVal || q.idx === 1) {
        shObj.windows.push(wObj);
      }
    }

    // 4. ตารางผ้าม่าน/มู่ลี่ และ รางม่าน (ใช้ workerEng ล้วน เพื่อให้ชื่อภาษาอังกฤษ PLENARY / CLASSIC-AM / NOVA NANO ไม่เพี้ยนเป็นไทย!)
    if (!ocrCancelRequested) {
      if (onStatus) onStatus(`🔍 หน้า ${pg.pageNo}/${totalPages} (${shObj.roomName}): กำลังอ่านตารางผ้าและรางม่าน...`);
      const fabBaseY = g.yQuadBot;
      const fabCols = [
        { key: 'blackout', rx: 0.145, rw: 0.160, isBlind: false },
        { key: 'sheer',    rx: 0.305, rw: 0.162, isBlind: false },
        { key: 'roller',   rx: 0.467, rw: 0.162, isBlind: true },
        { key: 'blinds',   rx: 0.629, rw: 0.165, isBlind: true },
      ];
      const engCodeWL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/ .';

      for (const fc of fabCols) {
        const colRect = { ...fx(fc.rx, fc.rw), y: fabBaseY + 0.020, h: 0.056 };
        if (useBlue && measureBlueInkInRect(pg.canvas, colRect, true).ratio < 0.0016) continue;

        const rawName = await ocrZoneText(workerEng, pg.canvas, { ...fx(fc.rx, fc.rw), y: fabBaseY + 0.020, h: 0.021 }, inkMode, pg.hasBlueInk, '7', engCodeWL);
        const rawDes  = await ocrZoneText(workerEng, pg.canvas, { ...fx(fc.rx, fc.rw), y: fabBaseY + 0.039, h: 0.020 }, inkMode, pg.hasBlueInk, '7', engCodeWL);
        const rawCol  = await ocrZoneText(workerEng, pg.canvas, { ...fx(fc.rx, fc.rw), y: fabBaseY + 0.056, h: 0.020 }, inkMode, pg.hasBlueInk, '7', engCodeWL);

        if (!fc.isBlind) {
          const fabList = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.fabrics)) ? masterDB.fabrics : [];
          const hit = fuzzyMatchDbItem([rawName, rawDes].filter(Boolean).join(' '), fabList, ['name', 'design'], 0.60);
          shObj.fabrics[fc.key].name = hit ? hit.name : rawName;
          shObj.fabrics[fc.key].design = rawDes || (hit && hit.design) || '';
          shObj.fabrics[fc.key].color = rawCol;
          if (shObj.fabrics[fc.key].name || rawCol) {
            logs.push(`[${fc.key}] "${shObj.fabrics[fc.key].name}" / "${shObj.fabrics[fc.key].design}" / "${shObj.fabrics[fc.key].color}"`);
          }
        } else {
          const blindList = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.blinds)) ? masterDB.blinds : [];
          const hit = fuzzyMatchDbItem([rawName, rawDes].filter(Boolean).join(' '), blindList, ['name', 'group'], 0.60);
          shObj.fabrics[fc.key].group = hit ? (hit.group || '') : '';
          shObj.fabrics[fc.key].name = hit ? hit.name : [rawName, rawDes].filter(Boolean).join(' ');
          shObj.fabrics[fc.key].color = rawCol;
          if (shObj.fabrics[fc.key].name || rawCol) {
            logs.push(`[${fc.key}] "${shObj.fabrics[fc.key].name}" / "${shObj.fabrics[fc.key].color}"`);
          }
        }
      }

      // แถบรางม่าน (ใช้ workerEng + fuzzyMatch masterDB.rails)
      const railList = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.rails)) ? masterDB.rails : [];
      const waveRaw = await ocrZoneText(workerEng, pg.canvas, { ...fx(0.68, 0.21), y: fabBaseY + 0.088, h: 0.028 }, inkMode, pg.hasBlueInk, '7', engCodeWL);
      if (waveRaw) {
        const rHit = fuzzyMatchDbItem(waveRaw, railList, ['name'], 0.60);
        shObj.rods.wave = rHit ? rHit.name : waveRaw;
        logs.push(`[รางลอน] "${shObj.rods.wave}" (ดิบ: ${waveRaw})`);
      }
      const pleatRaw = await ocrZoneText(workerEng, pg.canvas, { ...fx(0.68, 0.21), y: fabBaseY + 0.114, h: 0.028 }, inkMode, pg.hasBlueInk, '7', engCodeWL);
      if (pleatRaw) {
        const rHit = fuzzyMatchDbItem(pleatRaw, railList, ['name'], 0.60);
        shObj.rods.pleat = rHit ? rHit.name : pleatRaw;
        logs.push(`[รางจีบ/พับ] "${shObj.rods.pleat}" (ดิบ: ${pleatRaw})`);
      }
    }

    if (!shObj.windows.length) shObj.windows.push(emptyWin(1));
    pg.ocrLog = logs.join('\n');
    return { isSketchPage: false, customer, staff, sheet: shObj };
  }

  /* =========================================================
     8. OCR Runners & Drag-Crop OCR
     ========================================================= */
  function setStatus(msg, isErr = false) {
    const el = document.getElementById('pdfImpStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.style.color = isErr ? '#b91c1c' : '#0f5132';
    el.style.background = isErr ? '#fee2e2' : '#dcfce7';
    el.style.borderColor = isErr ? '#fca5a5' : '#86efac';
    el.hidden = !msg;
  }

  function setProgress(pct, show = true) {
    const wrap = document.getElementById('pdfImpProgressWrap');
    const fill = document.getElementById('pdfImpProgressFill');
    if (wrap) wrap.hidden = !show;
    if (fill) fill.style.width = Math.max(0, Math.min(100, Math.round(pct))) + '%';
  }

  async function runLocalOcr(onlyPageIdx = null) {
    if (ocrBusy) {
      ocrCancelRequested = true;
      setStatus('⏹ กำลังหยุดการอ่าน OCR...');
      return;
    }
    if (!pageItems.length) {
      setStatus('กรุณาเลือกไฟล์ PDF แปลนงานก่อนเริ่มอ่าน OCR', true);
      return;
    }

    const layoutMode = (document.getElementById('pdfImpLayoutMode') || {}).value || 'mto_form';
    const inkMode = (document.getElementById('pdfImpInkMode') || {}).value || 'auto_blue';
    const btn = document.getElementById('pdfImpRunOcrBtn');
    ocrBusy = true;
    ocrCancelRequested = false;
    if (btn) btn.textContent = '⏹ หยุดอ่าน OCR';
    setProgress(5, true);
    setStatus('⏳ กำลังเตรียมเอนจิน OCR ภาษาไทย + ตัวเลข (ทำงานในเบราว์เซอร์ 100% ไม่ใช้ AI)...');

    try {
      const workers = await ensureOcrWorkers((pct, msg) => {
        setProgress(pct, true);
        setStatus(msg);
      });

      const isSingle = (onlyPageIdx !== null && onlyPageIdx !== undefined && pageItems[onlyPageIdx]);
      if (!draftData) draftData = emptyDraft();

      if (isSingle) {
        const pg = pageItems[onlyPageIdx];
        setProgress(35, true);
        const res = await ocrSinglePasayaPage(pg, onlyPageIdx, pageItems.length, layoutMode, inkMode, workers, msg => setStatus(msg));
        if (onlyPageIdx === 0 && res.customer) Object.assign(draftData.customer, res.customer);
        if (onlyPageIdx === 0 && res.staff) Object.assign(draftData.staff, res.staff);

        const existingIdx = draftData.sheets.findIndex(s => s.sourcePageNo === pg.pageNo);
        if (existingIdx >= 0) draftData.sheets[existingIdx] = res.sheet;
        else draftData.sheets.push(res.sheet);

        renderPagesPreview();
        renderReviewForm();
        setProgress(100, false);
        const wCnt = res.sheet && res.sheet.windows ? res.sheet.windows.length : 0;
        setStatus(`✔ อ่านหน้า ${pg.pageNo} ("${res.sheet.roomName}") เสร็จสิ้น (${wCnt} บาน) — ตรวจสอบ/แก้ไขตัวเลขฝั่งขวา หรือลากกรอบบนภาพอ่านเพิ่มเฉพาะจุดได้ทันที`);
      } else {
        const newDraft = emptyDraft();
        newDraft.sheets = [];
        const totalPages = pageItems.length;

        for (let pi = 0; pi < totalPages; pi++) {
          if (ocrCancelRequested) break;
          const pg = pageItems[pi];
          const basePct = 25 + (pi / totalPages) * 72;
          setProgress(basePct, true);
          const res = await ocrSinglePasayaPage(pg, pi, totalPages, layoutMode, inkMode, workers, msg => setStatus(msg));
          if (pi === 0 && res.customer) Object.assign(newDraft.customer, res.customer);
          if (pi === 0 && res.staff) Object.assign(newDraft.staff, res.staff);

          if (res.isSketchPage) {
            if (newDraft.sheets.length > 0 && res.sketchText) {
              newDraft.sheets[newDraft.sheets.length - 1].notes.push(`[หน้า ${pg.pageNo} สเก็ตช์] ${res.sketchText.slice(0, 120)}`);
            }
          } else if (res.sheet) {
            newDraft.sheets.push(res.sheet);
          }
          setProgress(basePct + (72 / totalPages), true);
        }

        if (!newDraft.sheets.length) newDraft.sheets.push(emptySheet(1, 1));
        draftData = newDraft;
        renderPagesPreview();
        renderReviewForm();
        const totalWins = draftData.sheets.reduce((s, sh) => s + (sh.windows ? sh.windows.length : 0), 0);
        setProgress(100, false);
        setStatus(
          ocrCancelRequested
            ? `⏹ หยุดอ่าน OCR แล้ว (ได้ข้อมูล ${draftData.sheets.length} ห้อง / ${totalWins} บาน)`
            : `✔ อ่านลายมือเสร็จสิ้นครบทุกหน้า! (${draftData.sheets.length} ห้อง / ${totalWins} บาน) — คลิกช่องใดก็ได้แล้วลากกรอบบนภาพ PDF เพื่อแก้เฉพาะจุดเพิ่มเติมได้`
        );
      }
    } catch (err) {
      console.warn('Local OCR error:', err);
      setProgress(0, false);
      setStatus(`⚠️ อ่าน OCR ไม่สำเร็จ (${err.message || err})`, true);
    } finally {
      ocrBusy = false;
      ocrCancelRequested = false;
      if (btn) { btn.disabled = false; btn.textContent = '🔍 อ่านทุกหน้า (OCR)'; }
    }
  }

  async function runCropOcrOnRegion(pageIdx, normRect) {
    if (ocrBusy) return;
    const pg = pageItems[pageIdx];
    if (!pg || !pg.canvas) return;
    if (!activeTargetInput || !document.body.contains(activeTargetInput)) {
      setStatus('💡 กรุณาคลิกเลือกช่องกรอกฝั่งขวาก่อน แล้วจึงลากกรอบคลุมตัวเลข/ข้อความบนภาพ PDF ด้านซ้าย', true);
      return;
    }

    const isNumericField = activeTargetInput.type === 'number' || activeTargetInput.dataset.pdfNumeric === '1';
    const inkMode = (document.getElementById('pdfImpInkMode') || {}).value || 'auto_blue';
    ocrBusy = true;
    setStatus(`⏳ กำลังอ่านเฉพาะจุดที่ลากกรอบ (${isNumericField ? 'โหมดตัวเลข' : 'โหมดภาษาไทย+อังกฤษ'})...`);

    try {
      const { workerTha, workerEng } = await ensureOcrWorkers();
      const meta = cropAndPreprocess(pg.canvas, normRect, inkMode, 2.2, {
        hasBlueInk: pg.hasBlueInk, autoTrim: true, targetTextH: 46, minInkPixels: 10, padding: 26, returnMeta: true,
      });
      if (!meta || !meta.canvas) {
        setStatus('⚠️ ไม่พบลายมือในกรอบที่ลาก (ลองลากให้คลุมตัวเลข หรือเปลี่ยนโหมดหมึกเป็น "หมึกขาวดำปกติ")', true);
        return;
      }

      let finalVal = '';
      if (isNumericField) {
        finalVal = await recognizeNumericCanvas(workerEng, meta.canvas, normRect.w / Math.max(0.01, normRect.h), { min: 0, max: 9999 });
      } else {
        await workerTha.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: '' });
        const res = await workerTha.recognize(meta.canvas);
        finalVal = toArabicDigits(String(res.data.text || '').trim()).replace(/\s+/g, ' ').trim();
      }

      if (finalVal) {
        activeTargetInput.value = finalVal;
        activeTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
        setStatus(`✔ อ่านเฉพาะจุดได้ค่า "${finalVal}" ลงในช่องที่เลือกแล้ว!`);
      } else {
        setStatus(`⚠️ ไม่พบ${isNumericField ? 'ตัวเลข' : 'ข้อความ'}ในกรอบที่ลาก (ลองเปลี่ยนโหมดหมึกแล้วลากซ้ำ)`, true);
      }
    } catch (err) {
      setStatus(`⚠️ อ่านเฉพาะจุดไม่สำเร็จ: ${err.message || err}`, true);
    } finally {
      ocrBusy = false;
    }
  }

  /* =========================================================
     9. UI Rendering
     ========================================================= */
  function renderPagesPreview() {
    const box = document.getElementById('pdfImpPreview');
    if (!box) return;
    if (!pageItems.length) {
      box.innerHTML = `<div class="hint c" style="padding:30px">📄 เลือกไฟล์ PDF แปลนงานลายมือเขียนด้านบน<br><small>ระบบจะแยกหมึกปากกาน้ำเงินออกจากแบบฟอร์มอัตโนมัติ และอ่านตัวเลข+ภาษาไทยด้วย OCR ในเครื่อง (ไม่ใช้ AI)</small></div>`;
      return;
    }
    box.innerHTML = pageItems.map((pg, pi) => {
      const badgeInk = pg.hasBlueInk
        ? `<span class="pdf-imp-badge blue">🖊️ หมึกน้ำเงิน</span>`
        : `<span class="pdf-imp-badge gray">🖨️ ขาวดำ</span>`;
      const badgeForm = pg.isFormPage
        ? `<span class="pdf-imp-badge green">📋 แบบฟอร์ม MTO</span>`
        : `<span class="pdf-imp-badge amber">📝 แผ่นสเก็ตช์</span>`;
      const imgSrc = (pg.showInkPreview && pg.inkPreviewUrl) ? pg.inkPreviewUrl : pg.dataUrl;
      return `
        <div class="pdf-imp-page-card">
          <div class="inline" style="justify-content:space-between;margin-bottom:5px;flex-wrap:wrap;gap:4px">
            <div class="inline" style="gap:4px;flex-wrap:wrap">
              <span style="font-size:12px;font-weight:700;color:#1e293b">หน้า ${pg.pageNo}/${pageItems.length}</span>
              ${badgeForm}${badgeInk}
            </div>
            <div class="inline" style="gap:4px">
              ${pg.hasBlueInk ? `<button type="button" data-pdf-toggle-ink="${pi}" style="padding:2px 7px;font-size:11px">${pg.showInkPreview ? '🖼️ ภาพต้นฉบับ' : '👁️ ดูภาพแยกหมึก'}</button>` : ''}
              <button type="button" class="primary" data-pdf-ocr-page="${pi}" style="padding:2px 8px;font-size:11px">🔍 อ่านหน้านี้</button>
            </div>
          </div>
          <div class="pdf-imp-img-wrap" data-pdf-crop-page="${pi}">
            <img src="${imgSrc}" alt="PDF page ${pg.pageNo}" draggable="false">
          </div>
          ${pg.ocrLog ? `
            <details style="margin-top:4px;font-size:11px">
              <summary style="cursor:pointer;color:#475569">📋 ดูผลวิเคราะห์ OCR หน้า ${pg.pageNo}</summary>
              <pre style="margin:3px 0 0;padding:5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;white-space:pre-wrap;max-height:160px;overflow:auto">${escP(pg.ocrLog)}</pre>
            </details>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  function renderReviewForm() {
    const box = document.getElementById('pdfImpReview');
    if (!box) return;
    if (!draftData) draftData = emptyDraft();
    const curOpts = sel => `<option value="">-- เลือก --</option>` +
      (typeof masterDB !== 'undefined' && masterDB.curtains || []).map(c =>
        `<option value="${escP(c.name)}" ${sel === c.name ? 'selected' : ''}>${escP(c.name)}</option>`
      ).join('');
    const hookOpts = sel => ['', 'No.5', 'No.6', 'No.8', 'No.9'].map(h =>
      `<option value="${h}" ${sel === h ? 'selected' : ''}>${h || '-'}</option>`
    ).join('');
    const boxOpts = sel => [['', '-'], ['No', 'No'], ['Yes', 'Yes']].map(([v, l]) =>
      `<option value="${v}" ${sel === v ? 'selected' : ''}>${l}</option>`
    ).join('');
    const mountOpts = sel => [['', '-'], ['ผนัง', 'ผนัง'], ['เพดาน', 'เพดาน']].map(([v, l]) =>
      `<option value="${v}" ${sel === v ? 'selected' : ''}>${l}</option>`
    ).join('');

    box.innerHTML = `
      <div class="subcard" style="margin-bottom:8px;background:#f8fafc">
        <b>👤 ข้อมูลลูกค้า &amp; สถานที่ติดตั้ง</b>
        <div class="grid2" style="margin-top:4px">
          <label>ชื่อลูกค้า <input data-pdf-field="customer.name" data-pdf-label="ชื่อลูกค้า" value="${escP(draftData.customer.name)}"></label>
          <label>เบอร์มือถือ <input data-pdf-field="customer.mobile" data-pdf-label="เบอร์มือถือ" value="${escP(draftData.customer.mobile)}"></label>
          <label>สถานที่ติดตั้ง / หมู่บ้าน / อาคาร <input data-pdf-field="customer.building" data-pdf-label="สถานที่ติดตั้ง" value="${escP(draftData.customer.building)}"></label>
          <label>ถนน / สาขา <input data-pdf-field="customer.road" data-pdf-label="ถนน" value="${escP(draftData.customer.road)}"></label>
        </div>
      </div>
      ${draftData.sheets.map((sh, si) => `
        <div class="subcard" style="margin-bottom:8px;border-left:3px solid #1f6feb">
          <div class="inline" style="justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:6px">
            <label style="flex:1;min-width:160px;font-weight:700">🏠 ห้องที่ ${si + 1}${sh.sourcePageNo ? ` <span class="pdf-imp-badge gray">หน้า ${sh.sourcePageNo}</span>` : ''}
              <input data-pdf-sh="${si}.roomName" data-pdf-label="ชื่อห้องที่ ${si + 1}" value="${escP(sh.roomName)}" placeholder="ชื่อห้อง">
            </label>
            <div class="inline" style="margin-top:14px">
              <button type="button" data-pdf-add-win="${si}" style="padding:3px 8px;font-size:11.5px">➕ เพิ่มบาน</button>
              ${draftData.sheets.length > 1 ? `<button type="button" class="danger" data-pdf-del-sh="${si}" style="padding:3px 8px;font-size:11.5px">ลบห้อง</button>` : ''}
            </div>
          </div>
          <div class="grid3" style="margin-bottom:6px;gap:5px">
            <label>ผ้าม่านทึบ <input data-pdf-sh="${si}.fabrics.blackout.name" data-pdf-label="ผ้าม่านทึบ" value="${escP(sh.fabrics.blackout.name)}" placeholder="ชื่อผ้าทึบ"></label>
            <label>ดีไซน์ทึบ <input data-pdf-sh="${si}.fabrics.blackout.design" data-pdf-label="ดีไซน์ทึบ" value="${escP(sh.fabrics.blackout.design)}" placeholder="รหัสดีไซน์"></label>
            <label>สีผ้าทึบ <input data-pdf-sh="${si}.fabrics.blackout.color" data-pdf-label="สีผ้าทึบ" value="${escP(sh.fabrics.blackout.color)}" placeholder="สี"></label>
            <label>ผ้าม่านโปร่ง <input data-pdf-sh="${si}.fabrics.sheer.name" data-pdf-label="ผ้าม่านโปร่ง" value="${escP(sh.fabrics.sheer.name)}" placeholder="ชื่อผ้าโปร่ง"></label>
            <label>ม่านม้วน/มู่ลี่ <input data-pdf-sh="${si}.fabrics.blinds.name" data-pdf-label="มู่ลี่/ม่านม้วน" value="${escP(sh.fabrics.blinds.name || sh.fabrics.roller.name)}" placeholder="รุ่นมู่ลี่/ม่านม้วน"></label>
            <label>รางม่านลอน <input data-pdf-sh="${si}.rods.wave" data-pdf-label="รางม่านลอน" value="${escP(sh.rods && sh.rods.wave || '')}" placeholder="เช่น NOVA NANO"></label>
          </div>
          <div style="overflow-x:auto">
            <table class="ed-tbl" style="min-width:760px">
              <thead>
                <tr>
                  <th style="width:46px">จุด</th>
                  <th style="width:58px">กว้าง</th>
                  <th style="width:58px">สูง</th>
                  <th style="width:44px">+ซ้าย</th>
                  <th style="width:44px">+ขวา</th>
                  <th style="width:44px">+บน</th>
                  <th style="width:44px">+ล่าง</th>
                  <th style="width:56px">เต็มก.</th>
                  <th style="width:56px">เต็มส.</th>
                  <th style="min-width:92px">รูปแบบม่าน</th>
                  <th style="width:56px">ตะขอ</th>
                  <th style="width:52px">กล่อง</th>
                  <th style="width:58px">ขาจับ</th>
                  <th style="width:28px"></th>
                </tr>
              </thead>
              <tbody>
                ${sh.windows.map((w, wi) => `
                  <tr>
                    <td><input data-pdf-win="${si}.${wi}.label" data-pdf-label="รหัสบาน ${wi + 1}" value="${escP(w.label)}" placeholder="W${wi + 1}"></td>
                    <td><input type="number" step="0.5" data-pdf-numeric="1" data-pdf-win="${si}.${wi}.width" data-pdf-label="กว้าง ${escP(w.label)}" value="${escP(w.width)}" placeholder="ซม."></td>
                    <td><input type="number" step="0.5" data-pdf-numeric="1" data-pdf-win="${si}.${wi}.height" data-pdf-label="สูง ${escP(w.label)}" value="${escP(w.height)}" placeholder="ซม."></td>
                    <td><input type="number" step="0.5" data-pdf-numeric="1" data-pdf-win="${si}.${wi}.extL" data-pdf-label="เผื่อซ้าย ${escP(w.label)}" value="${escP(w.extL)}"></td>
                    <td><input type="number" step="0.5" data-pdf-numeric="1" data-pdf-win="${si}.${wi}.extR" data-pdf-label="เผื่อขวา ${escP(w.label)}" value="${escP(w.extR)}"></td>
                    <td><input type="number" step="0.5" data-pdf-numeric="1" data-pdf-win="${si}.${wi}.extT" data-pdf-label="เผื่อบน ${escP(w.label)}" value="${escP(w.extT)}"></td>
                    <td><input type="number" step="0.5" data-pdf-numeric="1" data-pdf-win="${si}.${wi}.extB" data-pdf-label="เผื่อล่าง ${escP(w.label)}" value="${escP(w.extB)}"></td>
                    <td><input type="number" step="0.5" data-pdf-numeric="1" data-pdf-win="${si}.${wi}.fullW" data-pdf-label="กว้างเต็ม ${escP(w.label)}" value="${escP(w.fullW)}"></td>
                    <td><input type="number" step="0.5" data-pdf-numeric="1" data-pdf-win="${si}.${wi}.fullH" data-pdf-label="สูงเต็ม ${escP(w.label)}" value="${escP(w.fullH)}"></td>
                    <td><select data-pdf-win="${si}.${wi}.curtainStyle1">${curOpts(w.curtainStyle1)}</select></td>
                    <td><select data-pdf-win="${si}.${wi}.hookSize">${hookOpts(w.hookSize)}</select></td>
                    <td><select data-pdf-win="${si}.${wi}.box">${boxOpts(w.box)}</select></td>
                    <td><select data-pdf-win="${si}.${wi}.mount">${mountOpts(w.mount)}</select></td>
                    <td class="c"><button type="button" class="danger" data-pdf-del-win="${si}.${wi}" style="padding:2px 5px">✕</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
      <button type="button" data-pdf-add-sh="1" style="margin-top:2px">➕ เพิ่มห้อง</button>
    `;
  }

  /* =========================================================
     10. File Loading & Order Generation
     ========================================================= */
  async function handlePdfFile(file) {
    if (!file) return;
    fileName = file.name || 'plan.pdf';
    pageItems = [];
    setProgress(10, true);
    setStatus(`⏳ กำลังแปลงไฟล์ PDF "${fileName}" เป็นภาพความละเอียดสูงและตรวจจับตารางแบบฟอร์ม...`);
    renderPagesPreview();

    try {
      const arrBuf = await file.arrayBuffer();
      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;
      const maxPages = Math.min(pdf.numPages, 20);
      let bluePages = 0, formPages = 0;

      for (let p = 1; p <= maxPages; p++) {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 2.5 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
        const hasBlueInk = detectHasBlueInk(canvas);
        const grid = detectPasayaGrid(canvas);
        if (hasBlueInk) bluePages++;
        if (grid.isFormPage) formPages++;

        let txt = '';
        try {
          const tc = await page.getTextContent();
          txt = (tc.items || []).map(it => it.str).join(' ');
        } catch (e) {}

        pageItems.push({
          pageNo: p, canvas, dataUrl, inkPreviewUrl: '', showInkPreview: false,
          text: txt, ocrLog: '', hasBlueInk, isFormPage: grid.isFormPage, grid,
        });
        setProgress(10 + (p / maxPages) * 85, true);
      }

      draftData = heuristicParseText(pageItems);
      renderPagesPreview();
      renderReviewForm();
      setProgress(100, false);
      const blueHint = bluePages > 0
        ? `ตรวจพบหมึกปากกาสีน้ำเงิน ${bluePages}/${pageItems.length} หน้า (โหมดแยกหมึก + แยกก้อนตัวเลขอัตโนมัติ)`
        : `เอกสารโทนขาวดำ (${formPages} หน้าแบบฟอร์ม)`;
      setStatus(`✔ โหลดไฟล์ "${fileName}" (${pageItems.length} หน้า) เรียบร้อย — ${blueHint} | กดปุ่ม "🔍 อ่านทุกหน้า (OCR)" หรือกด "🔍 อ่านหน้านี้" ทีละหน้าได้เลย`);
    } catch (err) {
      console.warn('PDF load error:', err);
      draftData = emptyDraft();
      renderPagesPreview();
      renderReviewForm();
      setProgress(0, false);
      setStatus(`⚠️ โหลดไฟล์ PDF ไม่สำเร็จ (${err.message || err})`, true);
    }
  }

  function generateOrderFromDraft() {
    if (!draftData) draftData = emptyDraft();
    const ord = defaultOrder(orders.length + 1);
    const curUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    if (curUser) {
      ord.staff.name = draftData.staff.name || curUser.name || '';
      ord.staff.dept = curUser.dept || '';
      const branches = (typeof getStaffBranchList === 'function') ? getStaffBranchList(curUser) : [];
      ord.staff.branch = draftData.staff.branch || branches[0] || curUser.branch || '';
      ord.createdBy = curUser.username || '';
    }
    if (draftData.staff.orderNo) ord.staff.orderNo = draftData.staff.orderNo;
    Object.assign(ord.customer, draftData.customer || {});

    ord.sheets = (draftData.sheets || []).map((ds, si) => {
      const sh = newSheet(si + 1);
      sh.room.name = ds.roomName || `ห้องที่ ${si + 1}`;
      sh.notes = (Array.isArray(ds.notes) && ds.notes.length) ? ds.notes : [''];
      if (ds.fabrics) {
        ['blackout', 'sheer', 'roller', 'blinds'].forEach(ck => {
          if (ds.fabrics[ck] && sh.fabrics[ck]) Object.assign(sh.fabrics[ck], ds.fabrics[ck]);
        });
      }
      if (ds.rods) {
        if (ds.rods.pleat) sh.rods.pleat.model = ds.rods.pleat;
        if (ds.rods.show) sh.rods.show.model = ds.rods.show;
        if (ds.rods.wave) sh.rods.wave.model = ds.rods.wave;
      }
      const rawWins = Array.isArray(ds.windows) && ds.windows.length ? ds.windows : [emptyWin(1)];
      sh.windows = rawWins.map((dw, wi) => {
        const w = newWindow(wi + 1);
        Object.assign(w, {
          planNo: dw.planNo || String(wi + 1),
          label: dw.label || ('W' + (wi + 1)),
          width: dw.width || '', height: dw.height || '',
          extL: dw.extL || '', extR: dw.extR || '', extT: dw.extT || '', extB: dw.extB || '',
          wallL: dw.wallL || '', wallR: dw.wallR || '', ceilT: dw.ceilT || '', floorB: dw.floorB || '',
          fullW: dw.fullW || '', fullH: dw.fullH || '',
          curtainStyle1: dw.curtainStyle1 || '', curtainStyle2: dw.curtainStyle2 || '',
          pieces1: dw.pieces1 || (dw.curtainStyle1 && typeof isBlindOrRollerStyle === 'function' && !isBlindOrRollerStyle(dw.curtainStyle1) ? '2' : ''),
          hookSize: dw.hookSize || '', box: dw.box || '', mount: dw.mount || '',
        });
        if (w.curtainStyle1 && typeof inferNaturalRodTypeForStyle === 'function') {
          w.rodType = inferNaturalRodTypeForStyle(w.curtainStyle1) || '';
        }
        return w;
      });
      sh.windows.forEach(w => { if (typeof autoCalculateWindow === 'function') autoCalculateWindow(w, sh); });
      if (typeof autoUpdateSheetFabricTableQty === 'function') autoUpdateSheetFabricTableQty(sh);
      return sh;
    });

    const normalized = normalizeOrder(ord, orders.length + 1);
    orders.unshift(normalized);
    saveOrders();
    close();
    openOrder(normalized.id, 'sheet', 0);
  }

  function open() {
    const modal = document.getElementById('pdfImportModal');
    if (!modal) return;
    if (!draftData) draftData = emptyDraft();
    renderPagesPreview();
    renderReviewForm();
    modal.hidden = false;
  }

  function close() {
    const modal = document.getElementById('pdfImportModal');
    if (modal) modal.hidden = true;
  }

  function init() {
    const modal = document.getElementById('pdfImportModal');
    if (!modal) return;
    const fileIn = document.getElementById('pdfImpFileInput');
    if (fileIn) {
      fileIn.addEventListener('change', e => {
        const f = e.target.files && e.target.files[0];
        if (f) handlePdfFile(f);
        e.target.value = '';
      });
    }
    const closeBtn = document.getElementById('pdfImpClose');
    if (closeBtn) closeBtn.addEventListener('click', close);
    const ocrBtn = document.getElementById('pdfImpRunOcrBtn');
    if (ocrBtn) ocrBtn.addEventListener('click', () => runLocalOcr(null));
    const createBtn = document.getElementById('pdfImpCreateBtn');
    if (createBtn) createBtn.addEventListener('click', generateOrderFromDraft);

    const reviewBox = document.getElementById('pdfImpReview');
    if (reviewBox) {
      reviewBox.addEventListener('focusin', e => {
        if (e.target && e.target.tagName === 'INPUT') {
          if (activeTargetInput) activeTargetInput.classList.remove('pdf-imp-active-target');
          activeTargetInput = e.target;
          activeTargetInput.classList.add('pdf-imp-active-target');
          const hint = document.getElementById('pdfImpCropHint');
          if (hint) {
            const lbl = e.target.dataset.pdfLabel || 'ช่องที่เลือก';
            const modeTxt = (e.target.type === 'number' || e.target.dataset.pdfNumeric === '1') ? 'โหมดตัวเลข' : 'โหมดภาษาไทย+อังกฤษ';
            hint.innerHTML = `🎯 <b>ช่องเป้าหมายปัจจุบัน: <span style="color:#b42318">${escP(lbl)}</span></b> (${modeTxt}) — ลากกรอบคลุมบนภาพ PDF ด้านซ้ายเพื่ออ่านค่าลงช่องนี้ทันที!`;
          }
        }
      });
    }

    let cropDrag = null;
    const prevBox = document.getElementById('pdfImpPreview');
    if (prevBox) {
      prevBox.addEventListener('pointerdown', e => {
        const wrap = e.target.closest('[data-pdf-crop-page]');
        if (!wrap || e.button !== 0) return;
        const rect = wrap.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        const boxEl = document.createElement('div');
        boxEl.className = 'pdf-imp-crop-rect';
        boxEl.style.left = x + 'px'; boxEl.style.top = y + 'px';
        boxEl.style.width = '0px'; boxEl.style.height = '0px';
        wrap.appendChild(boxEl);
        cropDrag = { pageIdx: +wrap.dataset.pdfCropPage, wrap, rect, startX: x, startY: y, boxEl };
        wrap.setPointerCapture(e.pointerId);
      });
      prevBox.addEventListener('pointermove', e => {
        if (!cropDrag) return;
        const x = Math.max(0, Math.min(cropDrag.rect.width, e.clientX - cropDrag.rect.left));
        const y = Math.max(0, Math.min(cropDrag.rect.height, e.clientY - cropDrag.rect.top));
        cropDrag.boxEl.style.left = Math.min(cropDrag.startX, x) + 'px';
        cropDrag.boxEl.style.top = Math.min(cropDrag.startY, y) + 'px';
        cropDrag.boxEl.style.width = Math.abs(x - cropDrag.startX) + 'px';
        cropDrag.boxEl.style.height = Math.abs(y - cropDrag.startY) + 'px';
      });
      const endCrop = e => {
        if (!cropDrag) return;
        const x = Math.max(0, Math.min(cropDrag.rect.width, e.clientX - cropDrag.rect.left));
        const y = Math.max(0, Math.min(cropDrag.rect.height, e.clientY - cropDrag.rect.top));
        const left = Math.min(cropDrag.startX, x);
        const top = Math.min(cropDrag.startY, y);
        const w = Math.abs(x - cropDrag.startX);
        const h = Math.abs(y - cropDrag.startY);
        const pageIdx = cropDrag.pageIdx;
        const rW = cropDrag.rect.width, rH = cropDrag.rect.height;
        cropDrag.boxEl.remove();
        cropDrag = null;
        if (w >= 10 && h >= 8) {
          runCropOcrOnRegion(pageIdx, { x: left / rW, y: top / rH, w: w / rW, h: h / rH });
        }
      };
      prevBox.addEventListener('pointerup', endCrop);
      prevBox.addEventListener('pointercancel', () => { if (cropDrag) { cropDrag.boxEl.remove(); cropDrag = null; } });
    }

    modal.addEventListener('input', e => {
      if (!draftData) return;
      const pf = e.target.dataset.pdfField;
      if (pf) {
        const [obj, k] = pf.split('.');
        if (draftData[obj]) draftData[obj][k] = e.target.value;
        return;
      }
      const psh = e.target.dataset.pdfSh;
      if (psh) {
        const parts = psh.split('.');
        const si = +parts[0];
        if (!draftData.sheets[si]) return;
        if (parts.length === 2) draftData.sheets[si][parts[1]] = e.target.value;
        else if (parts.length === 3 && draftData.sheets[si][parts[1]]) draftData.sheets[si][parts[1]][parts[2]] = e.target.value;
        else if (parts.length === 4 && draftData.sheets[si][parts[1]] && draftData.sheets[si][parts[1]][parts[2]]) {
          draftData.sheets[si][parts[1]][parts[2]][parts[3]] = e.target.value;
        }
        return;
      }
      const pw = e.target.dataset.pdfWin;
      if (pw) {
        const [si, wi, f] = pw.split('.');
        if (draftData.sheets[+si] && draftData.sheets[+si].windows[+wi]) {
          draftData.sheets[+si].windows[+wi][f] = e.target.value;
        }
      }
    });
    modal.addEventListener('change', e => {
      const pw = e.target.dataset.pdfWin;
      if (pw && draftData) {
        const [si, wi, f] = pw.split('.');
        if (draftData.sheets[+si] && draftData.sheets[+si].windows[+wi]) {
          draftData.sheets[+si].windows[+wi][f] = e.target.value;
        }
      }
    });
    modal.addEventListener('click', e => {
      const ocrPgBtn = e.target.closest('[data-pdf-ocr-page]');
      if (ocrPgBtn) { runLocalOcr(+ocrPgBtn.dataset.pdfOcrPage); return; }
      const toggleInkBtn = e.target.closest('[data-pdf-toggle-ink]');
      if (toggleInkBtn) {
        const pi = +toggleInkBtn.dataset.pdfToggleInk;
        const pg = pageItems[pi];
        if (pg) {
          if (!pg.inkPreviewUrl) pg.inkPreviewUrl = generateInkPreviewDataUrl(pg.canvas);
          pg.showInkPreview = !pg.showInkPreview;
          renderPagesPreview();
        }
        return;
      }
      const addWin = e.target.closest('[data-pdf-add-win]');
      if (addWin && draftData) {
        const si = +addWin.dataset.pdfAddWin;
        if (draftData.sheets[si]) { draftData.sheets[si].windows.push(emptyWin(draftData.sheets[si].windows.length + 1)); renderReviewForm(); }
        return;
      }
      const delWin = e.target.closest('[data-pdf-del-win]');
      if (delWin && draftData) {
        const [si, wi] = delWin.dataset.pdfDelWin.split('.').map(Number);
        if (draftData.sheets[si] && draftData.sheets[si].windows.length > 1) {
          draftData.sheets[si].windows.splice(wi, 1);
          renderReviewForm();
        }
        return;
      }
      if (e.target.closest('[data-pdf-add-sh]') && draftData) {
        draftData.sheets.push(emptySheet(draftData.sheets.length + 1, null));
        renderReviewForm();
        return;
      }
      const delSh = e.target.closest('[data-pdf-del-sh]');
      if (delSh && draftData && draftData.sheets.length > 1) {
        draftData.sheets.splice(+delSh.dataset.pdfDelSh, 1);
        renderReviewForm();
      }
    });
  }

  return {
    init, open, close,
    heuristicParseText,
    normalizeOcrNumber,
    fixLikelyDecimal,
    reconcileWindowDimensions,
    detectThaiCurtainStyle,
    detectHookSize,
    fuzzyMatchDbItem,
    fuzzyMatchFabricFromDb,
    isBlueInkPixel,
    blueInkStrength,
    segmentInkBlobs,
    assignBlobsToWindow,
    mapSpatialNumbersToWindow,
  };
})();
