/* =========================================================
   PDF Handwriting / Scan Plan Importer (js/pdf-import.js)
   - รองรับนำเข้าไฟล์ PDF แปลนงานลายมือเขียน / สแกน
   - แสดงภาพแต่ละหน้า PDF เทียบข้างแบบฟอร์มตรวจสอบ
   - รองรับอ่านลายมืออัตโนมัติด้วย AI (Gemini Vision API Key) + อ่านข้อความ PDF เบื้องต้นอัตโนมัติ
   - Generate เป็นออเดอร์จริงในระบบ พร้อมเปิดหน้าแปลนแก้ไขเฉพาะจุดได้ทันที
   ========================================================= */
const PdfHandwritingImporter = (() => {
  const GEMINI_KEY_STORAGE = 'mto-gemini-api-key-v1';
  const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  let pageImages = []; // [{ pageNo, dataUrl, base64, text }]
  let rawPdfBase64 = '';
  let fileName = '';
  let draftData = null;

  const escP = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function emptyDraft() {
    return {
      customer: { name: '', mobile: '', building: '', road: '', district: '', province: '' },
      staff: { orderNo: '-', name: '', branch: '' },
      sheets: [
        {
          roomName: 'ห้องที่ 1',
          notes: [],
          fabrics: { blackout: { name: '', design: '', color: '' }, sheer: { name: '', design: '', color: '' }, roller: { group: '', name: '', color: '' }, blinds: { group: '', name: '', color: '' } },
          rods: { pleat: '', show: '', wave: '' },
          windows: [
            { planNo: '1', label: 'W1', width: '', height: '', extL: '', extR: '', extT: '', extB: '', fullW: '', fullH: '', curtainStyle1: '', curtainStyle2: '', pieces1: '', hookSize: '', box: '', mount: '' },
          ],
        },
      ],
    };
  }

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = PDFJS_CDN;
      sc.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('pdfjsLib unavailable'));
        }
      };
      sc.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(sc);
    });
  }

  function setStatus(msg, isErr = false) {
    const el = document.getElementById('pdfImpStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.style.color = isErr ? '#b91c1c' : '#0f5132';
    el.style.background = isErr ? '#fee2e2' : '#dcfce7';
    el.style.borderColor = isErr ? '#fca5a5' : '#86efac';
    el.hidden = !msg;
  }

  function heuristicParseText(pages) {
    const fullText = pages.map(p => p.text || '').join('\n');
    const draft = emptyDraft();
    if (!fullText.trim()) return draft;

    const mCust = /(?:ชื่อลูกค้า|ลูกค้า|คุณ)\s*[:：]?\s*([^\n\r,;]{2,45})/i.exec(fullText);
    if (mCust) draft.customer.name = mCust[1].trim();
    const mMob = /(0\d{1,2}[-\s]?\d{3}[-\s]?\d{4})/.exec(fullText);
    if (mMob) draft.customer.mobile = mMob[1].replace(/\s+/g, '');
    const mLoc = /(?:โครงการ|หมู่บ้าน|อาคาร|สถานที่)\s*[:：]?\s*([^\n\r]{2,60})/i.exec(fullText);
    if (mLoc) draft.customer.building = mLoc[1].trim();

    const sheets = [];
    pages.forEach((pg, pi) => {
      const txt = pg.text || '';
      const mRoom = /(?:ห้อง|MAP\s*ROOM|ROOM)\s*[:：]?\s*([^\n\r]{2,40})/i.exec(txt);
      const roomName = mRoom ? mRoom[1].trim() : `ห้องที่ ${pi + 1}`;
      const wins = [];
      const winRegex = /\b([WD]\s*\d+)\b[^\n\r]{0,50}?(\d{2,3}(?:\.\d+)?)\s*[xX×*]\s*(\d{2,3}(?:\.\d+)?)/g;
      let m;
      while ((m = winRegex.exec(txt)) !== null) {
        const lbl = m[1].replace(/\s+/g, '').toUpperCase();
        const num = lbl.replace(/^[WD]/, '') || String(wins.length + 1);
        wins.push({
          planNo: num,
          label: lbl,
          width: m[2],
          height: m[3],
          extL: '', extR: '', extT: '', extB: '', fullW: '', fullH: '',
          curtainStyle1: /ม่านลอน/.test(txt) ? 'ม่านลอน' : (/ม่านม้วน/.test(txt) ? 'ม่านม้วน' : (/มู่ลี่/.test(txt) ? 'มู่ลี่ไม้' : (/ม่านจีบ/.test(txt) ? 'ม่านจีบ' : ''))),
          curtainStyle2: /โปร่ง/.test(txt) ? 'ม่านจีบ' : '',
          pieces1: '', hookSize: '', box: '', mount: '',
        });
      }
      if (!wins.length) {
        const dimRegex = /(\d{2,3}(?:\.\d+)?)\s*[xX×*]\s*(\d{2,3}(?:\.\d+)?)/g;
        let dm;
        while ((dm = dimRegex.exec(txt)) !== null && wins.length < 8) {
          const idx = wins.length + 1;
          wins.push({
            planNo: String(idx), label: 'W' + idx, width: dm[1], height: dm[2],
            extL: '', extR: '', extT: '', extB: '', fullW: '', fullH: '',
            curtainStyle1: '', curtainStyle2: '', pieces1: '', hookSize: '', box: '', mount: '',
          });
        }
      }
      if (!wins.length) {
        wins.push({ planNo: '1', label: 'W1', width: '', height: '', extL: '', extR: '', extT: '', extB: '', fullW: '', fullH: '', curtainStyle1: '', curtainStyle2: '', pieces1: '', hookSize: '', box: '', mount: '' });
      }
      sheets.push({
        roomName,
        notes: [],
        fabrics: { blackout: { name: '', design: '', color: '' }, sheer: { name: '', design: '', color: '' }, roller: { group: '', name: '', color: '' }, blinds: { group: '', name: '', color: '' } },
        rods: { pleat: '', show: '', wave: '' },
        windows: wins,
      });
    });
    if (sheets.length) draft.sheets = sheets;
    return draft;
  }

  async function runGeminiOcr() {
    const keyInput = document.getElementById('pdfImpGeminiKey');
    const apiKey = String((keyInput && keyInput.value) || '').trim();
    if (!apiKey) {
      setStatus('กรุณากรอก Gemini API Key เพื่ออ่านลายมือจาก PDF อัตโนมัติ (หรือกรอก/แก้ไขข้อมูลในฝั่งขวาได้ทันที)', true);
      if (keyInput) keyInput.focus();
      return;
    }
    try { localStorage.setItem(GEMINI_KEY_STORAGE, apiKey); } catch (e) {}
    if (!pageImages.length && !rawPdfBase64) {
      setStatus('กรุณาเลือกไฟล์ PDF ก่อนเริ่มอ่านลายมือ', true);
      return;
    }

    const btn = document.getElementById('pdfImpRunAiBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังอ่านลายมือด้วย AI...'; }
    setStatus('⏳ กำลังส่งหน้าแปลน PDF ให้ AI อ่านลายมือและแยกข้อมูลแต่ละห้อง/บาน...');

    const promptText = [
      'คุณคือผู้เชี่ยวชาญอ่านแบบแปลนวัดหน้างานผ้าม่าน (MTO Request Order Form) ที่เป็นลายมือเขียนหรือพิมพ์',
      'จงอ่านข้อมูลจากทุกหน้าของ PDF นี้ แล้วส่งออกเป็น JSON เท่านั้น (ห้ามใส่ข้อความอื่นนอก JSON) ตามโครงสร้างนี้:',
      '{',
      '  "customer": { "name": "", "mobile": "", "building": "", "road": "", "district": "", "province": "" },',
      '  "staff": { "orderNo": "-", "name": "", "branch": "" },',
      '  "sheets": [',
      '    {',
      '      "roomName": "ชื่อห้อง เช่น ห้องนอนใหญ่",',
      '      "notes": ["หมายเหตุข้อ 1"],',
      '      "fabrics": {',
      '        "blackout": { "name": "", "design": "", "color": "" },',
      '        "sheer": { "name": "", "design": "", "color": "" },',
      '        "roller": { "group": "", "name": "", "color": "" },',
      '        "blinds": { "group": "", "name": "", "color": "" }',
      '      },',
      '      "rods": { "pleat": "", "show": "", "wave": "" },',
      '      "windows": [',
      '        {',
      '          "planNo": "1", "label": "W1 หรือ D1",',
      '          "width": "กว้างเฟรม ซม.", "height": "สูงเฟรม ซม.",',
      '          "extL": "เผื่อซ้าย", "extR": "เผื่อขวา", "extT": "เผื่อบน", "extB": "เผื่อล่าง",',
      '          "wallL": "", "wallR": "", "ceilT": "", "floorB": "",',
      '          "fullW": "กว้างเต็ม", "fullH": "สูงเต็ม",',
      '          "curtainStyle1": "ม่านจีบ|ม่านลอน|ม่านตาไก่|ม่านพับ|ม่านม้วน|มู่ลี่ไม้|มู่ลี่อลูมิเนียม หรือว่าง",',
      '          "curtainStyle2": "รูปแบบชั้นที่ 2 เช่น ม่านจีบ/ม่านลอน ถ้ามีม่านโปร่ง",',
      '          "pieces1": "1 หรือ 2", "hookSize": "No.5|No.6|No.8|No.9 หรือว่าง",',
      '          "box": "yes|no หรือว่าง", "mount": "wall|ceiling หรือว่าง"',
      '        }',
      '      ]',
      '    }',
      '  ]',
      '}',
      'ข้อกำหนด: ใช้ตัวเลขหน่วยเซนติเมตร (ซม.) เท่านั้น ช่องใดไม่มีในภาพให้ใส่ "" (ห้ามเดามั่ว) ถ้ามีหลายห้อง/หลายหน้าให้แยกเป็นหลาย element ใน sheets',
    ].join('\n');

    const parts = [{ text: promptText }];
    if (pageImages.length) {
      pageImages.slice(0, 8).forEach(pg => {
        parts.push({ inline_data: { mime_type: 'image/jpeg', data: pg.base64 } });
      });
    } else if (rawPdfBase64) {
      parts.push({ inline_data: { mime_type: 'application/pdf', data: rawPdfBase64 } });
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        }),
      });
      if (!res.ok) {
        const errTxt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${errTxt.slice(0, 160)}`);
      }
      const data = await res.json();
      const rawText = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts)
        ? data.candidates[0].content.parts.map(p => p.text || '').join('')
        : '';
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      draftData = normalizeDraft(parsed);
      renderReviewForm();
      const totalWins = draftData.sheets.reduce((s, sh) => s + (sh.windows ? sh.windows.length : 0), 0);
      setStatus(`✔ อ่านข้อมูลจาก PDF สำเร็จ! พบ ${draftData.sheets.length} ห้อง / ${totalWins} บาน — ตรวจสอบหรือแก้ไขก่อนกดสร้างออเดอร์ได้เลย`);
    } catch (err) {
      console.warn('Gemini PDF OCR error:', err);
      setStatus(`⚠️ อ่านลายมือด้วย AI ไม่สำเร็จ (${err.message || err}) — ตรวจสอบ API Key หรือกรอกข้อมูลเทียบภาพฝั่งซ้ายแล้วกดสร้างออเดอร์ได้ทันที`, true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🤖 อ่านลายมือจาก PDF อัตโนมัติ (AI)'; }
    }
  }

  function normalizeDraft(raw) {
    const base = emptyDraft();
    if (!raw || typeof raw !== 'object') return base;
    Object.assign(base.customer, raw.customer || {});
    Object.assign(base.staff, raw.staff || {});
    if (Array.isArray(raw.sheets) && raw.sheets.length) {
      base.sheets = raw.sheets.map((s, si) => ({
        roomName: String(s.roomName || s.room || `ห้องที่ ${si + 1}`).trim(),
        notes: Array.isArray(s.notes) ? s.notes.filter(Boolean).map(String) : [],
        fabrics: {
          blackout: Object.assign({ name: '', design: '', color: '' }, s.fabrics && s.fabrics.blackout || {}),
          sheer: Object.assign({ name: '', design: '', color: '' }, s.fabrics && s.fabrics.sheer || {}),
          roller: Object.assign({ group: '', name: '', color: '' }, s.fabrics && s.fabrics.roller || {}),
          blinds: Object.assign({ group: '', name: '', color: '' }, s.fabrics && s.fabrics.blinds || {}),
        },
        rods: Object.assign({ pleat: '', show: '', wave: '' }, s.rods || {}),
        windows: (Array.isArray(s.windows) && s.windows.length ? s.windows : [{}]).map((w, wi) => ({
          planNo: String(w.planNo || (wi + 1)),
          label: String(w.label || ('W' + (wi + 1))),
          width: String(w.width ?? ''),
          height: String(w.height ?? ''),
          extL: String(w.extL ?? ''),
          extR: String(w.extR ?? ''),
          extT: String(w.extT ?? ''),
          extB: String(w.extB ?? ''),
          wallL: String(w.wallL ?? ''),
          wallR: String(w.wallR ?? ''),
          ceilT: String(w.ceilT ?? ''),
          floorB: String(w.floorB ?? ''),
          fullW: String(w.fullW ?? ''),
          fullH: String(w.fullH ?? ''),
          curtainStyle1: String(w.curtainStyle1 || ''),
          curtainStyle2: String(w.curtainStyle2 || ''),
          pieces1: String(w.pieces1 || ''),
          hookSize: String(w.hookSize || ''),
          box: String(w.box || ''),
          mount: String(w.mount || ''),
        })),
      }));
    }
    return base;
  }

  function renderPagesPreview() {
    const box = document.getElementById('pdfImpPreview');
    if (!box) return;
    if (!pageImages.length) {
      box.innerHTML = `<div class="hint c" style="padding:30px">📄 เลือกไฟล์ PDF แปลนงานลายมือเขียนด้านบนเพื่อแสดงภาพแต่ละหน้าเทียบข้อมูล</div>`;
      return;
    }
    box.innerHTML = pageImages.map(pg => `
      <div class="pdf-imp-page-card">
        <div style="font-size:11.5px;font-weight:700;color:#334155;margin-bottom:4px">หน้า ${pg.pageNo} / ${pageImages.length} (${escP(fileName)})</div>
        <img src="${pg.dataUrl}" alt="PDF page ${pg.pageNo}">
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
          <label>ชื่อลูกค้า <input data-pdf-field="customer.name" value="${escP(draftData.customer.name)}"></label>
          <label>เบอร์มือถือ <input data-pdf-field="customer.mobile" value="${escP(draftData.customer.mobile)}"></label>
          <label class="full">สถานที่ติดตั้ง / หมู่บ้าน / อาคาร <input data-pdf-field="customer.building" value="${escP(draftData.customer.building)}"></label>
        </div>
      </div>
      ${draftData.sheets.map((sh, si) => `
        <div class="subcard" style="margin-bottom:8px;border-left:3px solid #1f6feb">
          <div class="inline" style="justify-content:space-between;margin-bottom:6px;flex-wrap:wrap">
            <label style="flex:1;min-width:160px;font-weight:700">🏠 ห้องที่ ${si + 1}
              <input data-pdf-sh="${si}.roomName" value="${escP(sh.roomName)}" placeholder="ชื่อห้อง">
            </label>
            <div class="inline" style="margin-top:14px">
              <button type="button" data-pdf-add-win="${si}" style="padding:3px 8px;font-size:11.5px">➕ เพิ่มบาน</button>
              ${draftData.sheets.length > 1 ? `<button type="button" class="danger" data-pdf-del-sh="${si}" style="padding:3px 8px;font-size:11.5px">ลบห้อง</button>` : ''}
            </div>
          </div>
          <div class="grid2" style="margin-bottom:6px">
            <label>ผ้าม่านทึบ <input data-pdf-sh="${si}.fabrics.blackout.name" value="${escP(sh.fabrics.blackout.name)}" placeholder="ชื่อผ้าทึบ"></label>
            <label>ผ้าม่านโปร่ง <input data-pdf-sh="${si}.fabrics.sheer.name" value="${escP(sh.fabrics.sheer.name)}" placeholder="ชื่อผ้าโปร่ง"></label>
          </div>
          <div style="overflow-x:auto">
            <table class="ed-tbl" style="min-width:520px">
              <thead>
                <tr>
                  <th style="width:52px">จุด</th>
                  <th style="width:65px">กว้าง</th>
                  <th style="width:65px">สูง</th>
                  <th style="width:52px">+ซ้าย</th>
                  <th style="width:52px">+ขวา</th>
                  <th style="width:52px">+บน</th>
                  <th style="min-width:105px">รูปแบบม่าน</th>
                  <th style="width:32px"></th>
                </tr>
              </thead>
              <tbody>
                ${sh.windows.map((w, wi) => `
                  <tr>
                    <td><input data-pdf-win="${si}.${wi}.label" value="${escP(w.label)}" placeholder="W${wi + 1}"></td>
                    <td><input type="number" step="0.5" data-pdf-win="${si}.${wi}.width" value="${escP(w.width)}" placeholder="ซม."></td>
                    <td><input type="number" step="0.5" data-pdf-win="${si}.${wi}.height" value="${escP(w.height)}" placeholder="ซม."></td>
                    <td><input type="number" step="0.5" data-pdf-win="${si}.${wi}.extL" value="${escP(w.extL)}"></td>
                    <td><input type="number" step="0.5" data-pdf-win="${si}.${wi}.extR" value="${escP(w.extR)}"></td>
                    <td><input type="number" step="0.5" data-pdf-win="${si}.${wi}.extT" value="${escP(w.extT)}"></td>
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

  async function handlePdfFile(file) {
    if (!file) return;
    fileName = file.name || 'plan.pdf';
    pageImages = [];
    rawPdfBase64 = '';
    setStatus(`⏳ กำลังโหลดและแปลงไฟล์ "${fileName}" ...`);
    renderPagesPreview();

    try {
      const arrBuf = await file.arrayBuffer();
      // Store raw base64 fallback
      const u8 = new Uint8Array(arrBuf);
      let bin = '';
      for (let i = 0; i < u8.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      }
      rawPdfBase64 = btoa(bin);

      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;
      const maxPages = Math.min(pdf.numPages, 12);
      for (let p = 1; p <= maxPages; p++) {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1] || '';
        let txt = '';
        try {
          const tc = await page.getTextContent();
          txt = (tc.items || []).map(it => it.str).join(' ');
        } catch (e) {}
        pageImages.push({ pageNo: p, dataUrl, base64, text: txt });
      }
      draftData = heuristicParseText(pageImages);
      renderPagesPreview();
      renderReviewForm();
      const savedKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
      if (savedKey) {
        setStatus(`✔ โหลดไฟล์ "${fileName}" (${pageImages.length} หน้า) เรียบร้อย — กดปุ่ม "🤖 อ่านลายมือจาก PDF อัตโนมัติ (AI)" เพื่อดึงลายมือเข้าตารางทันที`);
      } else {
        setStatus(`✔ โหลดไฟล์ "${fileName}" (${pageImages.length} หน้า) เรียบร้อย — ใส่ Gemini API Key เพื่ออ่านลายมืออัตโนมัติ หรือกรอก/ตรวจข้อมูลด้านขวาแล้วกดสร้างออเดอร์ได้เลย`);
      }
    } catch (err) {
      console.warn('PDF load error:', err);
      draftData = emptyDraft();
      renderPagesPreview();
      renderReviewForm();
      setStatus(`⚠️ โหลดภาพตัวอย่าง PDF ไม่สำเร็จ (${err.message || err}) — ยังสามารถใช้ปุ่ม AI อ่านไฟล์ PDF โดยตรงหรือกรอกข้อมูลด้านขวาได้`, true);
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
      const rawWins = Array.isArray(ds.windows) && ds.windows.length ? ds.windows : [{}];
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
    const keyInput = document.getElementById('pdfImpGeminiKey');
    if (keyInput) {
      try { keyInput.value = localStorage.getItem(GEMINI_KEY_STORAGE) || ''; } catch (e) {}
    }
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
    const aiBtn = document.getElementById('pdfImpRunAiBtn');
    if (aiBtn) aiBtn.addEventListener('click', runGeminiOcr);
    const createBtn = document.getElementById('pdfImpCreateBtn');
    if (createBtn) createBtn.addEventListener('click', generateOrderFromDraft);

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
          const n = sh.windows.length + 1;
          sh.windows.push({ planNo: String(n), label: 'W' + n, width: '', height: '', extL: '', extR: '', extT: '', extB: '', fullW: '', fullH: '', curtainStyle1: '', curtainStyle2: '', pieces1: '', hookSize: '', box: '', mount: '' });
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
          windows: [{ planNo: '1', label: 'W1', width: '', height: '', extL: '', extR: '', extT: '', extB: '', fullW: '', fullH: '', curtainStyle1: '', curtainStyle2: '', pieces1: '', hookSize: '', box: '', mount: '' }],
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

  return { init, open, close, heuristicParseText, normalizeDraft };
})();
