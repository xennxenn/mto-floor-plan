/* =========================================================
   Master Database – Staff, Curtain Styles, Hook Sizes,
                     Dimension Remarks, and Calculation Formulas
   ========================================================= */
const DB_KEY = 'mto-master-db-v4';

function defaultMasterDB() {
  return {
    staff: [
      { id: 's1', name: 'นฤชา', dept: 'ขาย', branch: 'สาขาเซ็นทรัลลาดพร้าว' },
    ],
    curtains: [
      { id: 'c1', name: 'ม่านจีบ', useHook: true },
      { id: 'c2', name: 'ม่านลอน', useHook: true },
      { id: 'c3', name: 'ม่านตาไก่', useHook: false },
      { id: 'c4', name: 'ม่านพับ', useHook: false },
      { id: 'c5', name: 'ม่านม้วน', useHook: false },
      { id: 'c6', name: 'มู่ลี่ไม้', useHook: false },
      { id: 'c7', name: 'มู่ลี่อลูมิเนียม', useHook: false },
      { id: 'c8', name: 'ม่านปรับแสง', useHook: false },
    ],
    hooks: [
      { id: 'h1', name: 'No.5' },
      { id: 'h2', name: 'No.6' },
      { id: 'h3', name: 'No.8' },
      { id: 'h4', name: 'No.9' },
    ],
    remarks: [
      { id: 'r1', name: 'ชนแอร์' },
      { id: 'r2', name: 'ปลั๊กไฟ' },
      { id: 'r3', name: 'บิ้วอิน' },
      { id: 'r4', name: 'ตู้' },
      { id: 'r5', name: 'เตียง' },
      { id: 'r6', name: 'ติดเสา' },
      { id: 'r7', name: 'ชนฝ้าหลุม' },
    ],
    formulas: [
      {
        id: 'f1',
        name: 'ม่านจีบ (ผ้าหน้าแคบ 140 cm • ลอน 2.5 เท่า)',
        curtainMatch: 'ม่านจีบ',
        widthExp: 'RW',
        heightExp: 'RH',
        piecesExp: 'ceil((RW * 2.5) / 130)',
        qtyExp: 'round(((ceil((RW * 2.5) / 130) * (RH + 35)) / 90) * 10) / 10',
      },
      {
        id: 'f2',
        name: 'ม่านลอน (ผ้าหน้ากว้าง 280 cm • ลอน 2.2 เท่า)',
        curtainMatch: 'ม่านลอน',
        widthExp: 'RW',
        heightExp: 'RH',
        piecesExp: '2',
        qtyExp: 'round((((RW * 2.2) + 30) / 90) * 10) / 10',
      },
      {
        id: 'f3',
        name: 'ม่านตาไก่ (ลอน 2.2 เท่า)',
        curtainMatch: 'ม่านตาไก่',
        widthExp: 'RW',
        heightExp: 'RH',
        piecesExp: 'ceil((RW * 2.2) / 130)',
        qtyExp: 'round(((ceil((RW * 2.2) / 130) * (RH + 35)) / 90) * 10) / 10',
      },
      {
        id: 'f4',
        name: 'ม่านพับ (คิดตามความกว้างหน้าผ้า)',
        curtainMatch: 'ม่านพับ',
        widthExp: 'RW',
        heightExp: 'RH',
        piecesExp: '1',
        qtyExp: 'round(((ceil(RW / 120) * (RH + 40)) / 90) * 10) / 10',
      },
      {
        id: 'f5',
        name: 'ม่านม้วน / มู่ลี่ (คิดตารางหลา กว้าง×สูง÷10000×1.2)',
        curtainMatch: 'ม่านม้วน',
        widthExp: 'RW',
        heightExp: 'RH',
        piecesExp: '1',
        qtyExp: 'round(((RW / 100) * (RH / 100) * 1.2) * 10) / 10',
      },
    ],
  };
}

let masterDB = (() => {
  try {
    const raw = JSON.parse(
      localStorage.getItem(DB_KEY) ||
      localStorage.getItem('mto-master-db-v3') ||
      localStorage.getItem('mto-master-db-v2')
    );
    const def = defaultMasterDB();
    if (!raw || typeof raw !== 'object') return def;
    return {
      staff: Array.isArray(raw.staff) ? raw.staff : def.staff,
      curtains: Array.isArray(raw.curtains) && raw.curtains.length ? raw.curtains : def.curtains,
      hooks: Array.isArray(raw.hooks) && raw.hooks.length ? raw.hooks : def.hooks,
      remarks: Array.isArray(raw.remarks) && raw.remarks.length ? raw.remarks : def.remarks,
      formulas: Array.isArray(raw.formulas) && raw.formulas.length ? raw.formulas : def.formulas,
    };
  } catch {
    return defaultMasterDB();
  }
})();

function saveMasterDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(masterDB)); } catch (e) { console.warn(e); }
  refreshRemarksDatalist();
  if (typeof RealtimeSync !== 'undefined') RealtimeSync.schedulePush();
}

function refreshRemarksDatalist() {
  const dl = document.getElementById('dlRemarks');
  if (!dl) return;
  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  dl.innerHTML = (masterDB.remarks || []).map(r => `<option value="${escH(r.name)}">`).join('');
}

/**
 * Safe formula evaluator for curtain size & fabric quantity
 * Supported variables:
 *   W  = ความกว้างเฟรม (cm)
 *   H  = ความสูงเฟรม (cm)
 *   EL = เผื่อซ้าย, ER = เผื่อขวา, ET = เผื่อบน, EB = เผื่อล่าง (cm)
 *   RW = ความกว้างราง = W + EL + ER (cm)
 *   RH = ความสูงราง = H + ET + EB (cm)
 *   FW = ความกว้างเต็ม, FH = ความสูงเต็ม (cm)
 *   P  = จำนวนผืน (สำหรับใช้ต่อในสูตรปริมาณผ้า)
 * Supported functions: ceil(), floor(), round(), max(), min()
 */
function evalFormulaExpr(expr, vars) {
  if (!expr || !String(expr).trim()) return '';
  try {
    const fn = new Function(
      'W', 'H', 'EL', 'ER', 'ET', 'EB', 'RW', 'RH', 'FW', 'FH', 'P',
      'ceil', 'floor', 'round', 'max', 'min',
      `"use strict"; return (${expr});`
    );
    const res = fn(
      vars.W, vars.H, vars.EL, vars.ER, vars.ET, vars.EB,
      vars.RW, vars.RH, vars.FW, vars.FH, vars.P,
      Math.ceil, Math.floor, Math.round, Math.max, Math.min
    );
    if (res === undefined || res === null || Number.isNaN(res) || !Number.isFinite(res)) return '';
    return String(Math.round(res * 100) / 100);
  } catch (e) {
    console.warn('Formula error:', expr, e);
    return '';
  }
}

function computeWindowByFormula(w, formula) {
  if (!w || !formula) return null;
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const W = num(w.width), H = num(w.height);
  const EL = num(w.extL), ER = num(w.extR), ET = num(w.extT), EB = num(w.extB);
  const RW = W + EL + ER;
  const RH = H + ET + EB;
  const FW = num(w.fullW), FH = num(w.fullH);
  const vars = { W, H, EL, ER, ET, EB, RW, RH, FW, FH, P: 2 };

  const a = evalFormulaExpr(formula.widthExp, vars);
  const b = evalFormulaExpr(formula.heightExp, vars);
  const n = evalFormulaExpr(formula.piecesExp, vars);
  vars.P = num(n) || 1;
  const t = evalFormulaExpr(formula.qtyExp, vars);
  return { a, b, n, t, RW, RH };
}

/**
 * Check if a window's selected curtain styles require hook size.
 */
function curtainNeedsHook(style1, style2) {
  const checkOne = name => {
    if (!name) return false;
    const found = masterDB.curtains.find(c => c.name === name);
    if (found) return !!found.useHook;
    return /จีบ|ลอน/.test(name);
  };
  return checkOne(style1) || checkOne(style2);
}

/** Combine opaque and sheer curtain style names with " / " when different */
function formatCurtainType(w) {
  const s1 = (w.curtainStyle1 || '').trim();
  const s2 = (w.curtainStyle2 || '').trim();
  if (s1 && s2 && s1 !== s2) return `${s1} / ${s2}`;
  if (s1) return s1;
  if (s2) return s2;
  return (w.curtainType || '').trim();
}

/* ---------------- Modal UI for Master DB ---------------- */
const MasterDBModal = (() => {
  let activeTab = 'staff';
  let onUpdate = null;

  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function render() {
    const body = document.getElementById('dbBody');
    document.querySelectorAll('[data-dbtab]').forEach(b => b.classList.toggle('active', b.dataset.dbtab === activeTab));

    if (activeTab === 'staff') {
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">เพิ่ม/แก้ไขรายชื่อพนักงาน เพื่อเลือกกรอกอัตโนมัติในใบงาน</p>
        <table class="ed-tbl">
          <thead><tr><th>ชื่อพนักงาน (S.R.)</th><th>แผนก (DEPT.)</th><th>สาขา (Branch)</th><th style="width:60px">ลบ</th></tr></thead>
          <tbody>
            ${masterDB.staff.map((st, i) => `
              <tr>
                <td><input data-db-edit="staff.${i}.name" value="${escH(st.name)}" placeholder="ชื่อพนักงาน"></td>
                <td><input data-db-edit="staff.${i}.dept" value="${escH(st.dept)}" placeholder="แผนก"></td>
                <td><input data-db-edit="staff.${i}.branch" value="${escH(st.branch)}" placeholder="สาขา"></td>
                <td class="c"><button type="button" class="danger" data-db-del="staff.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="staff">➕ เพิ่มพนักงาน</button>
      `;
    } else if (activeTab === 'curtains') {
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">กำหนดรายชื่อรูปแบบผ้าม่าน และติ๊ก "ใช้ตะขอ" สำหรับม่านจีบ/ม่านลอน (เพื่อให้เลือกขนาดตะขอได้)</p>
        <table class="ed-tbl">
          <thead><tr><th>ชื่อรูปแบบผ้าม่าน</th><th style="width:150px">ใช้ตะขอ (จีบ/ลอน)</th><th style="width:60px">ลบ</th></tr></thead>
          <tbody>
            ${masterDB.curtains.map((c, i) => `
              <tr>
                <td><input data-db-edit="curtains.${i}.name" value="${escH(c.name)}" placeholder="เช่น ม่านจีบ"></td>
                <td class="c"><input type="checkbox" data-db-edit="curtains.${i}.useHook" ${c.useHook ? 'checked' : ''}></td>
                <td class="c"><button type="button" class="danger" data-db-del="curtains.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="curtains">➕ เพิ่มรูปแบบผ้าม่าน</button>
      `;
    } else if (activeTab === 'hooks') {
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">กำหนดรายการขนาดตะขอ (แสดงให้เลือกเมื่อรูปแบบม่านเป็นม่านจีบ หรือ ม่านลอน)</p>
        <table class="ed-tbl">
          <thead><tr><th>ขนาดตะขอ</th><th style="width:60px">ลบ</th></tr></thead>
          <tbody>
            ${masterDB.hooks.map((h, i) => `
              <tr>
                <td><input data-db-edit="hooks.${i}.name" value="${escH(h.name)}" placeholder="เช่น No.5"></td>
                <td class="c"><button type="button" class="danger" data-db-del="hooks.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="hooks">➕ เพิ่มขนาดตะขอ</button>
      `;
    } else if (activeTab === 'remarks') {
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">กำหนดข้อความหมายเหตุสำหรับเลือกแสดงกำกับตามตำแหน่งรอบบานหน้าต่าง/ประตู (เช่น ชนแอร์, ปลั๊กไฟ, บิ้วอิน, ตู้, เตียง)</p>
        <table class="ed-tbl">
          <thead><tr><th>ข้อความหมายเหตุ</th><th style="width:60px">ลบ</th></tr></thead>
          <tbody>
            ${masterDB.remarks.map((r, i) => `
              <tr>
                <td><input data-db-edit="remarks.${i}.name" value="${escH(r.name)}" placeholder="เช่น ชนแอร์"></td>
                <td class="c"><button type="button" class="danger" data-db-del="remarks.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="remarks">➕ เพิ่มข้อความหมายเหตุ</button>
      `;
    } else if (activeTab === 'formulas') {
      body.innerHTML = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>📐 ตัวแปรที่ใช้ในสูตรคำนวณได้:</b>
          <code>W</code> = ความกว้างเฟรม, <code>H</code> = ความสูงเฟรม,
          <code>EL</code> = เผื่อซ้าย, <code>ER</code> = เผื่อขวา, <code>ET</code> = เผื่อบน, <code>EB</code> = เผื่อล่าง,
          <code>RW</code> = ความกว้างราง (W+EL+ER), <code>RH</code> = ความสูงราง (H+ET+EB),
          <code>P</code> = จำนวนผืน • ฟังก์ชัน: <code>ceil()</code>, <code>floor()</code>, <code>round()</code>
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th>ชื่อสูตรคำนวณ</th>
              <th style="width:95px">คู่กับประเภทม่าน</th>
              <th style="width:85px">สูตรขนาดกว้าง</th>
              <th style="width:85px">สูตรขนาดสูง</th>
              <th style="width:120px">สูตรจำนวน (ผืน)</th>
              <th style="width:180px">สูตรปริมาณผ้า (หลา)</th>
              <th style="width:45px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${masterDB.formulas.map((f, i) => `
              <tr>
                <td><input data-db-edit="formulas.${i}.name" value="${escH(f.name)}" placeholder="ชื่อสูตร"></td>
                <td><input data-db-edit="formulas.${i}.curtainMatch" value="${escH(f.curtainMatch || '')}" placeholder="เช่น ม่านจีบ"></td>
                <td><input data-db-edit="formulas.${i}.widthExp" value="${escH(f.widthExp)}" placeholder="RW"></td>
                <td><input data-db-edit="formulas.${i}.heightExp" value="${escH(f.heightExp)}" placeholder="RH"></td>
                <td><input data-db-edit="formulas.${i}.piecesExp" value="${escH(f.piecesExp)}" placeholder="ceil((RW*2.5)/130)"></td>
                <td><input data-db-edit="formulas.${i}.qtyExp" value="${escH(f.qtyExp)}" placeholder="round((P*(RH+35)/90)*10)/10"></td>
                <td class="c"><button type="button" class="danger" data-db-del="formulas.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="formulas">➕ เพิ่มสูตรคำนวณ</button>
      `;
    }
  }

  function init(cb) {
    onUpdate = cb;
    refreshRemarksDatalist();
    const modal = document.getElementById('dbModal');
    document.querySelectorAll('[data-dbtab]').forEach(b => {
      b.addEventListener('click', () => { activeTab = b.dataset.dbtab; render(); });
    });
    document.getElementById('dbClose').addEventListener('click', () => {
      modal.hidden = true;
      if (onUpdate) onUpdate();
    });
    modal.addEventListener('input', e => {
      const k = e.target.dataset.dbEdit;
      if (!k) return;
      const [list, idx, field] = k.split('.');
      if (masterDB[list] && masterDB[list][+idx]) {
        masterDB[list][+idx][field] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        saveMasterDB();
      }
    });
    modal.addEventListener('click', e => {
      const add = e.target.closest('[data-db-add]');
      if (add) {
        const t = add.dataset.dbAdd;
        const id = 'id' + Date.now();
        if (t === 'staff') masterDB.staff.push({ id, name: '', dept: '', branch: '' });
        else if (t === 'curtains') masterDB.curtains.push({ id, name: '', useHook: false });
        else if (t === 'hooks') masterDB.hooks.push({ id, name: '' });
        else if (t === 'remarks') masterDB.remarks.push({ id, name: '' });
        else if (t === 'formulas') masterDB.formulas.push({
          id, name: 'สูตรใหม่', curtainMatch: '', widthExp: 'RW', heightExp: 'RH', piecesExp: '2', qtyExp: 'round((P*(RH+30)/90)*10)/10',
        });
        saveMasterDB(); render(); return;
      }
      const del = e.target.closest('[data-db-del]');
      if (del) {
        const [list, idx] = del.dataset.dbDel.split('.');
        masterDB[list].splice(+idx, 1);
        saveMasterDB(); render();
      }
    });
  }

  function open(tab = 'staff') {
    activeTab = tab;
    render();
    document.getElementById('dbModal').hidden = false;
  }

  return { init, open };
})();
