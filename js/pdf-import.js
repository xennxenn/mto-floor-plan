/* =========================================================
   Non-AI Local OCR PDF Handwriting / Scan Importer (js/pdf-import.js)
   - ไม่ใช้ AI / ไม่ต้องใช้ API Key — ประมวลผล OCR ทั้งหมดในเบราว์เซอร์ของผู้ใช้
   - ใช้ PDF.js แปลงทุกหน้า PDF เป็นภาพความละเอียดสูง + ดึงข้อความฝังใน PDF
   - ใช้ Tesseract.js (ภาษาไทย tha + อังกฤษ/ตัวเลข eng) พร้อมตัวปรับภาพลายมือ (Canvas Preprocessing)
   - แยกโซนอ่านแบบฟอร์ม MTO อัตโนมัติ (หัวลูกค้า / ห้อง / 4 บานหน้าต่าง-ประตู / ตารางผ้า)
     โดยเน้นตัวเลข (Whitelist 0-9 . + / -) พร้อมตำแหน่งพิกัด X,Y และคำสำคัญภาษาไทย
   - รองรับ "ลากกรอบอ่านเฉพาะจุด" บนภาพ PDF เพื่ออ่านตัวเลข/คำไทยลงช่องที่เลือกทันที
   - สร้างเป็นออเดอร์จริงในระบบพร้อมคลิกแก้ไขเฉพาะจุดบนแปลนได้ทันที
   ========================================================= */
const PdfHandwritingImporter = (() => {
  const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

  let pageItems = []; // [{ pageNo, canvas, dataUrl, text, ocrLog }]
  let fileName = '';
  let draftData = null;
  let activeTargetInput = null;
  let ocrBusy = false;

  const escP = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function emptyWin(idx = 1) {
    return {
      planNo: String(idx), label: 'W' + idx,
      width: '', height: '', extL: '', extR: '', extT: '', extB: '',
      wallL: '', wallR: '', ceilT: '', floorB: '', fullW: '', fullH: '',
      curtainStyle1: '', curtainStyle2: '', pieces1: '', hookSize: '', box: '', mount: '',
    };
  }

  function emptyDraft() {
    return {
      customer: { name: '', mobile: '', building: '', road: '', district: '', province: '' },
      staff: { orderNo: '-', name: '', branch: '' },
      sheets: [
        {
          roomName: 'ห้องที่ 1',
          notes: [],
          fabrics: {
            blackout: { name: '', design: '', color: '' },
            sheer: { name: '', design: '', color: '' },
            roller: { group: '', name: '', color: '' },
            blinds: { group: '', name: '', color: '' },
          },
          rods: { pleat: '', show: '', wave: '' },
          windows: [emptyWin(1)],
        },
      ],
    };
  }

  /* =========================================================
     1. Script Loaders (PDF.js & Tesseract.js — 100% Local in Browser)
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

  /* =========================================================
     2. Thai & Handwritten Number Cleaning Helpers (No AI)
     ========================================================= */
  const THAI_DIGIT_MAP = { '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9' };

  function toArabicDigits(str) {
    return String(str || '').replace(/[๐-๙]/g, ch => THAI_DIGIT_MAP[ch] || ch);
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
    // กรณีมีจุดทศนิยมเกิน 1 จุด ให้เก็บจุดแรก
    const parts = s.split('.');
    if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
    const n = parseFloat(s);
    if (isNaN(n) || !Number.isFinite(n) || n < min || n > max) return '';
    return String(Math.round(n * 10) / 10);
  }

  function detectThaiCurtainStyle(text) {
    const s = String(text || '').replace(/\s+/g, '');
    if (/ม่านม้วน|ม้วน|roller/i.test(s)) return 'ม่านม้วน';
    if (/มู่ลี่ไม้|ไม้บาส|basswood/i.test(s)) return 'มู่ลี่ไม้';
    if (/มู่ลี่อลู|อลูมิเนียม/i.test(s)) return 'มู่ลี่อลูมิเนียม';
    if (/มู่ลี่|blinds/i.test(s)) return 'มู่ลี่ไม้';
    if (/ปรับแสง/i.test(s)) return 'ม่านปรับแสง';
    if (/ลอนไข่ปลา/i.test(s)) return 'ม่านลอนไข่ปลา';
    if (/ลอนเทป/i.test(s)) return 'ม่านลอนเทป';
    if (/ม่านลอน|ลอน/i.test(s)) return 'ม่านลอน';
    if (/ตาไก่/i.test(s)) return 'ม่านตาไก่';
    if (/ม่านพับ|พับ/i.test(s)) return 'ม่านพับ';
    if (/ม่านจีบ|จีบ/i.test(s)) return 'ม่านจีบ';
    return '';
  }

  function detectHookSize(text) {
    const s = toArabicDigits(String(text || ''));
    const m = /(?:No\.?|เบอร์|ตะขอ)\s*([5689])/i.exec(s);
    return m ? `No.${m[1]}` : '';
  }

  function fuzzyMatchFabricFromDb(text) {
    if (typeof masterDB === 'undefined' || !Array.isArray(masterDB.fabrics)) return '';
    const upper = String(text || '').toUpperCase();
    for (const fab of masterDB.fabrics) {
      const nm = String(fab && fab.name || '').trim().toUpperCase();
      if (nm.length >= 4 && upper.includes(nm)) return fab.name;
    }
    return '';
  }

  /* =========================================================
     3. Image Preprocessing Pipeline (Handwriting & Table Cleanup)
     ========================================================= */
  function cropAndPreprocess(srcCanvas, normRect, inkMode = 'normal', scaleUp = 1.6) {
    const sx = Math.max(0, Math.floor(normRect.x * srcCanvas.width));
    const sy = Math.max(0, Math.floor(normRect.y * srcCanvas.height));
    const sw = Math.max(10, Math.min(srcCanvas.width - sx, Math.ceil(normRect.w * srcCanvas.width)));
    const sh = Math.max(10, Math.min(srcCanvas.height - sy, Math.ceil(normRect.h * srcCanvas.height)));

    const out = document.createElement('canvas');
    out.width = Math.round(sw * scaleUp);
    out.height = Math.round(sh * scaleUp);
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, out.width, out.height);

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

    // Otsu threshold for automatic ink/paper separation
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
    // ปรับ threshold ตามโหมดความเข้มลายมือ
    if (inkMode === 'faint') threshold = Math.min(232, threshold + 28);
    else if (inkMode === 'bold') threshold = Math.max(95, threshold - 12);
    else threshold = Math.min(220, threshold + 10);

    const bin = new Uint8Array(len); // 1 = ink (black), 0 = paper (white)
    for (let i = 0; i < len; i++) {
      bin[i] = gray[i] < threshold ? 1 : 0;
    }

    // โหมดตัดเส้นตารางแนวนอน/แนวตั้งยาวๆ (สำหรับแบบฟอร์มที่มีเส้นเยอะ)
    if (inkMode === 'bold') {
      const w = out.width, h = out.height;
      const minHRun = Math.max(45, Math.floor(w * 0.25));
      for (let y = 0; y < h; y++) {
        let run = 0;
        for (let x = 0; x <= w; x++) {
          if (x < w && bin[y * w + x]) {
            run++;
          } else {
            if (run >= minHRun) {
              for (let rx = x - run; rx < x; rx++) bin[y * w + rx] = 0;
            }
            run = 0;
          }
        }
      }
      const minVRun = Math.max(45, Math.floor(h * 0.28));
      for (let x = 0; x < w; x++) {
        let run = 0;
        for (let y = 0; y <= h; y++) {
          if (y < h && bin[y * w + x]) {
            run++;
          } else {
            if (run >= minVRun) {
              for (let ry = y - run; ry < y; ry++) bin[ry * w + x] = 0;
            }
            run = 0;
          }
        }
      }
    }

    // โหมดลายมือจาง/ดินสอ: ขยายความหนาเส้นหมึก 1px (dilation) ให้อ่านง่ายขึ้น
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
    return out;
  }

  /* =========================================================
     4. Spatial Number Mapping inside a Window Quadrant (No AI)
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

    // 1) แถบบน (y: 0.04..0.32, x: 0.15..0.78) -> เผื่อซ้าย (extL), กว้างเฟรม (width), เผื่อขวา (extR)
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

    // 2) แถบขวา (x: 0.70..0.99, y: 0.22..0.88, ไม่ซ้ำกับแถบบน) -> เผื่อบน (extT), สูงเฟรม (height), เผื่อล่าง (extB)
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

    // 3) ฝั่งซ้าย (x < 0.22, y: 0.35..0.75) -> สูงเต็ม (fullH)
    const leftFull = nums.find(p => p.cx < 0.23 && p.cy >= 0.35 && p.cy <= 0.75 && p.n >= 100);
    if (leftFull && !win.fullH) win.fullH = leftFull.val;

    // 4) ล่างกลาง (y > 0.78, x: 0.25..0.75) -> กว้างเต็ม (fullW)
    const botFull = nums.find(p => p.cy >= 0.78 && p.cx >= 0.25 && p.cx <= 0.75 && p.n >= 50);
    if (botFull && !win.fullW) win.fullW = botFull.val;
  }

  /* =========================================================
     5. Heuristic Thai + Number Text Parser (works on both PDF Text & OCR Text)
     ========================================================= */
  function heuristicParseText(pages) {
    const fullText = toArabicDigits(pages.map(p => p.text || '').join('\n'));
    const draft = emptyDraft();
    if (!fullText.trim()) return draft;

    const mCust = /(?:ชื่อลูกค้า|ลูกค้า|CUSTOMER\s*NAME|คุณ)\s*[:：]?\s*([ก-๙a-zA-Z.\s]{2,40})/i.exec(fullText);
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
        // รองรับรูปแบบ "กว้าง 200 สูง 250" หรือ "200 x 250"
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
      sheets.push({
        roomName,
        notes: [],
        fabrics: {
          blackout: { name: matchedFab, design: '', color: '' },
          sheer: { name: '', design: '', color: '' },
          roller: { group: '', name: '', color: '' },
          blinds: { group: '', name: '', color: '' },
        },
        rods: { pleat: '', show: '', wave: '' },
        windows: wins,
      });
    });
    if (sheets.length) draft.sheets = sheets;
    return draft;
  }

  /* =========================================================
     6. Main Non-AI Local OCR Runner (MTO Multi-Zone + Freeform)
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

  async function runLocalOcr() {
    if (ocrBusy) return;
    if (!pageItems.length) {
      setStatus('กรุณาเลือกไฟล์ PDF แปลนงานก่อนเริ่มอ่าน OCR', true);
      return;
    }

    const layoutMode = (document.getElementById('pdfImpLayoutMode') || {}).value || 'mto_form';
    const inkMode = (document.getElementById('pdfImpInkMode') || {}).value || 'normal';
    const btn = document.getElementById('pdfImpRunOcrBtn');
    ocrBusy = true;
    if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังอ่าน OCR ในเครื่อง...'; }
    setProgress(5, true);
    setStatus('⏳ กำลังโหลดเอนจิน OCR ภาษาไทย + ตัวเลข (ทำงานในเบราว์เซอร์ 100% ไม่ใช้ AI)...');

    let workerTha = null;
    let workerNum = null;
    try {
      const Tesseract = await loadTesseract();
      setProgress(15, true);
      workerTha = await Tesseract.createWorker('tha+eng');
      setProgress(25, true);
      workerNum = await Tesseract.createWorker('eng');
      await workerNum.setParameters({
        tessedit_char_whitelist: '0123456789.+/-xX ',
        tessedit_pageseg_mode: '6',
      });

      const newDraft = emptyDraft();
      newDraft.sheets = [];
      const totalPages = pageItems.length;

      for (let pi = 0; pi < totalPages; pi++) {
        const pg = pageItems[pi];
        const basePct = 25 + (pi / totalPages) * 70;
        const stepPct = 70 / totalPages;

        if (layoutMode === 'freeform') {
          setStatus(`🔍 กำลังอ่านหน้า ${pi + 1}/${totalPages} (โหมดสเก็ตช์ทั่วไป — ภาษาไทย + ตัวเลข)...`);
          setProgress(basePct + stepPct * 0.2, true);
          const preCanvas = cropAndPreprocess(pg.canvas, { x: 0, y: 0, w: 1, h: 1 }, inkMode, 1.3);
          const res = await workerTha.recognize(preCanvas);
          const combinedTxt = [pg.text || '', res.data.text || ''].join('\n');
          pg.ocrLog = res.data.text || '';
          const parsedPage = heuristicParseText([{ text: combinedTxt }]);
          if (pi === 0) {
            Object.assign(newDraft.customer, parsedPage.customer);
            Object.assign(newDraft.staff, parsedPage.staff);
          }
          if (parsedPage.sheets && parsedPage.sheets[0]) {
            newDraft.sheets.push(parsedPage.sheets[0]);
          }
          setProgress(basePct + stepPct, true);
        } else {
          // โหมดแบบฟอร์มแปลน MTO มาตรฐาน 4 ช่อง (แยกโซนอ่านอย่างแม่นยำ)
          const logs = [];
          setStatus(`🔍 หน้า ${pi + 1}/${totalPages}: กำลังอ่านข้อมูลลูกค้าและชื่อห้อง (ภาษาไทย)...`);
          setProgress(basePct + stepPct * 0.1, true);

          // Zone 1: Customer & Staff (หน้าแรก)
          if (pi === 0) {
            const custCanvas = cropAndPreprocess(pg.canvas, { x: 0.02, y: 0.055, w: 0.96, h: 0.115 }, inkMode, 1.6);
            const custRes = await workerTha.recognize(custCanvas);
            const cTxt = toArabicDigits((pg.text || '') + '\n' + (custRes.data.text || ''));
            logs.push('[ลูกค้า/พนักงาน] ' + (custRes.data.text || '').replace(/\s+/g, ' ').trim());
            const hp = heuristicParseText([{ text: cTxt }]);
            if (hp.customer.name) newDraft.customer.name = hp.customer.name;
            if (hp.customer.mobile) newDraft.customer.mobile = hp.customer.mobile;
            if (hp.customer.building) newDraft.customer.building = hp.customer.building;
            if (hp.staff.name) newDraft.staff.name = hp.staff.name;
          }

          // Zone 2: Map Room & Notes
          const roomCanvas = cropAndPreprocess(pg.canvas, { x: 0.16, y: 0.165, w: 0.56, h: 0.075 }, inkMode, 1.6);
          const roomRes = await workerTha.recognize(roomCanvas);
          const rTxt = toArabicDigits(roomRes.data.text || '');
          logs.push('[ห้อง] ' + rTxt.replace(/\s+/g, ' ').trim());
          const mRoom = /(?:ROOM|ห้อง)\s*[)）:：]?\s*([ก-๙a-zA-Z0-9\s\-]{2,32})/i.exec(rTxt);
          const shObj = {
            roomName: mRoom ? mRoom[1].trim() : `ห้องที่ ${pi + 1}`,
            notes: [],
            fabrics: {
              blackout: { name: '', design: '', color: '' },
              sheer: { name: '', design: '', color: '' },
              roller: { group: '', name: '', color: '' },
              blinds: { group: '', name: '', color: '' },
            },
            rods: { pleat: '', show: '', wave: '' },
            windows: [],
          };

          // Zone 3: 4 Window Quadrants (2x2)
          const quads = [
            { idx: 1, x: 0.025, y: 0.24, w: 0.475, h: 0.22 },
            { idx: 2, x: 0.50,  y: 0.24, w: 0.475, h: 0.22 },
            { idx: 3, x: 0.025, y: 0.46, w: 0.475, h: 0.22 },
            { idx: 4, x: 0.50,  y: 0.46, w: 0.475, h: 0.22 },
          ];
          for (let qi = 0; qi < quads.length; qi++) {
            const q = quads[qi];
            setStatus(`🔍 หน้า ${pi + 1}/${totalPages}: กำลังอ่านตัวเลขและประเภทม่าน ช่องที่ ${q.idx}/4...`);
            setProgress(basePct + stepPct * (0.25 + qi * 0.16), true);

            const wObj = emptyWin(q.idx);
            // 3a: Header strip of quadrant (W1/D1, ประเภทม่าน, ตะขอ)
            const hdCanvas = cropAndPreprocess(pg.canvas, { x: q.x, y: q.y, w: q.w, h: q.h * 0.24 }, inkMode, 1.8);
            const hdRes = await workerTha.recognize(hdCanvas);
            const hdTxt = toArabicDigits(hdRes.data.text || '');
            const mLbl = /\b([WD]\s*\d+)\b/i.exec(hdTxt);
            if (mLbl) wObj.label = mLbl[1].replace(/\s+/g, '').toUpperCase();
            const st = detectThaiCurtainStyle(hdTxt);
            if (st) wObj.curtainStyle1 = st;
            const hk = detectHookSize(hdTxt);
            if (hk) wObj.hookSize = hk;

            // 3b: Diagram area — Numeric-focused OCR with spatial coordinates!
            const diagCanvas = cropAndPreprocess(pg.canvas, { x: q.x, y: q.y + q.h * 0.22, w: q.w, h: q.h * 0.56 }, inkMode, 1.9);
            const diagRes = await workerNum.recognize(diagCanvas);
            mapSpatialNumbersToWindow(diagRes.data.words || [], diagCanvas.width, diagCanvas.height, wObj);

            // 3c: Bottom calc strip fallback (if width/height still empty)
            if (!wObj.width || !wObj.height) {
              const calcCanvas = cropAndPreprocess(pg.canvas, { x: q.x + q.w * 0.14, y: q.y + q.h * 0.76, w: q.w * 0.65, h: q.h * 0.24 }, inkMode, 1.9);
              const calcRes = await workerNum.recognize(calcCanvas);
              const mDim = /(\d{2,3}(?:\.\d+)?)\s*[xX×]\s*(\d{2,3}(?:\.\d+)?)/.exec(calcRes.data.text || '');
              if (mDim) {
                if (!wObj.width) wObj.width = mDim[1];
                if (!wObj.height) wObj.height = mDim[2];
              }
            }

            logs.push(`[บาน ${q.idx}] ${wObj.label} กว้าง=${wObj.width || '-'} สูง=${wObj.height || '-'} ${wObj.curtainStyle1 || ''}`);
            // เก็บบานที่มีข้อมูล หรือบานแรกเสมอ
            if (wObj.width || wObj.height || wObj.curtainStyle1 || q.idx === 1) {
              shObj.windows.push(wObj);
            }
          }

          // Zone 4: Fabric table strip
          setStatus(`🔍 หน้า ${pi + 1}/${totalPages}: กำลังอ่านตารางผ้า...`);
          setProgress(basePct + stepPct * 0.92, true);
          const fabCanvas = cropAndPreprocess(pg.canvas, { x: 0.12, y: 0.68, w: 0.86, h: 0.10 }, inkMode, 1.6);
          const fabRes = await workerTha.recognize(fabCanvas);
          const fTxt = fabRes.data.text || '';
          const matchedFab = fuzzyMatchFabricFromDb(fTxt);
          if (matchedFab) shObj.fabrics.blackout.name = matchedFab;
          logs.push('[ตารางผ้า] ' + fTxt.replace(/\s+/g, ' ').trim());

          pg.ocrLog = logs.join('\n');
          if (!shObj.windows.length) shObj.windows.push(emptyWin(1));
          newDraft.sheets.push(shObj);
          setProgress(basePct + stepPct, true);
        }
      }

      draftData = newDraft;
      renderReviewForm();
      const totalWins = draftData.sheets.reduce((s, sh) => s + (sh.windows ? sh.windows.length : 0), 0);
      setProgress(100, false);
      setStatus(`✔ อ่านลายมือแบบ OCR ในเครื่องเสร็จสิ้น! (${draftData.sheets.length} ห้อง / ${totalWins} บาน) — คลิกช่องใดก็ได้แล้วลากกรอบบนภาพ PDF เพื่อแก้/อ่านเฉพาะจุดเพิ่มได้`);
    } catch (err) {
      console.warn('Local OCR error:', err);
      setProgress(0, false);
      setStatus(`⚠️ อ่าน OCR ไม่สำเร็จ (${err.message || err}) — กรุณาตรวจสอบอินเทอร์เน็ตสำหรับโหลดชุดภาษาไทยครั้งแรก หรือกรอกข้อมูลเทียบภาพด้านซ้าย`, true);
    } finally {
      if (workerTha) try { await workerTha.terminate(); } catch (e) {}
      if (workerNum) try { await workerNum.terminate(); } catch (e) {}
      ocrBusy = false;
      if (btn) { btn.disabled = false; btn.textContent = '🔍 อ่านตัวเลข & ภาษาไทยจาก PDF (OCR)'; }
    }
  }

  /* =========================================================
     7. Interactive Drag-Crop OCR onto Active Input Field (No AI)
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
    const inkMode = (document.getElementById('pdfImpInkMode') || {}).value || 'normal';
    ocrBusy = true;
    setStatus(`⏳ กำลังอ่านเฉพาะจุดที่ลากกรอบ (${isNumericField ? 'โหมดตัวเลข' : 'โหมดภาษาไทย+อังกฤษ'})...`);

    let worker = null;
    try {
      const Tesseract = await loadTesseract();
      const cropped = cropAndPreprocess(pg.canvas, normRect, inkMode, 2.4);
      worker = await Tesseract.createWorker(isNumericField ? 'eng' : 'tha+eng');
      if (isNumericField) {
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789.+-',
          tessedit_pageseg_mode: '7', // single text line
        });
      }
      const res = await worker.recognize(cropped);
      const raw = String(res.data.text || '').trim();
      const finalVal = isNumericField
        ? normalizeOcrNumber(raw, { min: 0, max: 9999 })
        : toArabicDigits(raw).replace(/\s+/g, ' ').trim();

      if (finalVal) {
        activeTargetInput.value = finalVal;
        activeTargetInput.dispatchEvent(new Event('input', { bubbles: true }));
        setStatus(`✔ อ่านเฉพาะจุดได้ค่า "${finalVal}" ลงในช่องที่เลือกแล้ว!`);
      } else {
        setStatus(`⚠️ ไม่พบ${isNumericField ? 'ตัวเลข' : 'ข้อความ'}ในกรอบที่ลาก (ลองเปลี่ยนโหมดหมึกเป็น "ลายมือจาง / ดินสอ" แล้วลากซ้ำ)`, true);
      }
    } catch (err) {
      setStatus(`⚠️ อ่านเฉพาะจุดไม่สำเร็จ: ${err.message || err}`, true);
    } finally {
      if (worker) try { await worker.terminate(); } catch (e) {}
      ocrBusy = false;
    }
  }

  /* =========================================================
     8. UI Rendering (PDF Page Preview with Drag-Crop + Review Form)
     ========================================================= */
  function renderPagesPreview() {
    const box = document.getElementById('pdfImpPreview');
    if (!box) return;
    if (!pageItems.length) {
      box.innerHTML = `<div class="hint c" style="padding:30px">📄 เลือกไฟล์ PDF แปลนงานลายมือเขียนด้านบน<br><small>ระบบจะแสดงภาพแต่ละหน้าเพื่ออ่านตัวเลขและภาษาไทยด้วย OCR ในเครื่อง (ไม่ใช้ AI)</small></div>`;
      return;
    }
    box.innerHTML = pageItems.map((pg, pi) => `
      <div class="pdf-imp-page-card">
        <div class="inline" style="justify-content:space-between;margin-bottom:4px">
          <span style="font-size:11.5px;font-weight:700;color:#334155">หน้า ${pg.pageNo} / ${pageItems.length} (${escP(fileName)})</span>
          <span style="font-size:11px;color:#1d4ed8">🎯 ลากกรอบบนภาพเพื่ออ่านลงช่องที่เลือก</span>
        </div>
        <div class="pdf-imp-img-wrap" data-pdf-crop-page="${pi}">
          <img src="${pg.dataUrl}" alt="PDF page ${pg.pageNo}" draggable="false">
        </div>
        ${pg.ocrLog ? `
          <details style="margin-top:4px;font-size:11px">
            <summary style="cursor:pointer;color:#475569">👁️ ดูผลข้อความ OCR ดิบของหน้า ${pg.pageNo}</summary>
            <pre style="margin:3px 0 0;padding:5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;white-space:pre-wrap;max-height:110px;overflow:auto">${escP(pg.ocrLog)}</pre>
          </details>
        ` : ''}
      </div>
    `).join('');
  }

  function renderReviewForm() {
    const box = document.getElementById('pdfImpReview');
    if (!box) return;
    if (!draftData) draftData = emptyDraft();
    const curOpts = sel => `<option value="">-- เลือก --</option>` +
      (typeof masterDB !== 'undefined' && masterDB.curtains || []).map(c =>
        `<option value="${escP(c.name)}" ${sel === c.name ? 'selected' : ''}>${escP(c.name)}</option>`
      ).join('');

    box.innerHTML = `
      <div class="subcard" style="margin-bottom:8px;background:#f8fafc">
        <b>👤 ข้อมูลลูกค้า &amp; สถานที่ติดตั้ง</b>
        <div class="grid2" style="margin-top:4px">
          <label>ชื่อลูกค้า <input data-pdf-field="customer.name" data-pdf-label="ชื่อลูกค้า" value="${escP(draftData.customer.name)}"></label>
          <label>เบอร์มือถือ <input data-pdf-field="customer.mobile" data-pdf-label="เบอร์มือถือ" value="${escP(draftData.customer.mobile)}"></label>
          <label class="full">สถานที่ติดตั้ง / หมู่บ้าน / อาคาร <input data-pdf-field="customer.building" data-pdf-label="สถานที่ติดตั้ง" value="${escP(draftData.customer.building)}"></label>
        </div>
      </div>
      ${draftData.sheets.map((sh, si) => `
        <div class="subcard" style="margin-bottom:8px;border-left:3px solid #1f6feb">
          <div class="inline" style="justify-content:space-between;margin-bottom:6px;flex-wrap:wrap">
            <label style="flex:1;min-width:160px;font-weight:700">🏠 ห้องที่ ${si + 1}
              <input data-pdf-sh="${si}.roomName" data-pdf-label="ชื่อห้องที่ ${si + 1}" value="${escP(sh.roomName)}" placeholder="ชื่อห้อง">
            </label>
            <div class="inline" style="margin-top:14px">
              <button type="button" data-pdf-add-win="${si}" style="padding:3px 8px;font-size:11.5px">➕ เพิ่มบาน</button>
              ${draftData.sheets.length > 1 ? `<button type="button" class="danger" data-pdf-del-sh="${si}" style="padding:3px 8px;font-size:11.5px">ลบห้อง</button>` : ''}
            </div>
          </div>
          <div class="grid2" style="margin-bottom:6px">
            <label>ผ้าม่านทึบ <input data-pdf-sh="${si}.fabrics.blackout.name" data-pdf-label="ผ้าม่านทึบ" value="${escP(sh.fabrics.blackout.name)}" placeholder="ชื่อผ้าทึบ"></label>
            <label>ผ้าม่านโปร่ง <input data-pdf-sh="${si}.fabrics.sheer.name" data-pdf-label="ผ้าม่านโปร่ง" value="${escP(sh.fabrics.sheer.name)}" placeholder="ชื่อผ้าโปร่ง"></label>
          </div>
          <div style="overflow-x:auto">
            <table class="ed-tbl" style="min-width:560px">
              <thead>
                <tr>
                  <th style="width:50px">จุด</th>
                  <th style="width:62px">กว้าง</th>
                  <th style="width:62px">สูง</th>
                  <th style="width:48px">+ซ้าย</th>
                  <th style="width:48px">+ขวา</th>
                  <th style="width:48px">+บน</th>
                  <th style="width:48px">+ล่าง</th>
                  <th style="min-width:100px">รูปแบบม่าน</th>
                  <th style="width:30px"></th>
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
                    <td><select data-pdf-win="${si}.${wi}.curtainStyle1">${curOpts(w.curtainStyle1)}</select></td>
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
     9. File Loading & Order Generation
     ========================================================= */
  async function handlePdfFile(file) {
    if (!file) return;
    fileName = file.name || 'plan.pdf';
    pageItems = [];
    setProgress(10, true);
    setStatus(`⏳ กำลังแปลงไฟล์ PDF "${fileName}" เป็นภาพความละเอียดสูง...`);
    renderPagesPreview();

    try {
      const arrBuf = await file.arrayBuffer();
      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;
      const maxPages = Math.min(pdf.numPages, 12);
      for (let p = 1; p <= maxPages; p++) {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 2.2 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        let txt = '';
        try {
          const tc = await page.getTextContent();
          txt = (tc.items || []).map(it => it.str).join(' ');
        } catch (e) {}
        pageItems.push({ pageNo: p, canvas, dataUrl, text: txt, ocrLog: '' });
        setProgress(10 + (p / maxPages) * 80, true);
      }
      draftData = heuristicParseText(pageItems);
      renderPagesPreview();
      renderReviewForm();
      setProgress(100, false);
      setStatus(`✔ โหลดไฟล์ "${fileName}" (${pageItems.length} หน้า) เรียบร้อย — กดปุ่ม "🔍 อ่านตัวเลข & ภาษาไทยจาก PDF (OCR)" เพื่ออ่านลายมืออัตโนมัติ (ไม่ใช้ AI) หรือลากกรอบบนภาพอ่านทีละช่องได้เลย`);
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
          pieces1: dw.pieces1 || (dw.curtainStyle1 && !isBlindOrRollerStyle(dw.curtainStyle1) ? '2' : ''),
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
    if (ocrBtn) ocrBtn.addEventListener('click', runLocalOcr);
    const createBtn = document.getElementById('pdfImpCreateBtn');
    if (createBtn) createBtn.addEventListener('click', generateOrderFromDraft);

    // ติดตามช่องกรอกล่าสุดที่ผู้ใช้คลิก เพื่อรองรับการลากกรอบบนภาพ PDF อ่านลงช่องนั้นทันที
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
        if (w >= 12 && h >= 10) {
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
        draftData.sheets.push({
          roomName: `ห้องที่ ${n}`, notes: [],
          fabrics: { blackout: { name: '', design: '', color: '' }, sheer: { name: '', design: '', color: '' }, roller: { group: '', name: '', color: '' }, blinds: { group: '', name: '', color: '' } },
          rods: { pleat: '', show: '', wave: '' },
          windows: [emptyWin(1)],
        });
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
    detectThaiCurtainStyle,
    detectHookSize,
    mapSpatialNumbersToWindow,
  };
})();
