/* =========================================================
   Non-AI Local OCR PDF Handwriting / Scan Importer v25 (js/pdf-import.js)
   - ไม่ใช้ AI / ไม่ต้องใช้ API Key — ประมวลผล OCR ทั้งหมดในเบราว์เซอร์ของผู้ใช้ 100%
   - Auto Blue-Ink Isolation: แยกหมึกปากกาสีน้ำเงินออกจากแบบฟอร์มพิมพ์สีดำ/เทา
     ลบเส้นกรอบหน้าต่าง ตาราง และเครื่องหมาย + ที่พิมพ์ไว้ 100% เหลือเฉพาะลายมือจริง
   - Auto Form Anchor + Sketch Detection: จับตำแหน่งหัวแบบฟอร์ม PASAYA อัตโนมัติ
     (รองรับสแกนเอียง/ขยับเล็กน้อย) และแยกแผ่นสเก็ตช์เพิ่มเติมออกจากหน้าแบบฟอร์ม
   - Exact Micro-Zone OCR + Tight Ink Auto-Trim + White Padding:
     ตัดเฉพาะช่องตัวเลขทีละจุด (กว้าง, สูง, เผื่อ 4 ด้าน, ผนัง, ฝ้า, พื้น, เต็มกว้าง/สูง, รางม่าน)
     ข้ามช่องว่างทันที (เร็วขึ้น 3-5 เท่า) + ตรวจเช็คบ็อกซ์กล่องม่าน/ขาจับรางจากความหนาแน่นหมึก
   - Math Cross-Check & Decimal Recovery: ตรวจสอบความสอดคล้องของระยะรวมกับขนาดรางม่าน
     พร้อมกู้คืนจุดทศนิยม .5 ที่ OCR มักตกหล่น (เช่น 1495 -> 149.5, 745 -> 74.5)
   - รองรับ "อ่านเฉพาะหน้านี้", "ดูภาพแยกหมึก", และ "ลากกรอบอ่านเฉพาะจุด" ลงช่องที่เลือกทันที
   ========================================================= */
const PdfHandwritingImporter = (() => {
  const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

  let pageItems = []; // [{ pageNo, canvas, dataUrl, inkPreviewUrl, showInkPreview, text, ocrLog, hasBlueInk, isFormPage, anchor }]
  let fileName = '';
  let draftData = null;
  let activeTargetInput = null;
  let ocrBusy = false;
  let ocrCancelRequested = false;

  // แคช Tesseract Workers ในเครื่อง เพื่อให้อ่านซ้ำ/อ่านทีละหน้า/ลากกรอบอ่านเฉพาะจุดได้ทันทีไม่ต้องโหลดซ้ำ
  let cachedWorkerTha = null;
  let cachedWorkerNum = null;

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
    if (!cachedWorkerNum) {
      if (onProgress) onProgress(22, '⏳ กำลังโหลดเอนจินอ่านตัวเลขความแม่นยำสูง (eng numeric)...');
      cachedWorkerNum = await Tesseract.createWorker('eng');
      await cachedWorkerNum.setParameters({
        tessedit_char_whitelist: '0123456789./- ',
        tessedit_pageseg_mode: '7',
      });
    }
    return { workerTha: cachedWorkerTha, workerNum: cachedWorkerNum };
  }

  /* =========================================================
     2. Thai, Handwritten Number & Fuzzy DB Matching Helpers (No AI)
     ========================================================= */
  const THAI_DIGIT_MAP = { '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9' };

  function toArabicDigits(str) {
    return String(str || '').replace(/[๐-๙]/g, ch => THAI_DIGIT_MAP[ch] || ch);
  }

  function formatCleanNum(n) {
    if (isNaN(n) || !Number.isFinite(n)) return '';
    const r = Math.round(n * 10) / 10;
    return String(r);
  }

  /**
   * แปลงข้อความลายมือตัวเลขที่ OCR อ่านได้ให้เป็นตัวเลขสะอาด (แก้ตัวอักษรคล้ายเลขเช่น O->0, l/I->1, S->5)
   */
  function normalizeOcrNumber(raw, { min = 0, max = 9999 } = {}) {
    let s = toArabicDigits(String(raw || '').trim());
    s = s
      .replace(/[OoQD]/g, '0')
      .replace(/[lI|!]/g, '1')
      .replace(/[Zz]/g, '2')
      .replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8')
      .replace(/[,]/g, '.')
      .replace(/[^\d.]/g, '');
    const parts = s.split('.');
    if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
    const n = parseFloat(s);
    if (isNaN(n) || !Number.isFinite(n) || n < min || n > max) return '';
    return formatCleanNum(n);
  }

  /**
   * กู้คืนจุดทศนิยม .5 ที่ OCR มักอ่านข้ามจุด (เช่น 149.5 -> "1495", 74.5 -> "745", 273.5 -> "2735")
   */
  function fixLikelyDecimal(valStr, fieldType = 'dim') {
    const s = String(valStr || '').trim();
    if (!s || s.includes('.')) return s;
    const n = parseFloat(s);
    if (isNaN(n) || !Number.isFinite(n)) return '';
    if (s.length >= 3 && s.endsWith('5')) {
      if (fieldType === 'ext' && n >= 105 && n <= 995) {
        return formatCleanNum(n / 10);
      }
      if (fieldType === 'wall' && n >= 265 && n <= 2605) {
        return formatCleanNum(n / 10);
      }
      if (fieldType === 'ceil' && n >= 205 && n <= 2005) {
        return formatCleanNum(n / 10);
      }
      if (fieldType === 'dim' && n >= 655 && n <= 6505) {
        return formatCleanNum(n / 10);
      }
    }
    return s;
  }

  /**
   * ตรวจสอบความสอดคล้องทางคณิตศาสตร์ของขนาดหน้าต่างกับขนาดรางม่านและขนาดเต็มห้อง
   * - หากไม่ได้เขียน width/height บนรูป (เช่น หน้า 3 บาน 2 ที่เขียนเฉพาะ กว้างเต็ม 255 และ รางม่าน 255x273.5)
   *   ให้ดึงจาก railW / railH / fullW / fullH มาเติมให้อัตโนมัติ
   * - หากจุดทศนิยม .5 หายไปใน extL/extR/ceilT/floorB ให้ตรวจเทียบกับสมการผลรวมจริง
   */
  function reconcileWindowDimensions(win) {
    if (!win) return win;
    const p = v => {
      const n = parseFloat(v);
      return (!isNaN(n) && Number.isFinite(n)) ? n : null;
    };

    // 1. กู้คืนจุดทศนิยมตามบริบทสมการแนวนอน (extL + width + extR ≈ railW)
    const rW = p(win.railW);
    const rH = p(win.railH);
    const fW = p(win.fullW);
    const fH = p(win.fullH);

    // ถ้า width เป็นเลข 3-4 หลักลงท้าย 5 และหาร 10 แล้วใกล้เคียง railW หรือ fullW มากกว่ามาก
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
      const eL0 = p(win.extL) || 0;
      const eR0 = p(win.extR) || 0;
      tryFixWithTarget('extL', rW, w0 + eR0);
      tryFixWithTarget('extR', rW, w0 + (p(win.extL) || 0));
      tryFixWithTarget('width', rW, (p(win.extL) || 0) + (p(win.extR) || 0));
    }
    if (fH !== null) {
      const h0 = p(win.height) || 0;
      const cT0 = p(win.ceilT) || 0;
      const fB0 = p(win.floorB) || 0;
      tryFixWithTarget('ceilT', fH, h0 + fB0);
      tryFixWithTarget('floorB', fH, h0 + (p(win.ceilT) || 0));
      tryFixWithTarget('height', fH, (p(win.ceilT) || 0) + (p(win.floorB) || 0));
    }
    if (rH !== null) {
      const h0 = p(win.height) || 0;
      const eT0 = p(win.extT) || 0;
      const eB0 = p(win.extB) || 0;
      tryFixWithTarget('extT', rH, h0 + eB0);
      tryFixWithTarget('extB', rH, h0 + (p(win.extT) || 0));
      tryFixWithTarget('height', rH, (p(win.extT) || 0) + (p(win.extB) || 0));
    }

    // 2. Fallback: ถ้าบนรูปไม่ได้เขียน width/height ให้ดึงจาก รางม่าน (railW/railH) หรือ ขนาดเต็ม (fullW/fullH)
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

  /**
   * จับคู่ชื่อผ้า / รุ่นมู่ลี่ / รางม่าน กับฐานข้อมูล masterDB แบบ Fuzzy Matching (ไม่ใช้ AI)
   */
  function fuzzyMatchDbItem(rawText, list, keys = ['name'], minScore = 0.64) {
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
            score = 0.88 + 0.1 * (Math.min(cand.length, cleanVal.length) / Math.max(cand.length, cleanVal.length));
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
    const hit = fuzzyMatchDbItem(text, masterDB.fabrics, ['name', 'design'], 0.68);
    return hit ? (hit.name || '') : '';
  }

  /* =========================================================
     3. Blue-Ink Isolation, Form Anchor & Image Preprocessing
     ========================================================= */
  /**
   * ตรวจสอบว่าพิกเซล RGB เป็นหมึกปากกาสีน้ำเงินหรือไม่
   * แบบฟอร์มพิมพ์สีดำ/เทาจะมีค่า R ≈ G ≈ B ส่วนลายมือปากกาน้ำเงินจะมีค่า B สูงกว่า R และ G อย่างชัดเจน
   */
  function isBlueInkPixel(r, g, b, soft = false) {
    if (soft) {
      return b >= 48 && r < 222 && (b - r) >= 11 && (b - g) >= 2;
    }
    return b >= 52 && r < 212 && (b - r) >= 16 && (b - g) >= 4;
  }

  /**
   * ตรวจว่าหน้า PDF นี้มีการเขียนด้วยปากกาน้ำเงินหรือไม่
   */
  function detectHasBlueInk(canvas) {
    const w = canvas.width, h = canvas.height;
    const sx = Math.floor(w * 0.04), sy = Math.floor(h * 0.08);
    const sw = Math.floor(w * 0.92), sh = Math.floor(h * 0.78);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const d = ctx.getImageData(sx, sy, sw, sh).data;
    let blueCount = 0;
    let sampled = 0;
    const step = 2;
    for (let y = 0; y < sh; y += step) {
      for (let x = 0; x < sw; x += step) {
        const idx = (y * sw + x) * 4;
        sampled++;
        if (isBlueInkPixel(d[idx], d[idx + 1], d[idx + 2], false)) {
          blueCount++;
        }
      }
    }
    return blueCount >= 280 && (blueCount / Math.max(1, sampled)) >= 0.00045;
  }

  /**
   * ตรวจหาตำแหน่งแถบหัวแบบฟอร์ม PASAYA สีเทาเข้มด้านบน และขอบซ้ายของตาราง
   * - ใช้แยกหน้า "แบบฟอร์มแปลน MTO" ออกจาก "แผ่นสเก็ตช์กระดาษเปล่า" (เช่น หน้า 2)
   * - ชดเชยระยะขยับ (dx, dy) กรณีสแกนกระดาษเลื่อนขึ้นลงเล็กน้อย
   */
  function detectFormAnchor(canvas) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // 1. ตรวจแถบหัวสีเทาเข้ม (x: 0.06..0.94, y: 0.01..0.13)
    const bx0 = Math.floor(w * 0.06), bx1 = Math.floor(w * 0.94);
    const by0 = Math.floor(h * 0.01), by1 = Math.floor(h * 0.13);
    const bw = bx1 - bx0, bh = by1 - by0;
    const band = ctx.getImageData(bx0, by0, bw, bh).data;

    let bannerStart = -1, bannerEnd = -1, curStart = -1, bestLen = 0, bestStart = -1, bestEnd = -1;
    for (let y = 0; y < bh; y++) {
      let darkNonBlue = 0, cnt = 0;
      for (let x = 0; x < bw; x += 4) {
        const i = (y * bw + x) * 4;
        const r = band[i], g = band[i + 1], b = band[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        cnt++;
        if (gray < 178 && Math.abs(b - r) < 22) darkNonBlue++;
      }
      const isDarkRow = (darkNonBlue / Math.max(1, cnt)) >= 0.40;
      if (isDarkRow) {
        if (curStart < 0) curStart = y;
      } else {
        if (curStart >= 0) {
          const len = y - curStart;
          if (len > bestLen) { bestLen = len; bestStart = curStart; bestEnd = y; }
          curStart = -1;
        }
      }
    }
    if (curStart >= 0) {
      const len = bh - curStart;
      if (len > bestLen) { bestLen = len; bestStart = curStart; bestEnd = bh; }
    }

    const isFormPage = bestLen >= h * 0.018;
    let dy = 0, dx = 0;
    if (isFormPage) {
      bannerStart = (by0 + bestStart) / h;
      bannerEnd = (by0 + bestEnd) / h;
      dy = Math.max(-0.032, Math.min(0.032, bannerStart - 0.031));

      // 2. ตรวจเส้นกรอบแนวตั้งฝั่งซ้ายของตาราง (x: 0.01..0.07, y: 0.25..0.63)
      const lx0 = Math.floor(w * 0.01), lw = Math.floor(w * 0.065);
      const ly0 = Math.floor(h * 0.25), lh = Math.floor(h * 0.38);
      const leftImg = ctx.getImageData(lx0, ly0, lw, lh).data;
      for (let x = 0; x < lw; x++) {
        let darkV = 0, cntV = 0;
        for (let y = 0; y < lh; y += 3) {
          const i = (y * lw + x) * 4;
          const r = leftImg[i], g = leftImg[i + 1], b = leftImg[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          cntV++;
          if (gray < 165 && Math.abs(b - r) < 22) darkV++;
        }
        if ((darkV / Math.max(1, cntV)) >= 0.52) {
          const foundX = (lx0 + x) / w;
          dx = Math.max(-0.022, Math.min(0.022, foundX - 0.032));
          break;
        }
      }
    }
    return { isFormPage, dx, dy, bannerStart, bannerEnd };
  }

  function shiftRect(rect, anchor) {
    const dx = (anchor && anchor.dx) || 0;
    const dy = (anchor && anchor.dy) || 0;
    const x = Math.max(0, Math.min(0.99, rect.x + dx));
    const y = Math.max(0, Math.min(0.99, rect.y + dy));
    const w = Math.max(0.005, Math.min(1 - x, rect.w));
    const h = Math.max(0.005, Math.min(1 - y, rect.h));
    return { x, y, w, h };
  }

  /**
   * วัดสัดส่วนพิกเซลหมึกสีน้ำเงินในกรอบพิกัด (เร็วมาก ~0.2ms ใช้ข้ามช่องว่างและตรวจติ๊กถูกกล่องม่าน/ขาจับราง)
   */
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

  /**
   * สร้างภาพตัวอย่าง "แยกเฉพาะหมึกปากกาน้ำเงิน" ทั้งหน้า ให้ผู้ใช้กดตรวจสอบได้
   */
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
      const isBlue = isBlueInkPixel(d[idx], d[idx + 1], d[idx + 2], true);
      if (isBlue) {
        d[idx] = 15; d[idx + 1] = 45; d[idx + 2] = 160; d[idx + 3] = 255;
      } else {
        // จางแบบฟอร์มพิมพ์เหลือเป็นพื้นสีเทาอ่อนมาก (6%) เพื่อเทียบตำแหน่งง่าย
        const g = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
        const faded = Math.round(255 - (255 - g) * 0.08);
        d[idx] = faded; d[idx + 1] = faded; d[idx + 2] = faded; d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return out.toDataURL('image/jpeg', 0.84);
  }

  /**
   * ตัดกรอบและปรับภาพก่อนส่งเข้า Tesseract
   * - โหมด auto_blue (แนะนำ): แยกหมึกสีน้ำเงิน 100%, ลบจุดรบกวน 1px, เชื่อมเส้นปากกา, ตัดขอบขาวพอดีลายมือ (auto-trim) + ขอบขาวรอบด้าน 24px
   * - โหมดขาวดำ (normal/faint/bold): Otsu threshold + ลบเส้นตาราง + ขอบขาว
   */
  function cropAndPreprocess(srcCanvas, normRect, inkMode = 'auto_blue', scaleUp = 1.8, opts = {}) {
    const {
      hasBlueInk = false,
      autoTrim = false,
      targetTextH = 56,
      minInkPixels = 14,
      padding = 22,
      returnMeta = false,
    } = opts;

    const sx = Math.max(0, Math.floor(normRect.x * srcCanvas.width));
    const sy = Math.max(0, Math.floor(normRect.y * srcCanvas.height));
    const sw = Math.max(6, Math.min(srcCanvas.width - sx, Math.ceil(normRect.w * srcCanvas.width)));
    const sh = Math.max(6, Math.min(srcCanvas.height - sy, Math.ceil(normRect.h * srcCanvas.height)));

    const useBlueIsolation = (inkMode === 'blue_only') || (inkMode === 'auto_blue' && hasBlueInk);

    if (useBlueIsolation) {
      // แยกหมึกที่ความละเอียดจริงก่อน (ไม่เบลอสีจากการ upscale)
      const sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
      const sd = sctx.getImageData(sx, sy, sw, sh).data;
      const len = sw * sh;
      const rawBin = new Uint8Array(len);
      let inkCount = 0;

      for (let i = 0; i < len; i++) {
        const idx = i * 4;
        if (isBlueInkPixel(sd[idx], sd[idx + 1], sd[idx + 2], false)) {
          rawBin[i] = 1;
          inkCount++;
        }
      }
      // หากหมึกอ่อนมาก ให้ผ่อนเกณฑ์ลงเล็กน้อย
      if (inkCount < minInkPixels) {
        inkCount = 0;
        for (let i = 0; i < len; i++) {
          const idx = i * 4;
          if (isBlueInkPixel(sd[idx], sd[idx + 1], sd[idx + 2], true)) {
            rawBin[i] = 1;
            inkCount++;
          } else {
            rawBin[i] = 0;
          }
        }
      }

      // ลบจุดรบกวน 1px (Chromatic aberration ที่ขอบเส้นดำ)
      const cleanBin = new Uint8Array(len);
      let cleanCount = 0;
      let minX = sw, maxX = -1, minY = sh, maxY = -1;
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const p = y * sw + x;
          if (!rawBin[p]) continue;
          let nbrs = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= sh) continue;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              if (nx >= 0 && nx < sw && rawBin[ny * sw + nx]) nbrs++;
            }
          }
          if (nbrs >= 1) {
            cleanBin[p] = 1;
            cleanCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (cleanCount < minInkPixels || maxX < minX || maxY < minY) {
        return returnMeta ? { canvas: null, inkCount: cleanCount, inkRatio: cleanCount / Math.max(1, len) } : null;
      }

      // ขยายเส้นหมึกปากกาเบาๆ 1px เพื่อเชื่อมรอยขาดของปากกาลูกลื่น
      const dilBin = new Uint8Array(cleanBin);
      for (let y = 1; y < sh - 1; y++) {
        for (let x = 1; x < sw - 1; x++) {
          if (cleanBin[y * sw + x]) {
            dilBin[y * sw + (x + 1)] = 1;
            dilBin[(y + 1) * sw + x] = 1;
          }
        }
      }

      // ตัดขอบให้พอดีลายมือ (autoTrim) หรือเก็บทั้งโซน
      const tx0 = autoTrim ? Math.max(0, minX - 3) : 0;
      const ty0 = autoTrim ? Math.max(0, minY - 3) : 0;
      const tx1 = autoTrim ? Math.min(sw - 1, maxX + 3) : sw - 1;
      const ty1 = autoTrim ? Math.min(sh - 1, maxY + 3) : sh - 1;
      const tw = Math.max(4, tx1 - tx0 + 1);
      const th = Math.max(4, ty1 - ty0 + 1);

      // สร้าง canvas ชั่วคราวของ mask ที่ตัดขอบแล้ว
      const tmp = document.createElement('canvas');
      tmp.width = tw; tmp.height = th;
      const tctx = tmp.getContext('2d');
      const timg = tctx.createImageData(tw, th);
      const td = timg.data;
      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          const v = dilBin[(ty0 + y) * sw + (tx0 + x)] ? 0 : 255;
          const o = (y * tw + x) * 4;
          td[o] = v; td[o + 1] = v; td[o + 2] = v; td[o + 3] = 255;
        }
      }
      tctx.putImageData(timg, 0, 0);

      // ขยายให้ขนาดตัวเลขอยู่ในช่วงที่ Tesseract อ่านแม่นที่สุด (~56px) + เติมขอบขาวรอบด้าน
      const effScale = autoTrim
        ? Math.max(1.25, Math.min(3.4, targetTextH / Math.max(14, th)))
        : scaleUp;
      const outW = Math.min(1100, Math.round(tw * effScale) + padding * 2);
      const outH = Math.min(900, Math.round(th * effScale) + padding * 2);
      const drawW = outW - padding * 2;
      const drawH = outH - padding * 2;

      const out = document.createElement('canvas');
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(tmp, 0, 0, tw, th, padding, padding, drawW, drawH);

      // Re-binarize ให้ขอบตัวอักษรคมชัดหลัง scaling
      const fimg = ctx.getImageData(0, 0, outW, outH);
      const fd = fimg.data;
      for (let i = 0; i < outW * outH; i++) {
        const o = i * 4;
        const v = fd[o] < 175 ? 0 : 255;
        fd[o] = v; fd[o + 1] = v; fd[o + 2] = v; fd[o + 3] = 255;
      }
      ctx.putImageData(fimg, 0, 0);
      return returnMeta ? { canvas: out, inkCount: cleanCount, inkRatio: cleanCount / Math.max(1, len) } : out;
    }

    // ---- โหมดภาพขาวดำ / เอกสารถ่ายเอกสาร (Fallback) ----
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

    // ตัดเส้นตารางแนวนอน/แนวตั้งยาวๆ เมื่อเลือกโหมด bold หรือ auto_blue fallback ขาวดำ
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

    let finalBin = bin;
    if (inkMode === 'faint') {
      const w = out.width, h = out.height;
      finalBin = new Uint8Array(bin);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (bin[y * w + x]) {
            finalBin[y * w + (x + 1)] = 1;
            finalBin[(y + 1) * w + x] = 1;
          }
        }
      }
    }

    for (let i = 0; i < len; i++) {
      const v = finalBin[i] ? 0 : 255;
      d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return returnMeta ? { canvas: out, inkCount, inkRatio: inkCount / Math.max(1, len) } : out;
  }

  /* =========================================================
     4. Spatial Number Mapping Fallback (B&W / Freeform)
     ========================================================= */
  function mapSpatialNumbersToWindow(words, imgW, imgH, win) {
    if (!Array.isArray(words) || !words.length) return;
    const nums = [];
    words.forEach(wd => {
      const clean = normalizeOcrNumber(wd.text, { min: 1, max: 1200 });
      if (!clean) return;
      const bb = wd.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
      const cx = ((bb.x0 + bb.x1) / 2) / Math.max(1, imgW);
      const cy = ((bb.y0 + bb.y1) / 2) / Math.max(1, imgH);
      nums.push({ val: clean, n: parseFloat(clean), cx, cy, conf: wd.confidence || 0 });
    });
    if (!nums.length) return;

    const topNums = nums.filter(p => p.cy >= 0.04 && p.cy <= 0.32 && p.cx >= 0.15 && p.cx <= 0.78)
      .sort((a, b) => a.cx - b.cx);
    const usedTop = new Set(topNums);
    if (topNums.length >= 3) {
      if (!win.extL && topNums[0].n <= 150) win.extL = topNums[0].val;
      if (!win.width) win.width = topNums[1].val;
      if (!win.extR && topNums[topNums.length - 1].n <= 150) win.extR = topNums[topNums.length - 1].val;
    } else if (topNums.length === 2) {
      const sortedByVal = topNums.slice().sort((a, b) => b.n - a.n);
      if (!win.width && sortedByVal[0].n >= 30) win.width = sortedByVal[0].val;
    } else if (topNums.length === 1 && !win.width && topNums[0].n >= 30) {
      win.width = topNums[0].val;
    }

    const rightNums = nums.filter(p => !usedTop.has(p) && p.cx >= 0.70 && p.cx <= 0.99 && p.cy >= 0.22 && p.cy <= 0.88)
      .sort((a, b) => a.cy - b.cy);
    if (rightNums.length >= 3) {
      if (!win.extT && rightNums[0].n <= 150) win.extT = rightNums[0].val;
      if (!win.height) win.height = rightNums[1].val;
      if (!win.extB && rightNums[rightNums.length - 1].n <= 150) win.extB = rightNums[rightNums.length - 1].val;
    } else if (rightNums.length === 2) {
      const sortedByVal = rightNums.slice().sort((a, b) => b.n - a.n);
      if (!win.height && sortedByVal[0].n >= 30) win.height = sortedByVal[0].val;
    } else if (rightNums.length === 1 && !win.height && rightNums[0].n >= 30) {
      win.height = rightNums[0].val;
    }

    const leftFull = nums.find(p => p.cx < 0.23 && p.cy >= 0.35 && p.cy <= 0.75 && p.n >= 100);
    if (leftFull && !win.fullH) win.fullH = leftFull.val;

    const botFull = nums.find(p => p.cy >= 0.78 && p.cx >= 0.25 && p.cx <= 0.75 && p.n >= 50);
    if (botFull && !win.fullW) win.fullW = botFull.val;
  }

  /* =========================================================
     5. Heuristic Thai + Number Text Parser (PDF Text & Freeform)
     ========================================================= */
  function heuristicParseText(pages) {
    const fullText = toArabicDigits(pages.map(p => p.text || '').join('\n'));
    const draft = emptyDraft();
    if (!fullText.trim()) {
      // สร้างโครงห้องตามหน้าแบบฟอร์มที่โหลดเข้ามา
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
        w.label = lbl;
        w.width = m[2];
        w.height = m[3];
        w.curtainStyle1 = detectThaiCurtainStyle(txt);
        w.hookSize = detectHookSize(txt);
        wins.push(w);
      }
      if (!wins.length) {
        const thaiDimRe = /กว้าง\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)[^\d]{1,15}สูง\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)/g;
        let tm;
        while ((tm = thaiDimRe.exec(txt)) !== null && wins.length < 8) {
          const w = emptyWin(wins.length + 1);
          w.width = tm[1];
          w.height = tm[2];
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
          w.width = dm[1];
          w.height = dm[2];
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
     6. Exact PASAYA MTO Micro-Zone OCR Engine (v25)
     ========================================================= */
  async function ocrMicroNumber(workerNum, canvas, rect, inkMode, hasBlueInk, fieldType = 'dim', range = { min: 1, max: 6505 }) {
    const meta = cropAndPreprocess(canvas, rect, inkMode, 2.2, {
      hasBlueInk,
      autoTrim: true,
      targetTextH: 58,
      minInkPixels: 14,
      padding: 24,
      returnMeta: true,
    });
    if (!meta || !meta.canvas) return '';
    await workerNum.setParameters({
      tessedit_char_whitelist: '0123456789. ',
      tessedit_pageseg_mode: '7',
    });
    let res = await workerNum.recognize(meta.canvas);
    let raw = String(res.data.text || '').trim();
    let val = normalizeOcrNumber(raw, range);
    // ถ้า PSM 7 อ่านไม่ได้ทั้งที่มีหมึกชัดเจน ลองซ้ำด้วย PSM 8 (single word)
    if (!val && meta.inkCount >= 24) {
      await workerNum.setParameters({
        tessedit_char_whitelist: '0123456789.',
        tessedit_pageseg_mode: '8',
      });
      res = await workerNum.recognize(meta.canvas);
      raw = String(res.data.text || '').trim();
      val = normalizeOcrNumber(raw, range);
    }
    if (!val) return '';
    return fixLikelyDecimal(val, fieldType);
  }

  async function ocrMicroText(worker, canvas, rect, inkMode, hasBlueInk, psm = '7', whitelist = '') {
    const meta = cropAndPreprocess(canvas, rect, inkMode, 2.0, {
      hasBlueInk,
      autoTrim: true,
      targetTextH: 52,
      minInkPixels: 16,
      padding: 22,
      returnMeta: true,
    });
    if (!meta || !meta.canvas) return '';
    const params = { tessedit_pageseg_mode: psm };
    params.tessedit_char_whitelist = whitelist || '';
    await worker.setParameters(params);
    const res = await worker.recognize(meta.canvas);
    return toArabicDigits(String(res.data.text || '')).replace(/\s+/g, ' ').trim();
  }

  /**
   * อ่านข้อมูลหน้า PASAYA MTO 1 หน้าแบบละเอียดด้วย Blue-Ink Isolation + Micro-Zone OCR
   */
  async function ocrSinglePasayaPage(pg, pi, totalPages, layoutMode, inkMode, workers, onStatus) {
    const { workerTha, workerNum } = workers;
    const useBlue = (inkMode === 'blue_only') || (inkMode === 'auto_blue' && pg.hasBlueInk);
    const anchor = pg.anchor || { isFormPage: true, dx: 0, dy: 0 };
    const sr = r => shiftRect(r, anchor);
    const logs = [];
    logs.push(`[โหมด] ${useBlue ? 'แยกหมึกปากกาน้ำเงิน (Blue-Ink)' : 'ขาวดำ (' + inkMode + ')'} | ${anchor.isFormPage ? 'แบบฟอร์ม PASAYA' : 'แผ่นสเก็ตช์เพิ่มเติม'} | dx=${(anchor.dx * 100).toFixed(1)}% dy=${(anchor.dy * 100).toFixed(1)}%`);

    // 1. กรณีเป็นโหมด Freeform หรือเป็นแผ่นสเก็ตช์เพิ่มเติม (เช่น หน้า 2 ที่ไม่มีแถบหัวแบบฟอร์ม)
    if (layoutMode === 'freeform' || !anchor.isFormPage) {
      if (onStatus) onStatus(`📝 หน้า ${pg.pageNo}/${totalPages}: ตรวจพบแผ่นสเก็ตช์เพิ่มเติม — กำลังอ่านข้อความและตัวเลข...`);
      const pre = cropAndPreprocess(pg.canvas, { x: 0.02, y: 0.02, w: 0.96, h: 0.96 }, inkMode, 1.35, {
        hasBlueInk: pg.hasBlueInk,
        autoTrim: false,
        padding: 16,
        returnMeta: true,
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
        isSketchPage: !anchor.isFormPage && layoutMode !== 'freeform',
        sketchText: txt.replace(/\s+/g, ' ').trim(),
        customer: pi === 0 ? parsed.customer : null,
        staff: pi === 0 ? parsed.staff : null,
        sheet: parsed.sheets[0] || emptySheet(pi + 1, pg.pageNo),
      };
    }

    // 2. หน้าแบบฟอร์ม PASAYA MTO มาตรฐาน
    let customer = null;
    let staff = null;
    if (pi === 0) {
      if (onStatus) onStatus(`🔍 หน้า ${pg.pageNo}/${totalPages}: กำลังอ่านข้อมูลลูกค้า (ชื่อ, ที่อยู่, เบอร์โทร)...`);
      customer = { name: '', mobile: '', building: '', road: '', district: '', province: '' };
      staff = { orderNo: '-', name: '', branch: '' };

      const cName = await ocrMicroText(workerTha, pg.canvas, sr({ x: 0.165, y: 0.081, w: 0.50, h: 0.024 }), inkMode, pg.hasBlueInk, '7');
      const cAddrNo = await ocrMicroText(workerTha, pg.canvas, sr({ x: 0.185, y: 0.097, w: 0.135, h: 0.022 }), inkMode, pg.hasBlueInk, '7');
      const cRoad = await ocrMicroText(workerTha, pg.canvas, sr({ x: 0.445, y: 0.097, w: 0.24, h: 0.022 }), inkMode, pg.hasBlueInk, '7');
      const cBldg = await ocrMicroText(workerTha, pg.canvas, sr({ x: 0.095, y: 0.112, w: 0.28, h: 0.022 }), inkMode, pg.hasBlueInk, '7');
      const cMobRaw = await ocrMicroText(workerNum, pg.canvas, sr({ x: 0.095, y: 0.141, w: 0.225, h: 0.022 }), inkMode, pg.hasBlueInk, '7', '0123456789- ');
      const cBranch = await ocrMicroText(workerTha, pg.canvas, sr({ x: 0.80, y: 0.112, w: 0.17, h: 0.048 }), inkMode, pg.hasBlueInk, '6');

      if (cName) customer.name = cName;
      if (cBldg) customer.building = [cAddrNo, cBldg].filter(Boolean).join(' ');
      else if (cAddrNo) customer.building = cAddrNo;
      if (cRoad) customer.road = cRoad;
      const mMob = /(0\d{1,2}[-\s]?\d{3}[-\s]?\d{4})/.exec(cMobRaw.replace(/\s+/g, ''));
      if (mMob) customer.mobile = mMob[1];
      else if (cMobRaw.replace(/[^\d]/g, '').length >= 9) customer.mobile = cMobRaw.replace(/\s+/g, '');
      if (cBranch) staff.branch = cBranch.slice(0, 20);

      logs.push(`[ลูกค้า] ชื่อ="${customer.name}" | โทร="${customer.mobile}" | สถานที่="${customer.building}" | ถนน="${customer.road}" | สาขา="${staff.branch}"`);
    }

    // 3. ชื่อห้อง (MAP ROOM) & หมายเหตุ
    if (onStatus) onStatus(`🔍 หน้า ${pg.pageNo}/${totalPages}: กำลังอ่านชื่อห้องและหมายเหตุ...`);
    const shObj = emptySheet(pi + 1, pg.pageNo);
    shObj.windows = [];

    const roomTxt = await ocrMicroText(workerTha, pg.canvas, sr({ x: 0.155, y: 0.202, w: 0.22, h: 0.040 }), inkMode, pg.hasBlueInk, '6');
    const noteTxt = await ocrMicroText(workerTha, pg.canvas, sr({ x: 0.375, y: 0.188, w: 0.34, h: 0.052 }), inkMode, pg.hasBlueInk, '6');
    if (roomTxt) {
      shObj.roomName = roomTxt.replace(/^(?:MAP\s*ROOM|ROOM|ห้อง)\s*[:：)]?\s*/i, '').trim() || `ห้องที่ ${pi + 1}`;
    }
    if (noteTxt && noteTxt.length >= 2) shObj.notes.push(noteTxt);
    logs.push(`[ห้อง] "${shObj.roomName}"${noteTxt ? ' | หมายเหตุ: ' + noteTxt : ''}`);

    // 4. 4 ช่องหน้าต่าง/ประตู (2×2 Quadrants) — ข้ามช่องว่างทันทีด้วยตัววัดหมึก!
    const quads = [
      { idx: 1, x: 0.032, y: 0.244, w: 0.468, h: 0.202 },
      { idx: 2, x: 0.505, y: 0.244, w: 0.470, h: 0.202 },
      { idx: 3, x: 0.032, y: 0.448, w: 0.468, h: 0.202 },
      { idx: 4, x: 0.505, y: 0.448, w: 0.470, h: 0.202 },
    ];

    for (let qi = 0; qi < quads.length; qi++) {
      if (ocrCancelRequested) break;
      const q = quads[qi];
      const qRect = sr(q);

      // ข้ามช่องว่างทันทีเมื่อเป็นโหมดแยกหมึกสีน้ำเงิน
      if (useBlue) {
        const qInk = measureBlueInkInRect(pg.canvas, {
          x: qRect.x + 0.01, y: qRect.y + 0.01, w: qRect.w - 0.02, h: qRect.h - 0.02,
        }, false);
        if (qInk.ratio < 0.00055 || qInk.count < 85) {
          logs.push(`[บาน ${q.idx}] (ว่าง — ข้ามอัตโนมัติ)`);
          continue;
        }
      }

      if (onStatus) onStatus(`🔍 หน้า ${pg.pageNo}/${totalPages} (${shObj.roomName}): กำลังอ่านตัวเลขบานที่ ${q.idx}/4...`);
      const wObj = emptyWin(q.idx);
      const rel = (rx, ry, rw, rh) => ({
        x: Math.max(0, Math.min(0.99, qRect.x + rx * qRect.w)),
        y: Math.max(0, Math.min(0.99, qRect.y + ry * qRect.h)),
        w: Math.max(0.004, Math.min(1, rw * qRect.w)),
        h: Math.max(0.004, Math.min(1, rh * qRect.h)),
      });

      // 4a. รหัสบาน / รูปแบบม่าน / ตะขอ
      const lblRaw = await ocrMicroText(workerNum, pg.canvas, rel(0.03, 0.00, 0.13, 0.11), inkMode, pg.hasBlueInk, '8', '0123456789WDwd');
      if (lblRaw) {
        const mWD = /([WD]\d+)/i.exec(lblRaw);
        const mDig = /^(\d{1,2})$/.exec(lblRaw.replace(/\s+/g, ''));
        if (mWD) wObj.label = mWD[1].toUpperCase();
        else if (mDig) { wObj.planNo = mDig[1]; wObj.label = 'W' + mDig[1]; }
      }

      const styleRaw = await ocrMicroText(workerTha, pg.canvas, rel(0.22, -0.03, 0.36, 0.14), inkMode, pg.hasBlueInk, '7');
      const detStyle = detectThaiCurtainStyle(styleRaw);
      if (detStyle) wObj.curtainStyle1 = detStyle;

      const hookRaw = await ocrMicroText(workerNum, pg.canvas, rel(0.64, -0.02, 0.22, 0.13), inkMode, pg.hasBlueInk, '8', '0123456789No. ');
      const detHook = detectHookSize(hookRaw, true);
      if (detHook) wObj.hookSize = detHook;

      // 4b. เช็คบ็อกซ์ กล่องม่าน (No / Yes) & ขาจับราง (ผนัง / เพดาน) ด้วยความหนาแน่นหมึก (ไม่ใช้ OCR)
      if (useBlue) {
        const inkBoxNo = measureBlueInkInRect(pg.canvas, rel(0.235, 0.075, 0.078, 0.095), true).ratio;
        const inkBoxYes = measureBlueInkInRect(pg.canvas, rel(0.345, 0.075, 0.078, 0.095), true).ratio;
        if (Math.max(inkBoxNo, inkBoxYes) >= 0.009) {
          if (inkBoxYes > inkBoxNo * 1.25) wObj.box = 'Yes';
          else if (inkBoxNo > inkBoxYes * 1.25) wObj.box = 'No';
        }
        const inkWall = measureBlueInkInRect(pg.canvas, rel(0.235, 0.145, 0.078, 0.095), true).ratio;
        const inkCeil = measureBlueInkInRect(pg.canvas, rel(0.345, 0.145, 0.078, 0.095), true).ratio;
        if (Math.max(inkWall, inkCeil) >= 0.009) {
          if (inkCeil > inkWall * 1.25) wObj.mount = 'เพดาน';
          else if (inkWall > inkCeil * 1.25) wObj.mount = 'ผนัง';
        }
      }

      // 4c. อ่านตัวเลขแยกทีละ Micro-Zone (เฉพาะช่องที่มีหมึก!)
      if (useBlue) {
        const microSpec = [
          ['wallL',  rel(0.01, 0.22, 0.21, 0.19), 'wall', { min: 1, max: 2605 }],
          ['extL',   rel(0.21, 0.19, 0.16, 0.18), 'ext',  { min: 0, max: 995 }],
          ['width',  rel(0.35, 0.19, 0.22, 0.18), 'dim',  { min: 15, max: 6505 }],
          ['extR',   rel(0.54, 0.19, 0.15, 0.18), 'ext',  { min: 0, max: 995 }],
          ['wallR',  rel(0.67, 0.22, 0.22, 0.19), 'wall', { min: 1, max: 2605 }],
          ['ceilT',  rel(0.56, 0.10, 0.23, 0.17), 'ceil', { min: 1, max: 2005 }],
          ['extT',   rel(0.64, 0.32, 0.19, 0.16), 'ext',  { min: 0, max: 995 }],
          ['height', rel(0.64, 0.44, 0.22, 0.18), 'dim',  { min: 15, max: 6505 }],
          ['extB',   rel(0.64, 0.57, 0.19, 0.15), 'ext',  { min: 0, max: 995 }],
          ['floorB', rel(0.59, 0.67, 0.21, 0.14), 'wall', { min: 1, max: 2605 }],
          ['fullH',  rel(0.04, 0.49, 0.23, 0.23), 'dim',  { min: 40, max: 6505 }],
          ['fullW',  rel(0.32, 0.64, 0.29, 0.16), 'dim',  { min: 25, max: 6505 }],
          // ตารางรางม่านด้านล่าง (รางม่าน: railW x railH = tracks)
          ['railW',      rel(0.17, 0.75, 0.19, 0.12), 'dim', { min: 20, max: 6505 }],
          ['railH',      rel(0.37, 0.75, 0.19, 0.12), 'dim', { min: 20, max: 6505 }],
          ['railTracks', rel(0.55, 0.75, 0.13, 0.12), 'int', { min: 1, max: 6 }],
        ];
        for (const [key, rBox, fType, rng] of microSpec) {
          const val = await ocrMicroNumber(workerNum, pg.canvas, rBox, inkMode, pg.hasBlueInk, fType, rng);
          if (val) wObj[key] = val;
        }
      } else {
        // โหมดขาวดำ: ใช้ Spatial OCR ทั้งรูปไดอะแกรม + ตารางรางม่าน
        const diagC = cropAndPreprocess(pg.canvas, rel(0.01, 0.18, 0.96, 0.62), inkMode, 1.9, { hasBlueInk: false });
        if (diagC) {
          await workerNum.setParameters({ tessedit_char_whitelist: '0123456789.+/-xX ', tessedit_pageseg_mode: '6' });
          const diagRes = await workerNum.recognize(diagC);
          mapSpatialNumbersToWindow(diagRes.data.words || [], diagC.width, diagC.height, wObj);
        }
        const calcC = cropAndPreprocess(pg.canvas, rel(0.15, 0.75, 0.56, 0.14), inkMode, 2.0, { hasBlueInk: false });
        if (calcC) {
          await workerNum.setParameters({ tessedit_char_whitelist: '0123456789.xX= ', tessedit_pageseg_mode: '7' });
          const calcRes = await workerNum.recognize(calcC);
          const mDim = /(\d{2,3}(?:\.\d+)?)\s*[xX×]\s*(\d{2,3}(?:\.\d+)?)/.exec(calcRes.data.text || '');
          if (mDim) {
            wObj.railW = mDim[1];
            wObj.railH = mDim[2];
          }
        }
      }

      // 4d. ตรวจคณิตศาสตร์และกู้คืนค่า width/height จากรางม่านหรือขนาดเต็มหากบนรูปเว้นว่าง
      reconcileWindowDimensions(wObj);

      const hasAnyVal = !!(wObj.width || wObj.height || wObj.fullW || wObj.fullH || wObj.railW || wObj.railH || wObj.curtainStyle1);
      logs.push(
        `[บาน ${q.idx}] ${wObj.label} กว้าง=${wObj.width || '-'} สูง=${wObj.height || '-'} ` +
        `(+ซ${wObj.extL || '-'} +ข${wObj.extR || '-'} +บ${wObj.extT || '-'} +ล${wObj.extB || '-'}) ` +
        `เต็ม=${wObj.fullW || '-'}x${wObj.fullH || '-'} ราง=${wObj.railW || '-'}x${wObj.railH || '-'} ` +
        `${wObj.curtainStyle1 || ''} ${wObj.hookSize || ''} กล่อง:${wObj.box || '-'} ขา:${wObj.mount || '-'}`
      );
      if (hasAnyVal || q.idx === 1) {
        shObj.windows.push(wObj);
      }
    }

    // 5. ตารางผ้าม่านและมู่ลี่/ม่านม้วน (แยกอ่านเฉพาะคอลัมน์ที่มีหมึก + Fuzzy Match กับ masterDB)
    if (!ocrCancelRequested) {
      if (onStatus) onStatus(`🔍 หน้า ${pg.pageNo}/${totalPages} (${shObj.roomName}): กำลังอ่านตารางผ้าและรางม่าน...`);
      const fabCols = [
        { key: 'blackout', x: 0.165, w: 0.150, isBlind: false },
        { key: 'sheer',    x: 0.315, w: 0.153, isBlind: false },
        { key: 'roller',   x: 0.468, w: 0.152, isBlind: true },
        { key: 'blinds',   x: 0.620, w: 0.158, isBlind: true },
      ];
      for (const fc of fabCols) {
        const colBox = sr({ x: fc.x, y: 0.672, w: fc.w, h: 0.054 });
        if (useBlue && measureBlueInkInRect(pg.canvas, colBox, true).ratio < 0.0018) continue;

        const rawName = await ocrMicroText(workerTha, pg.canvas, sr({ x: fc.x, y: 0.672, w: fc.w, h: 0.020 }), inkMode, pg.hasBlueInk, '7');
        const rawDes = await ocrMicroText(workerTha, pg.canvas, sr({ x: fc.x, y: 0.690, w: fc.w, h: 0.019 }), inkMode, pg.hasBlueInk, '7');
        const rawCol = await ocrMicroText(workerTha, pg.canvas, sr({ x: fc.x, y: 0.706, w: fc.w, h: 0.019 }), inkMode, pg.hasBlueInk, '7');

        if (!fc.isBlind) {
          const fabList = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.fabrics)) ? masterDB.fabrics : [];
          const hit = fuzzyMatchDbItem([rawName, rawDes].filter(Boolean).join(' '), fabList, ['name', 'design'], 0.64);
          shObj.fabrics[fc.key].name = hit ? hit.name : rawName;
          shObj.fabrics[fc.key].design = rawDes || (hit && hit.design) || '';
          shObj.fabrics[fc.key].color = rawCol;
          if (shObj.fabrics[fc.key].name || rawCol) {
            logs.push(`[${fc.key}] "${shObj.fabrics[fc.key].name}" / "${shObj.fabrics[fc.key].design}" / "${shObj.fabrics[fc.key].color}"`);
          }
        } else {
          const blindList = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.blinds)) ? masterDB.blinds : [];
          const hit = fuzzyMatchDbItem([rawName, rawDes].filter(Boolean).join(' '), blindList, ['name', 'group'], 0.64);
          shObj.fabrics[fc.key].group = hit ? (hit.group || '') : '';
          shObj.fabrics[fc.key].name = hit ? hit.name : [rawName, rawDes].filter(Boolean).join(' ');
          shObj.fabrics[fc.key].color = rawCol;
          if (shObj.fabrics[fc.key].name || rawCol) {
            logs.push(`[${fc.key}] "${shObj.fabrics[fc.key].name}" / "${shObj.fabrics[fc.key].color}"`);
          }
        }
      }

      // 6. แถบรางม่าน (รางม่านลอน / รางม่านจีบ-พับ)
      const railList = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.rails)) ? masterDB.rails : [];
      const waveRaw = await ocrMicroText(workerTha, pg.canvas, sr({ x: 0.68, y: 0.736, w: 0.19, h: 0.028 }), inkMode, pg.hasBlueInk, '7');
      if (waveRaw) {
        const rHit = fuzzyMatchDbItem(waveRaw, railList, ['name'], 0.64);
        shObj.rods.wave = rHit ? rHit.name : waveRaw;
        logs.push(`[รางลอน] "${shObj.rods.wave}"`);
      }
      const pleatRaw = await ocrMicroText(workerTha, pg.canvas, sr({ x: 0.68, y: 0.762, w: 0.19, h: 0.028 }), inkMode, pg.hasBlueInk, '7');
      if (pleatRaw) {
        const rHit = fuzzyMatchDbItem(pleatRaw, railList, ['name'], 0.64);
        shObj.rods.pleat = rHit ? rHit.name : pleatRaw;
        logs.push(`[รางจีบ/พับ] "${shObj.rods.pleat}"`);
      }
    }

    if (!shObj.windows.length) shObj.windows.push(emptyWin(1));
    pg.ocrLog = logs.join('\n');
    return { isSketchPage: false, customer, staff, sheet: shObj };
  }

  /* =========================================================
     7. OCR Runners (All Pages & Single Page)
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
      // กดปุ่มซ้ำขณะกำลังอ่าน = ขอหยุด
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
        if (existingIdx >= 0) {
          draftData.sheets[existingIdx] = res.sheet;
        } else {
          draftData.sheets.push(res.sheet);
        }
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
            // แผ่นสเก็ตช์เพิ่มเติม: แนบข้อความเป็นหมายเหตุในห้องก่อนหน้า เพื่อไม่ให้เกิดห้องว่างซ้ำ
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
      setStatus(`⚠️ อ่าน OCR ไม่สำเร็จ (${err.message || err}) — กรุณาตรวจสอบอินเทอร์เน็ตสำหรับโหลดชุดภาษาไทยครั้งแรก หรือกรอกข้อมูลเทียบภาพด้านซ้าย`, true);
    } finally {
      ocrBusy = false;
      ocrCancelRequested = false;
      if (btn) { btn.disabled = false; btn.textContent = '🔍 อ่านทุกหน้า (OCR)'; }
    }
  }

  /* =========================================================
     8. Interactive Drag-Crop OCR onto Active Input Field (No AI)
     ========================================================= */
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
      const { workerTha, workerNum } = await ensureOcrWorkers();
      const meta = cropAndPreprocess(pg.canvas, normRect, inkMode, 2.4, {
        hasBlueInk: pg.hasBlueInk,
        autoTrim: true,
        targetTextH: 58,
        minInkPixels: 10,
        padding: 24,
        returnMeta: true,
      });
      if (!meta || !meta.canvas) {
        setStatus('⚠️ ไม่พบลายมือในกรอบที่ลาก (ลองลากให้คลุมตัวเลข หรือเปลี่ยนโหมดหมึกเป็น "หมึกปกติ / ลายมือจาง")', true);
        return;
      }

      let raw = '';
      if (isNumericField) {
        await workerNum.setParameters({ tessedit_char_whitelist: '0123456789.+- ', tessedit_pageseg_mode: '7' });
        const res = await workerNum.recognize(meta.canvas);
        raw = String(res.data.text || '').trim();
      } else {
        await workerTha.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: '' });
        const res = await workerTha.recognize(meta.canvas);
        raw = String(res.data.text || '').trim();
      }

      const finalVal = isNumericField
        ? normalizeOcrNumber(raw, { min: 0, max: 9999 })
        : toArabicDigits(raw).replace(/\s+/g, ' ').trim();

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
     9. UI Rendering (PDF Page Preview + Enhanced Review Form)
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
              <pre style="margin:3px 0 0;padding:5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;white-space:pre-wrap;max-height:130px;overflow:auto">${escP(pg.ocrLog)}</pre>
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
    setStatus(`⏳ กำลังแปลงไฟล์ PDF "${fileName}" เป็นภาพความละเอียดสูงและตรวจจับหมึกลายมือ...`);
    renderPagesPreview();

    try {
      const arrBuf = await file.arrayBuffer();
      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;
      const maxPages = Math.min(pdf.numPages, 20);
      let bluePages = 0;
      let formPages = 0;

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
        const anchor = detectFormAnchor(canvas);
        if (hasBlueInk) bluePages++;
        if (anchor.isFormPage) formPages++;

        let txt = '';
        try {
          const tc = await page.getTextContent();
          txt = (tc.items || []).map(it => it.str).join(' ');
        } catch (e) {}

        pageItems.push({
          pageNo: p,
          canvas,
          dataUrl,
          inkPreviewUrl: '',
          showInkPreview: false,
          text: txt,
          ocrLog: '',
          hasBlueInk,
          isFormPage: anchor.isFormPage,
          anchor,
        });
        setProgress(10 + (p / maxPages) * 85, true);
      }

      draftData = heuristicParseText(pageItems);
      renderPagesPreview();
      renderReviewForm();
      setProgress(100, false);
      const blueHint = bluePages > 0
        ? `ตรวจพบหมึกปากกาสีน้ำเงิน ${bluePages}/${pageItems.length} หน้า (เปิดโหมดแยกหมึกอัตโนมัติพร้อมตัดเส้นแบบฟอร์ม 100%)`
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
          if (ds.fabrics[ck] && sh.fabrics[ck]) {
            Object.assign(sh.fabrics[ck], ds.fabrics[ck]);
          }
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
          width: dw.width || '',
          height: dw.height || '',
          extL: dw.extL || '',
          extR: dw.extR || '',
          extT: dw.extT || '',
          extB: dw.extB || '',
          wallL: dw.wallL || '',
          wallR: dw.wallR || '',
          ceilT: dw.ceilT || '',
          floorB: dw.floorB || '',
          fullW: dw.fullW || '',
          fullH: dw.fullH || '',
          curtainStyle1: dw.curtainStyle1 || '',
          curtainStyle2: dw.curtainStyle2 || '',
          pieces1: dw.pieces1 || (dw.curtainStyle1 && typeof isBlindOrRollerStyle === 'function' && !isBlindOrRollerStyle(dw.curtainStyle1) ? '2' : ''),
          hookSize: dw.hookSize || '',
          box: dw.box || '',
          mount: dw.mount || '',
        });
        if (w.curtainStyle1 && typeof inferNaturalRodTypeForStyle === 'function') {
          w.rodType = inferNaturalRodTypeForStyle(w.curtainStyle1) || '';
        }
        return w;
      });
      sh.windows.forEach(w => {
        if (typeof autoCalculateWindow === 'function') autoCalculateWindow(w, sh);
      });
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

    // ลากกรอบบนภาพ PDF (Interactive Region Crop OCR)
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
        boxEl.style.left = x + 'px';
        boxEl.style.top = y + 'px';
        boxEl.style.width = '0px';
        boxEl.style.height = '0px';
        wrap.appendChild(boxEl);
        cropDrag = { pageIdx: +wrap.dataset.pdfCropPage, wrap, rect, startX: x, startY: y, boxEl };
        wrap.setPointerCapture(e.pointerId);
      });
      prevBox.addEventListener('pointermove', e => {
        if (!cropDrag) return;
        const x = Math.max(0, Math.min(cropDrag.rect.width, e.clientX - cropDrag.rect.left));
        const y = Math.max(0, Math.min(cropDrag.rect.height, e.clientY - cropDrag.rect.top));
        const left = Math.min(cropDrag.startX, x);
        const top = Math.min(cropDrag.startY, y);
        const w = Math.abs(x - cropDrag.startX);
        const h = Math.abs(y - cropDrag.startY);
        cropDrag.boxEl.style.left = left + 'px';
        cropDrag.boxEl.style.top = top + 'px';
        cropDrag.boxEl.style.width = w + 'px';
        cropDrag.boxEl.style.height = h + 'px';
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
        const rW = cropDrag.rect.width;
        const rH = cropDrag.rect.height;
        cropDrag.boxEl.remove();
        cropDrag = null;
        if (w >= 10 && h >= 8) {
          runCropOcrOnRegion(pageIdx, { x: left / rW, y: top / rH, w: w / rW, h: h / rH });
        }
      };
      prevBox.addEventListener('pointerup', endCrop);
      prevBox.addEventListener('pointercancel', () => {
        if (cropDrag) { cropDrag.boxEl.remove(); cropDrag = null; }
      });
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
        else if (parts.length === 3 && draftData.sheets[si][parts[1]]) {
          draftData.sheets[si][parts[1]][parts[2]] = e.target.value;
        } else if (parts.length === 4 && draftData.sheets[si][parts[1]] && draftData.sheets[si][parts[1]][parts[2]]) {
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
      if (ocrPgBtn) {
        runLocalOcr(+ocrPgBtn.dataset.pdfOcrPage);
        return;
      }
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
        const sh = draftData.sheets[si];
        if (sh) {
          sh.windows.push(emptyWin(sh.windows.length + 1));
          renderReviewForm();
        }
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
        const n = draftData.sheets.length + 1;
        draftData.sheets.push(emptySheet(n, null));
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
    mapSpatialNumbersToWindow,
  };
})();
