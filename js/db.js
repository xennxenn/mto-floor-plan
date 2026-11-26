/* =========================================================
   Master Database (v6) – Admin-only management:
   1. staff: พนักงานและสิทธิ์ผู้ใช้งาน (username, password, role: 'admin' | 'staff')
   2. curtains: รูปแบบผ้าม่าน
   3. hooks: ขนาดตะขอ
   4. remarks: ข้อความหมายเหตุรอบบาน
   5. fabrics: ฐานข้อมูลผ้า (ชื่อผ้า, ดีไซน์ผ้า, ขนาดหน้าผ้า, Y-Repeat, รูปแบบการคำนวณ: เฉพาะหน้าผ้า > 270 ซม. จึงใช้ได้ทั้งเกรนม่านทึบและเกรนม่านโปร่ง)
   6. rails: ฐานข้อมูลรางและอุปกรณ์ (ชื่อ, ประเภท, ใช้กับรูปแบบม่านอะไร, สีมาตรฐาน)
   7. blinds: ฐานข้อมูลมู่ลี่และม่านม้วน (ชื่อ, รูปแบบม่าน, คำนวณเป็นตารางเมตร ขั้นต่ำ 1.5 ตร.ม./ผืน)
   8. widthFormulas: ฐานข้อมูลขนาดความกว้างผ้าม่าน (ขนาดรางม่าน, จำนวนผืน, ระยะย่นผ้าม่านแต่ละแบบ, ระยะเผื่อเกย, ระยะเผื่ออ้อมข้าง, สูตร, การปัดเศษ)
   9. heightFormulas: ฐานข้อมูลขนาดความสูงผ้าม่าน (ตามรูปแบบผ้าม่าน + ประเภทรางม่าน + ขนาดตะขอ, สูตร, การปัดเศษ)
   10. fabricCalcRules: ฐานข้อมูลคำนวณปริมาณผ้า แยกเกรนม่านทึบ / เกรนม่านโปร่ง
       (ขนาดความกว้างผ้าม่าน, จำนวนหน้าผ้า, ขนาดหน้าผ้า, Y-Repeat, จำนวน Y-Repeat, ระยะเผื่อพับริมผ้า, ระยะย่นผ้าม่านแต่ละแบบ, ระยะพับขอบบนล่างผ้าม่านแต่ละแบบ, จำนวนผืน, การปัดเศษ)
   ========================================================= */
const DB_KEY = 'mto-master-db-v10';

const ROD_TYPES_LIST = [
  'รางม่านจีบ',
  'รางโชว์',
  'รางม่านลอน',
  'รางม่านพับ',
];

const ACCESSORY_CATEGORIES_LIST = [
  'ด้ามจูง',
  'ตะขอเกี่ยวสายรวบ',
  'ห่วงตาไก่',
  'หัวปิดราง',
  'ขาจับราง',
  'อุปกรณ์เสริมอื่นๆ',
];

const ACCESSORY_SELL_UNITS = [
  ['ชิ้น', 'ขายเป็นชิ้น'],
];

const NO_RAIL_DEDUCT_PRESETS = [
  ['0', 'รับรางม่านปกติ (ไม่ลดความสูงผ้าม่าน • 0 ซม.)', 0],
  ['existing_hook_1_5', 'ไม่รับราง — ใช้รางเดิม หักระยะหัวตะขอ (-1.5 ซม.)', 1.5],
  ['existing_pleat_2', 'ไม่รับราง — ใช้รางม่านจีบเดิมลูกค้า (ลดความสูงผ้า -2 ซม.)', 2],
  ['existing_wave_3', 'ไม่รับราง — ใช้รางม่านลอนเดิมลูกค้า (ลดความสูงผ้า -3 ซม.)', 3],
  ['existing_show_4', 'ไม่รับราง — ใช้รางโชว์เดิมลูกค้า (ลดความสูงผ้า -4 ซม.)', 4],
  ['existing_box_5', 'ไม่รับราง — มีรางเดิมในกล่องม่าน/ฝ้าหลุม (ลดความสูงผ้า -5 ซม.)', 5],
  ['custom', 'ไม่รับราง — กรอกระยะลดความสูงผ้าม่านเอง (ซม.)', 0],
];

const YARD_DISPLAY_MODES = [
  ['exact', 'คำนวณจริง (ตามสูตร)'],
  ['ceil_yard', 'ปัดเศษขึ้นเป็นเต็มหลา'],
  ['ceil_plus', 'ปัดเศษขึ้นเป็นเต็มหลา + จำนวนหลาที่ต้องการเพิ่ม'],
  ['exact_plus', 'คำนวณจริง + จำนวนหลาที่ต้องการเพิ่ม'],
];

const PANEL_ROUND_MODES = [
  ['ceil_plus1_if_frac_ge', 'ถ้าเศษทศนิยม ≥ ค่าที่กำหนด (เช่น 0.9) ปัดขึ้นเป็นจำนวนเต็มแล้ว +1 หน้า'],
  ['ceil_if_frac_ge_else_floor', 'ถ้าเศษทศนิยม ≥ ค่าที่กำหนดให้ปัดขึ้น ถ้าน้อยกว่าให้ปัดลง'],
  ['ceil', 'ปัดเศษขึ้นเป็นจำนวนเต็มเสมอ'],
  ['round', 'ปัดเศษตามเกณฑ์ปกติ (≥ 0.5 ปัดขึ้น)'],
  ['floor', 'ปัดเศษลงเป็นจำนวนเต็ม'],
];

const ROUND_MODES = [
  ['ceil_1dec', 'ปัดเศษขึ้นเป็นทศนิยม 1 ตำแหน่ง'],
  ['ceil_int', 'ปัดเศษขึ้นเป็นจำนวนเต็ม'],
  ['floor_int', 'ปัดเศษลงเป็นจำนวนเต็ม'],
  ['none', 'ทศนิยมตามจริง (ไม่ปัดเศษ)'],
];

const WIDTH_LAYER_TYPES = [
  ['both', 'ทั้งม่านทึบและม่านโปร่ง'],
  ['opaque', 'ม่านทึบ'],
  ['sheer', 'ม่านโปร่ง'],
];

const SUB_CALC_TYPES = [
  ['gathered', 'แบบย่นสำเร็จ (ม่านจีบ / ม่านลอน): กว้างผ้า = (ราง ÷ ผืน) + เกย + อ้อมข้าง'],
  ['stretched', 'แบบขึงตึง (ม่านตาไก่ / หูกระเช้า / สอด / พับ ฯลฯ): กว้างผ้า = (ราง × ย่น) ÷ ผืน'],
];

const RAIL_SELL_UNITS = [
  ['เมตร', 'ขายเป็นเมตร (ขั้นต่ำ 1 เมตร/ราง)'],
  ['ชุด', 'ขายเป็นชุด (แบ่งช่วงความยาวรางเป็นชุด)'],
  ['ตร.ม.', 'ขายเป็นตารางเมตร (ตร.ม.)'],
];

const RAIL_DISPLAY_UNITS = [
  ['', 'อัตโนมัติตามรุ่นราง/รูปแบบม่าน'],
  ['เมตร', 'เมตร (ขั้นต่ำ 1 เมตร/ราง)'],
  ['ชุด', 'ชุด (ตามช่วงความยาวชุดราง)'],
  ['ชุด/เมตร', 'ชุด/เมตร (รางชั้นหน้าเป็นชุด / ชั้นหลังเป็นเมตร)'],
  ['เมตร/ชุด', 'เมตร/ชุด (รางชั้นหน้าเป็นเมตร / ชั้นหลังเป็นชุด)'],
  ['ตร.ม.', 'ตารางเมตร (ตร.ม.)'],
];

const RAIL_COUNT_UNITS = [
  ['', 'อัตโนมัติ (ราง=ชั้น / มู่ลี่-ม่านม้วน-พับ=ผืน)'],
  ['ชั้น', 'ชั้น'],
  ['ผืน', 'ผืน'],
  ['ชุด', 'ชุด'],
];

const GABLE_HEM_CLEARANCE_TYPES = [
  ['float', 'ลอยจากพื้น'],
  ['touch', 'พอดีพื้น'],
  ['puddle', 'กองพื้น'],
];

const NO_RAIL_STATUS_TEXTS = [
  ['ใช้รางเดิม', 'ใช้รางเดิม'],
  ['ไม่เอาราง', 'ไม่เอาราง'],
];

const BACK_LAYER_DEDUCT_OPTIONS = [
  ['1', 'ลดความสูงม่านโปร่ง/ชั้นด้านหลังมากกว่าปกติ 1 ซม. (ค่าเริ่มต้น)'],
  ['0.5', 'ลดความสูงม่านโปร่ง/ชั้นด้านหลังมากกว่าปกติ 0.5 ซม.'],
  ['0', 'ไม่ลดความสูงเพิ่ม (0 ซม.)'],
];

const FLOOR_CLEARANCE_MODES = [
  ['std', 'มาตรฐานฐานข้อมูล (ลอยจากพื้น 1 ซม.)'],
  ['float', 'ลอยจากพื้น (ระบุระยะลอยพื้นที่ต้องการ ซม. เช่น 2 → ลดเพิ่มจากสูตรลอย 1 ซม.)'],
  ['touch', 'พอดีพื้น (0 ซม. -> คืนค่าระยะลอย +1 ซม.)'],
  ['puddle', 'กองพื้น (ระบุระยะกองพื้นที่ต้องการ ซม.)'],
];

/**
 * ปรับค่าตัวเลขขนาด/พื้นที่/เผื่อ ให้เป็นจำนวนเต็ม หรือ ทศนิยม .5 เท่านั้น (เช่น 150 หรือ 150.5 หรือ -10 หรือ -10.5)
 */
function snapHalfCm(val) {
  const s = String(val ?? '').trim();
  if (!s || s === '-') return s;
  const hasStar = s.endsWith('*');
  const clean = s.replace(/\*/g, '').trim();
  const n = parseFloat(clean);
  if (isNaN(n) || !Number.isFinite(n)) return s;
  const snapped = Math.round(n * 2) / 2;
  return String(snapped) + (hasStar ? '*' : '');
}

/**
 * คำนวณค่าปรับความสูงผ้าม่านตามระยะลอย/กองพื้นที่ต้องการบนแปลนงาน:
 * - ฐานข้อมูลขนาดความสูงกำหนดมาตรฐานลอยจากพื้น = baseFloat (1 ซม.)
 * - ไม่ดูเครื่องหมาย (+ หรือ -) ดูที่ตัวเลข (Math.abs) เสมอ แล้วอิงตามตัวเลือก:
 *   - 'std': ใช้ค่าฐานข้อมูล (ลอยจากพื้น 1 ซม.) -> delta = 0
 *   - 'float': ระบุระยะลอยจากพื้นที่ต้องการ (ซม.) เช่น ต้องการลอย 2 ซม. จากมาตรฐานลอย 1 ซม. -> delta = baseFloat - targetFloat = 1 - 2 = -1 ซม. (เช่น สูตร -1.5 ลอย 1 ซม. จะกลายเป็น -2.5 ลอย 2 ซม.)
 *   - 'touch': พอดีพื้น (0 ซม.) -> delta = +baseFloat (คืนค่าลอย +1 ซม.)
 *   - 'puddle': ระบุระยะกองพื้นที่ต้องการ (ซม.) -> delta = +baseFloat + targetPuddle (คืน 1 ซม. + ระยะกองพื้น)
 */
function parseUnsignedFloat(v) {
  const s = String(v ?? '').trim().replace(/[^\d.,-]/g, '').replace(/,/g, '.');
  const n = parseFloat(s);
  return (!isNaN(n) && Number.isFinite(n)) ? Math.abs(n) : 0;
}

function getWindowFloorDelta(w, baseFloat = 1) {
  if (!w) return 0;
  const base = (baseFloat !== undefined && baseFloat !== null && !isNaN(parseFloat(baseFloat)))
    ? parseFloat(baseFloat)
    : 1;
  const mode = String(w.floorMode || 'std');
  const rawAdj = String(w.floorAdjust ?? '').trim();
  const mag = parseUnsignedFloat(rawAdj);
  if (mode === 'float') {
    if (!rawAdj) return 0;
    return Math.round((base - mag) * 100) / 100;
  }
  if (mode === 'touch') return base;
  if (mode === 'puddle') return Math.round((base + mag) * 100) / 100;
  return 0;
}

const SPECIAL_WIN_TYPES = [
  ['', 'บานปกติ (ไม่มีหน้าขยายแยก)'],
  ['gable', 'แปลนงานม่านจั่ว (แสดงแยกในหน้าถัดไป • เลือกได้ 5 รูปแบบ)'],
  ['side_join', 'ผ้าม่านเย็บต่อด้านข้าง / รายการพิเศษ (แสดงแยกในหน้าถัดไป)'],
];

const GABLE_TYPES = [
  ['1', 'แบบที่ 1: จั่วสามเหลี่ยมสมมาตร แบ่งซ้าย-ขวา (มีความสูง A, B, C และความกว้างซ้าย-ขวา)'],
  ['2', 'แบบที่ 2: จั่วเฉียงลาดลงขวา แบ่งซ้าย-ขวา (สูงซ้าย A → กลาง B → ขวา C และความกว้างซ้าย-ขวา)'],
  ['3', 'แบบที่ 3: จั่วเฉียงลาดลงขวา ช่วงเดียว (สูงซ้าย A → ขวา B และความกว้างรวม)'],
  ['4', 'แบบที่ 4: จั่วเฉียงลาดขึ้นขวา แบ่งซ้าย-ขวา (ซ้าย A → กลาง B → สูงขวา C และความกว้างซ้าย-ขวา)'],
  ['5', 'แบบที่ 5: จั่วเฉียงลาดขึ้นขวา ช่วงเดียว (ซ้าย A → สูงขวา B และความกว้างรวม)'],
];

const SIDE_JOIN_TYPES = [
  ['both_sides', 'เย็บต่อผ้าด้านข้าง ทั้งฝั่งซ้ายและขวา (2 ข้าง)'],
  ['inner_side', 'เย็บต่อผ้าขอบด้านใน (ฝั่งชนกลาง)'],
  ['outer_side', 'เย็บต่อผ้าขอบด้านนอก'],
  ['bottom_border', 'เย็บต่อชายด้านล่าง / ขอบบน'],
];

function isGatheredCurtainStyle(styleName) {
  const s = String(styleName || '').trim();
  return /ม่านจีบ|ม่านลอน/.test(s);
}

function getDefaultSubCalcType(styleName) {
  return isGatheredCurtainStyle(styleName) ? 'gathered' : 'stretched';
}

/**
 * คำนวณจำนวนชุดรางม่านตามช่วงความยาวที่กำหนดในฐานข้อมูล
 * รูปแบบ setRanges เช่น "0-2.00=1, 2.01-2.99=1, 3.00-4.00=2" หรือ "0-1.50, 1.51-2.00, 2.01-2.99"
 */
function evalRailSetBrackets(lengthMeters, setRangesStr = '') {
  const m = parseFloat(lengthMeters);
  if (isNaN(m) || m <= 0) return { sets: 0, bracketLabel: '' };
  const raw = String(setRangesStr || '0-2.00=1, 2.01-2.99=1, 3.00-4.00=2').trim();
  const parts = raw.split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
  for (const p of parts) {
    const mRange = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)(?:\s*=\s*(\d+(?:\.\d+)?))?/.exec(p);
    if (mRange) {
      const lo = parseFloat(mRange[1]);
      const hi = parseFloat(mRange[2]);
      const setsVal = mRange[3] !== undefined ? parseFloat(mRange[3]) : 1;
      if (m >= lo - 1e-9 && m <= hi + 1e-9) {
        return { sets: setsVal || 1, bracketLabel: `${mRange[1]}-${mRange[2]} ม.` };
      }
    }
  }
  return { sets: Math.max(1, Math.ceil(m / 2 - 1e-9)), bracketLabel: '' };
}

/**
 * ฟังก์ชันปัดเศษตามที่กำหนด:
 * - floor_int: ปัดเศษลงเป็นจำนวนเต็ม
 * - ceil_int: ปัดเศษขึ้นเป็นจำนวนเต็ม
 * - ceil_1dec: ปัดเศษขึ้นเป็นทศนิยม 1 ตำแหน่ง
 * - none: ทศนิยมไม่เกิน 2 ตำแหน่งตามจริง
 */
function applyRoundMode(val, mode = 'none') {
  const n = parseFloat(val);
  if (isNaN(n) || !Number.isFinite(n)) return '';
  if (mode === 'floor_int') return String(Math.floor(n + 1e-9));
  if (mode === 'ceil_int') return String(Math.ceil(n - 1e-9));
  if (mode === 'ceil_1dec') return String(Math.ceil((n - 1e-9) * 10) / 10);
  return String(Math.round(n * 100) / 100);
}

/**
 * คำนวณการปัดจำนวนหน้าผ้าตามเงื่อนไขที่กำหนดในฐานข้อมูล:
 * เช่น เกรนม่านทึบ หากคำนวณหน้าผ้าแล้วได้เศษทศนิยม >= 0.9 ขึ้นไป ให้ปัดเศษขึ้นเป็นจำนวนเต็มและ + อีก 1
 */
function applyPanelRounding(rawVal, mode = 'ceil_plus1_if_frac_ge', fracThreshold = 0.9, extraAdd = 1) {
  const v = parseFloat(rawVal);
  if (isNaN(v) || !Number.isFinite(v) || v <= 0) return 0;
  const th = (!isNaN(parseFloat(fracThreshold)) && parseFloat(fracThreshold) > 0) ? parseFloat(fracThreshold) : 0.9;
  const addN = (!isNaN(parseInt(extraAdd, 10))) ? parseInt(extraAdd, 10) : 1;
  const fl = Math.floor(v + 1e-9);
  const frac = Math.max(0, v - fl);

  if (mode === 'ceil_plus1_if_frac_ge') {
    const baseCeil = Math.max(1, Math.ceil(v - 1e-9));
    return (frac >= th - 1e-9) ? (baseCeil + addN) : baseCeil;
  }
  if (mode === 'ceil_if_frac_ge_else_floor') {
    return (frac >= th - 1e-9) ? Math.max(1, Math.ceil(v - 1e-9)) : Math.max(1, fl);
  }
  if (mode === 'floor') return Math.max(1, fl);
  if (mode === 'round') return Math.max(1, Math.round(v));
  return Math.max(1, Math.ceil(v - 1e-9));
}

/**
 * แปลงจำนวนหลาตามโหมดที่ผู้ใช้เลือก:
 * - exact: คำนวณจริง (ตาม roundMode ของสูตร เช่น ทศนิยม 1 ตำแหน่ง)
 * - ceil_yard: ปัดเศษขึ้นเป็นเต็มหลา
 * - ceil_plus: ปัดเศษขึ้นเป็นเต็มหลา + จำนวนหลาที่ต้องการเพิ่ม
 * - exact_plus: คำนวณจริง + จำนวนหลาที่ต้องการเพิ่ม
 */
function applyYardDisplayMode(rawYards, yardMode = 'exact', extraYards = 0, baseRoundMode = 'ceil_1dec') {
  const y = parseFloat(rawYards);
  if (isNaN(y) || !Number.isFinite(y) || y <= 0) return '';
  const add = parseFloat(extraYards) || 0;
  const exactVal = parseFloat(applyRoundMode(y, baseRoundMode || 'ceil_1dec')) || 0;
  if (yardMode === 'ceil_yard') {
    return String(Math.ceil(y - 1e-9));
  }
  if (yardMode === 'ceil_plus') {
    return String(Math.round((Math.ceil(y - 1e-9) + add) * 100) / 100);
  }
  if (yardMode === 'exact_plus') {
    return String(Math.round((exactVal + add) * 100) / 100);
  }
  return String(exactVal);
}

/**
 * คืนค่าระยะลดความสูงผ้าม่าน (ซม.) กรณีไม่รับรางม่าน
 */
function getNoRailHeightDeduction(w) {
  if (!w || !w.noRail) return 0;
  const preset = String(w.noRailDeductPreset || 'existing_pleat_2');
  if (preset === 'custom') {
    const c = parseFloat(w.noRailDeductCustom);
    return (!isNaN(c) && c >= 0) ? c : 0;
  }
  const found = NO_RAIL_DEDUCT_PRESETS.find(p => p[0] === preset);
  return found ? (parseFloat(found[2]) || 0) : 0;
}

/**
 * ตรวจสอบว่าขนาดหน้าผ้าสามารถใช้คำนวณแบบเกรนม่านโปร่งได้หรือไม่
 * (เฉพาะผ้าที่มีขนาดหน้าผ้าเกิน 270 ซม. ขึ้นไปถึงสามารถใช้คำนวณได้ทั้งเกรนม่านทึบและเกรนม่านโปร่ง)
 */
function canFabricUseSheerGrain(fabricWidth) {
  const fw = parseFloat(fabricWidth);
  return !isNaN(fw) && fw > 270;
}

function defaultMasterDB() {
  return {
    schemaVersion: 9,
    stdParams: {
      stdSideHem: 10,     // เผื่อเย็บริมผ้ามาตรฐาน = 10 ซม.
      stdOverlap: 8,      // เกยมาตรฐาน = 8 ซม.
      stdSideReturn: 8,   // อ้อมข้างมาตรฐาน = 8 ซม.
      stdFloorFloat: 1,   // ระยะลอยจากพื้นมาตรฐาน = 1 ซม.
    },
    branches: [
      'สำนักงานใหญ่',
      'สาขาเซ็นทรัลลาดพร้าว',
    ],
    staff: [
      {
        id: 'admin_t58121',
        username: 'T58121',
        password: 'Admin',
        role: 'admin',
        name: 'นฤชา',
        dept: 'ขาย',
        branch: 'สาขาเซ็นทรัลลาดพร้าว',
      },
    ],
    // รูปแบบผ้าม่าน พร้อมค่ามาตรฐานประจำแต่ละรูปแบบ (โหมดคิดขนาด: curtain=ตามสูตรผ้าม่าน / blind_piece=กำหนดขนาดต่อผืนเองแบบม่านม้วน-มู่ลี่)
    curtains: [
      { id: 'c1', name: 'ม่านจีบ', calcBehavior: 'curtain', subCalcType: 'gathered', useHook: true, stdGatherRatio: 2.5, stdTopBottomHem: 35, econTopBottomHem: 25, stdSideHem: 10, stdOverlap: 8, stdSideReturn: 8 },
      { id: 'c2', name: 'ม่านลอน', calcBehavior: 'curtain', subCalcType: 'gathered', useHook: true, stdGatherRatio: 2.2, stdTopBottomHem: 30, econTopBottomHem: 20, stdSideHem: 10, stdOverlap: 8, stdSideReturn: 8 },
      { id: 'c3', name: 'ม่านตาไก่', calcBehavior: 'curtain', subCalcType: 'stretched', useHook: false, stdGatherRatio: 2.2, stdTopBottomHem: 35, econTopBottomHem: 25, stdSideHem: 10, stdOverlap: 8, stdSideReturn: 8 },
      { id: 'c4', name: 'ม่านพับ', calcBehavior: 'curtain', subCalcType: 'stretched', useHook: false, stdGatherRatio: 1.0, stdTopBottomHem: 40, econTopBottomHem: 0, stdSideHem: 10, stdOverlap: 0, stdSideReturn: 0 },
      { id: 'c5', name: 'ม่านม้วน', calcBehavior: 'blind_piece', subCalcType: 'stretched', useHook: false, stdGatherRatio: 1.0, stdTopBottomHem: 0, econTopBottomHem: 0, stdSideHem: 0, stdOverlap: 0, stdSideReturn: 0 },
      { id: 'c6', name: 'มู่ลี่ไม้', calcBehavior: 'blind_piece', subCalcType: 'stretched', useHook: false, stdGatherRatio: 1.0, stdTopBottomHem: 0, econTopBottomHem: 0, stdSideHem: 0, stdOverlap: 0, stdSideReturn: 0 },
      { id: 'c7', name: 'มู่ลี่อลูมิเนียม', calcBehavior: 'blind_piece', subCalcType: 'stretched', useHook: false, stdGatherRatio: 1.0, stdTopBottomHem: 0, econTopBottomHem: 0, stdSideHem: 0, stdOverlap: 0, stdSideReturn: 0 },
      { id: 'c8', name: 'ม่านปรับแสง', calcBehavior: 'blind_piece', subCalcType: 'stretched', useHook: false, stdGatherRatio: 1.0, stdTopBottomHem: 0, econTopBottomHem: 0, stdSideHem: 0, stdOverlap: 0, stdSideReturn: 0 },
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
    // ฐานข้อมูลผ้า (เฉพาะหน้าผ้า > 270 ซม. จึงเลือกใช้คำนวณได้ทั้งเกรนม่านทึบและเกรนม่านโปร่ง)
    fabrics: [
      {
        id: 'fab1',
        name: 'PASAYA Blackout 140',
        design: 'BO-140',
        fabricWidth: 140,
        yRepeat: 0,
        calcMode: 'opaque',
      },
      {
        id: 'fab2',
        name: 'PASAYA Jacquard Pattern',
        design: 'JQ-145',
        fabricWidth: 145,
        yRepeat: 32,
        calcMode: 'opaque',
      },
      {
        id: 'fab3',
        name: 'PASAYA Wide Blackout 280',
        design: 'WBO-280',
        fabricWidth: 280,
        yRepeat: 0,
        calcMode: 'both',
      },
      {
        id: 'fab4',
        name: 'PASAYA Sheer Voile 300',
        design: 'SH-300',
        fabricWidth: 300,
        yRepeat: 0,
        calcMode: 'both',
      },
    ],
    // ฐานข้อมูลรางม่าน (แยกออกจากอุปกรณ์เสริม • กำหนดหน่วยขาย เมตร หรือ ชุด พร้อมขนาดขั้นต่ำต่อชุด เช่น 2.00 หรือ 1.00 เมตร)
    rails: [
      { id: 'rl1', name: 'รางม่านจีบ มาตรฐาน (M)', rodCategory: 'รางม่านจีบ', curtainStyle: 'ม่านจีบ', defaultColor: 'ขาว', sellUnit: 'เมตร', minLength: 1.00, setRanges: '0-2.00=1, 2.01-2.99=1, 3.00-4.00=2', spec: 'ขายเป็นเมตร (ขั้นต่ำ 1.00 เมตร/ราง)' },
      { id: 'rl2', name: 'รางโชว์ 28 มม.', rodCategory: 'รางโชว์', curtainStyle: 'ม่านตาไก่', defaultColor: 'ดำ', sellUnit: 'ชุด', minLength: 2.00, setRanges: '0-2.00=1, 2.01-2.99=1, 3.00-4.00=2', spec: 'ขายเป็นชุด (ขั้นต่ำ 2.00 ม. เช่น กว้าง 285 = 2.85 1 ชุด)' },
      { id: 'rl3', name: 'รางโชว์ใช้กับม่านจีบ (พร้อมห่วง)', rodCategory: 'รางโชว์', curtainStyle: 'ม่านจีบ', defaultColor: 'เงิน', sellUnit: 'ชุด', minLength: 2.00, setRanges: '0-2.00=1, 2.01-2.99=1, 3.00-4.00=2', spec: 'รางโชว์พร้อมห่วงคล้องตะขอ (ขั้นต่ำ 2.00 ม.)' },
      { id: 'rl4', name: 'รางม่านลอน S-Curve', rodCategory: 'รางม่านลอน', curtainStyle: 'ม่านลอน', defaultColor: 'ขาว', sellUnit: 'เมตร', minLength: 1.00, setRanges: '0-2.00=1, 2.01-2.99=1, 3.00-4.00=2', spec: 'ขายเป็นเมตร (ขั้นต่ำ 1.00 เมตร/ราง)' },
      { id: 'rl5', name: 'รางม่านพับ Roman', rodCategory: 'รางม่านพับ', curtainStyle: 'ม่านพับ', defaultColor: 'ขาว', sellUnit: 'เมตร', minLength: 1.00, setRanges: '0-2.00=1, 2.01-2.99=1, 3.00-4.00=2', spec: 'ขายเป็นเมตร (ขั้นต่ำ 1.00 เมตร/ราง)' },
    ],
    // ฐานข้อมูลอุปกรณ์เสริม (แยกออกจากรางม่าน • ขายเป็นชิ้น)
    accessories: [
      { id: 'ac1', name: 'ด้ามจูงอะคริลิค 120 ซม.', category: 'ด้ามจูง', curtainStyle: '*', defaultColor: 'ใส', sellUnit: 'ชิ้น', spec: 'ขนาดมาตรฐาน 120 ซม.' },
      { id: 'ac2', name: 'ด้ามจูงอลูมิเนียม 120 ซม.', category: 'ด้ามจูง', curtainStyle: '*', defaultColor: 'ขาว', sellUnit: 'ชิ้น', spec: 'ขนาดมาตรฐาน 120 ซม.' },
      { id: 'ac3', name: 'ด้ามจูงลายไม้ 120 ซม.', category: 'ด้ามจูง', curtainStyle: '*', defaultColor: 'ลายไม้', sellUnit: 'ชิ้น', spec: 'ขนาดมาตรฐาน 120 ซม.' },
      { id: 'ac4', name: 'ตะขอเกี่ยวสายรวบมาตรฐาน', category: 'ตะขอเกี่ยวสายรวบ', curtainStyle: '*', defaultColor: 'เงิน', sellUnit: 'ชิ้น', spec: 'มีสี เงิน / ดำ / ทองเหลือง / ทองแดง' },
      { id: 'ac5', name: 'ตะขอเกี่ยวสายรวบคริสตัล', category: 'ตะขอเกี่ยวสายรวบ', curtainStyle: '*', defaultColor: 'เงิน', sellUnit: 'ชิ้น', spec: 'หัวคริสตัล' },
      { id: 'ac6', name: 'ห่วงตาไก่ แบบเรียบ', category: 'ห่วงตาไก่', curtainStyle: 'ม่านตาไก่', defaultColor: 'สีเงิน', sellUnit: 'ชิ้น', spec: 'สีเงิน / ทองเหลือง / ทองแดง' },
      { id: 'ac7', name: 'ห่วงตาไก่ แบบลอน / แบบคลื่น', category: 'ห่วงตาไก่', curtainStyle: 'ม่านตาไก่', defaultColor: 'ทองเหลือง', sellUnit: 'ชิ้น', spec: 'ทองเหลือง / ทองแดง' },
    ],
    // ฐานข้อมูลมู่ลี่ ม่านม้วน ม่านปรับแสง (แยกชื่อรุ่น model/group และช่องรหัสสินค้า codes คั่นด้วย , เช่น P101, P102, P103 • คำนวณ ตร.ม. ขั้นต่ำ 1.5 ตร.ม./ผืน)
    blinds: [
      { id: 'bl1', model: 'ม่านม้วน Blackout', group: 'ม่านม้วน Blackout', name: 'ม่านม้วน Blackout', codes: 'BO-101, BO-102, BO-103', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl2', model: 'ม่านม้วน Sunscreen', group: 'ม่านม้วน Sunscreen', name: 'ม่านม้วน Sunscreen', codes: 'SS-201, SS-202, SS-203', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl3', model: 'ม่านม้วน Dimout', group: 'ม่านม้วน Dimout', name: 'ม่านม้วน Dimout', codes: 'DM-301, DM-302', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl4', model: 'มู่ลี่ไม้ Basswood 50 มม.', group: 'มู่ลี่ไม้ Basswood 50 มม.', name: 'มู่ลี่ไม้ Basswood 50 มม.', codes: 'BW-501, BW-502, BW-503', curtainStyle: 'มู่ลี่ไม้', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl5', model: 'มู่ลี่อลูมิเนียม 25 มม.', group: 'มู่ลี่อลูมิเนียม 25 มม.', name: 'มู่ลี่อลูมิเนียม 25 มม.', codes: 'ALU-251, ALU-252, ALU-253', curtainStyle: 'มู่ลี่อลูมิเนียม', minSqm: 1.5, roundMode: 'ceil_1dec' },
    ],
    // ฐานข้อมูลชุดสีเชือกเทป และสีเชือกสลิง (แยกเป็นชุดข้อมูลต่างหากสำหรับมู่ลี่/ม่านม้วน/ม่านปรับแสง)
    blindCords: [
      { id: 'bc1', cordType: 'เชือกเทป', name: 'สีครีม', code: 'TP-01' },
      { id: 'bc2', cordType: 'เชือกเทป', name: 'สีขาว', code: 'TP-02' },
      { id: 'bc3', cordType: 'เชือกเทป', name: 'สีน้ำตาลอ่อน', code: 'TP-03' },
      { id: 'bc4', cordType: 'เชือกเทป', name: 'สีน้ำตาลเข้ม', code: 'TP-04' },
      { id: 'bc5', cordType: 'เชือกเทป', name: 'สีดำ', code: 'TP-05' },
      { id: 'bc6', cordType: 'เชือกสลิง', name: 'สีขาว', code: 'SL-01' },
      { id: 'bc7', cordType: 'เชือกสลิง', name: 'สีครีม', code: 'SL-02' },
      { id: 'bc8', cordType: 'เชือกสลิง', name: 'สีเทา', code: 'SL-03' },
      { id: 'bc9', cordType: 'เชือกสลิง', name: 'สีน้ำตาล', code: 'SL-04' },
      { id: 'bc10', cordType: 'เชือกสลิง', name: 'สีดำ', code: 'SL-05' },
    ],
    // ฐานข้อมูลสีกล่องบังรางมู่ลี่ (แยกเป็นชุดข้อมูลต่างหาก)
    blindValances: [
      { id: 'bv1', name: 'สีเดียวกับใบมู่ลี่', code: 'VL-00' },
      { id: 'bv2', name: 'ขาว', code: 'VL-01' },
      { id: 'bv3', name: 'ครีม', code: 'VL-02' },
      { id: 'bv4', name: 'น้ำตาลอ่อน', code: 'VL-03' },
      { id: 'bv5', name: 'น้ำตาลเข้ม', code: 'VL-04' },
      { id: 'bv6', name: 'เงิน', code: 'VL-05' },
      { id: 'bv7', name: 'ดำ', code: 'VL-06' },
    ],
    // ฐานข้อมูลขนาดความกว้างผ้าม่านต่อผืน (WC) — ไม่ต้องระบุจำนวนผืนในฐานข้อมูล ระบบจะดึงจำนวนผืน (P) จากบานนั้นๆ อัตโนมัติ
    // 1. แบบย่นสำเร็จ (ม่านจีบ, ม่านลอน): WC = (RW / P) + OV + SR
    // 2. แบบขึงตึง (ม่านตาไก่ ฯลฯ): WC = (RW * G) / P  (ดึง G จากฐานข้อมูลรูปแบบผ้าม่านกลางอัตโนมัติ)
    widthFormulas: [
      {
        id: 'wf1',
        curtainStyle: 'ม่านจีบ',
        subCalcType: 'gathered',
        layerType: 'both',
        rodType: '*',
        railTracks: '*',
        pieces: '*',
        label: 'ม่านจีบ — แบบย่นสำเร็จ: (ราง ÷ ผืน P ของบาน) + เกย OV + อ้อมข้าง SR',
        railWidth: 'RW',
        overlap: 8,
        sideReturn: 8,
        widthExp: '((RW / P) + OV + SR)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf3',
        curtainStyle: 'ม่านลอน',
        subCalcType: 'gathered',
        layerType: 'both',
        rodType: '*',
        railTracks: '*',
        pieces: '*',
        label: 'ม่านลอน — แบบย่นสำเร็จ: (ราง ÷ ผืน P ของบาน) + เกย OV + อ้อมข้าง SR',
        railWidth: 'RW',
        overlap: 8,
        sideReturn: 8,
        widthExp: '((RW / P) + OV + SR)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf5',
        curtainStyle: 'ม่านตาไก่',
        subCalcType: 'stretched',
        layerType: 'both',
        rodType: '*',
        railTracks: '*',
        pieces: '*',
        label: 'ม่านตาไก่ — แบบขึงตึง: (ราง × ระยะย่น G) ÷ ผืน P ของบาน',
        railWidth: 'RW',
        overlap: 0,
        sideReturn: 0,
        widthExp: '((RW * G) / P)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf7',
        curtainStyle: 'ม่านพับ',
        subCalcType: 'stretched',
        layerType: 'both',
        rodType: '*',
        railTracks: '*',
        pieces: '*',
        label: 'ม่านพับ — แบบขึงตึง: (ราง × ระยะย่น G) ÷ ผืน P ของบาน',
        railWidth: 'RW',
        overlap: 0,
        sideReturn: 0,
        widthExp: '((RW * G) / P)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf8',
        curtainStyle: 'ม่านม้วน',
        subCalcType: 'stretched',
        layerType: 'both',
        rodType: '*',
        railTracks: '*',
        pieces: '*',
        label: 'ม่านม้วน (กว้างเท่ากับราง RW ÷ ผืน P)',
        railWidth: 'RW',
        overlap: 0,
        sideReturn: 0,
        widthExp: '(RW / P)',
        roundMode: 'none',
      },
    ],
    // ฐานข้อมูลขนาดความสูงผ้าม่าน — กำหนดมาตรฐานเป็นระยะลอยจากพื้น FL_BASE = 1 ซม.
    // (หากบานใดต้องการลอยมากกว่า กองพื้นมากกว่า หรือพอดีพื้น ให้เลือกที่แปลนงาน ระบบจะปรับให้อัตโนมัติ)
    heightFormulas: [
      {
        id: 'hf1',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        railTracks: '*',
        pieces: '*',
        hookSize: 'No.5',
        floorFloat: 1,
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.5 (หักตะขอ 1.5 + ลอยพื้น 1 ซม.)',
        heightExp: 'RH - 1.5 - FL_BASE',
        roundMode: 'none',
      },
      {
        id: 'hf2',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        railTracks: '*',
        pieces: '*',
        hookSize: 'No.6',
        floorFloat: 1,
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.6 (หักตะขอ 2 + ลอยพื้น 1 ซม.)',
        heightExp: 'RH - 2 - FL_BASE',
        roundMode: 'none',
      },
      {
        id: 'hf3',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        railTracks: '*',
        pieces: '*',
        hookSize: 'No.8',
        floorFloat: 1,
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.8 (หักตะขอ 1 + ลอยพื้น 1 ซม.)',
        heightExp: 'RH - 1 - FL_BASE',
        roundMode: 'none',
      },
      {
        id: 'hf4',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        railTracks: '*',
        pieces: '*',
        hookSize: 'No.9',
        floorFloat: 1,
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.9 (ลอยพื้นมาตรฐาน 1 ซม.)',
        heightExp: 'RH - FL_BASE',
        roundMode: 'none',
      },
      {
        id: 'hf5',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางโชว์',
        railTracks: '*',
        pieces: '*',
        hookSize: '*',
        floorFloat: 1,
        label: 'ม่านจีบ + รางโชว์ (หักหัวรางโชว์ 4 + ลอยพื้น 1 ซม.)',
        heightExp: 'RH - 4 - FL_BASE',
        roundMode: 'none',
      },
      {
        id: 'hf6',
        curtainStyle: 'ม่านลอน',
        rodType: 'รางม่านลอน',
        railTracks: '*',
        pieces: '*',
        hookSize: '*',
        floorFloat: 1,
        label: 'ม่านลอน + รางม่านลอน (หักราง 2.5 + ลอยพื้น 1 ซม.)',
        heightExp: 'RH - 2.5 - FL_BASE',
        roundMode: 'none',
      },
      {
        id: 'hf7',
        curtainStyle: 'ม่านตาไก่',
        rodType: 'รางโชว์',
        railTracks: '*',
        pieces: '*',
        hookSize: '*',
        floorFloat: 1,
        label: 'ม่านตาไก่ + รางโชว์ (หัวม่าน +3 - ลอยพื้น 1 ซม.)',
        heightExp: 'RH + 3 - FL_BASE',
        roundMode: 'none',
      },
      {
        id: 'hf8',
        curtainStyle: 'ม่านพับ',
        rodType: 'รางม่านพับ',
        railTracks: '*',
        pieces: '*',
        hookSize: '*',
        floorFloat: 1,
        label: 'ม่านพับ + รางม่านพับ (ลอยพื้นมาตรฐาน 1 ซม.)',
        heightExp: 'RH - FL_BASE',
        roundMode: 'none',
      },
      {
        id: 'hf9',
        curtainStyle: '*',
        rodType: '*',
        railTracks: '*',
        pieces: '*',
        hookSize: '*',
        floorFloat: 1,
        label: 'ทั่วไป: ลอยจากพื้นมาตรฐาน 1 ซม. (RH - 1)',
        heightExp: 'RH - FL_BASE',
        roundMode: 'none',
      },
    ],
    // ฐานข้อมูลคำนวณปริมาณผ้า แบ่งเป็น 2 เกรนหลัก (opaque=เกรนม่านทึบ, sheer=เกรนม่านโปร่ง) และ 2 การคิดย่อย (gathered=ย่นสำเร็จ, stretched=ขึงตึง)
    // - เกรนทึบ + ย่นสำเร็จ: หน้าผ้า = PANEL_ROUND((((WC * G) + HEM_SIDE) * P) / FW_FAB), Repeat = CEIL((HC + HEM_TB) / YR), หลา = ((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44
    // - เกรนทึบ + ขึงตึง: หน้าผ้า = PANEL_ROUND(((WC + HEM_SIDE) * P) / FW_FAB), Repeat = CEIL((HC + HEM_TB) / YR), หลา = ((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44
    // - เกรนโปร่ง + ย่นสำเร็จ: หน้าผ้า = CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB), หลา = (((WC * G) + HEM_SIDE) * P * 1.05) / 91.44
    // - เกรนโปร่ง + ขึงตึง: หน้าผ้า = CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB), หลา = ((WC + HEM_SIDE) * P * 1.05) / 91.44
    fabricCalcRules: [
      {
        id: 'fcr1',
        curtainStyle: 'ม่านจีบ',
        grainType: 'opaque',
        subCalcType: 'gathered',
        label: 'เกรนม่านทึบ (แบบย่นสำเร็จ) - ม่านจีบ: ย่น 2.5 • พับริม 10 • พับบนล่าง 35',
        gatherRatio: 2.5,
        sideHem: 10,
        topBottomHem: 35,
        econTopBottomHem: 0,
        panelRoundMode: 'ceil_plus1_if_frac_ge',
        panelFracThreshold: 0.9,
        panelExtraAdd: 1,
        panelCountExp: 'PANEL_ROUND((((WC * G) + HEM_SIDE) * P) / FW_FAB)',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr2',
        curtainStyle: 'ม่านจีบ',
        grainType: 'sheer',
        subCalcType: 'gathered',
        label: 'เกรนม่านโปร่ง (แบบย่นสำเร็จ) - ม่านจีบ: ย่น 2.5 • พับริม 10 • พับบนล่างมาตรฐาน 35 (ประหยัด 25)',
        gatherRatio: 2.5,
        sideHem: 10,
        topBottomHem: 35,
        econTopBottomHem: 25,
        panelRoundMode: 'ceil',
        panelFracThreshold: 0.9,
        panelExtraAdd: 0,
        panelCountExp: 'CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB)',
        yRepeatCountExp: '0',
        qtyExp: '(((WC * G) + HEM_SIDE) * P * 1.05) / 91.44',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr3',
        curtainStyle: 'ม่านลอน',
        grainType: 'opaque',
        subCalcType: 'gathered',
        label: 'เกรนม่านทึบ (แบบย่นสำเร็จ) - ม่านลอน: ย่น 2.2 • พับริม 10 • พับบนล่าง 30',
        gatherRatio: 2.2,
        sideHem: 10,
        topBottomHem: 30,
        econTopBottomHem: 0,
        panelRoundMode: 'ceil_plus1_if_frac_ge',
        panelFracThreshold: 0.9,
        panelExtraAdd: 1,
        panelCountExp: 'PANEL_ROUND((((WC * G) + HEM_SIDE) * P) / FW_FAB)',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr4',
        curtainStyle: 'ม่านลอน',
        grainType: 'sheer',
        subCalcType: 'gathered',
        label: 'เกรนม่านโปร่ง (แบบย่นสำเร็จ) - ม่านลอน: ย่น 2.2 • พับริม 10 • พับบนล่างมาตรฐาน 30 (ประหยัด 20)',
        gatherRatio: 2.2,
        sideHem: 10,
        topBottomHem: 30,
        econTopBottomHem: 20,
        panelRoundMode: 'ceil',
        panelFracThreshold: 0.9,
        panelExtraAdd: 0,
        panelCountExp: 'CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB)',
        yRepeatCountExp: '0',
        qtyExp: '(((WC * G) + HEM_SIDE) * P * 1.05) / 91.44',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr5',
        curtainStyle: 'ม่านตาไก่',
        grainType: 'opaque',
        subCalcType: 'stretched',
        label: 'เกรนม่านทึบ (แบบขึงตึง) - ม่านตาไก่: ย่น 2.2 • พับริม 10 • พับบนล่าง 35',
        gatherRatio: 2.2,
        sideHem: 10,
        topBottomHem: 35,
        econTopBottomHem: 0,
        panelRoundMode: 'ceil_plus1_if_frac_ge',
        panelFracThreshold: 0.9,
        panelExtraAdd: 1,
        panelCountExp: 'PANEL_ROUND(((WC + HEM_SIDE) * P) / FW_FAB)',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr6',
        curtainStyle: 'ม่านตาไก่',
        grainType: 'sheer',
        subCalcType: 'stretched',
        label: 'เกรนม่านโปร่ง (แบบขึงตึง) - ม่านตาไก่: ย่น 2.2 • พับริม 10 • พับบนล่างมาตรฐาน 35 (ประหยัด 25)',
        gatherRatio: 2.2,
        sideHem: 10,
        topBottomHem: 35,
        econTopBottomHem: 25,
        panelRoundMode: 'ceil',
        panelFracThreshold: 0.9,
        panelExtraAdd: 0,
        panelCountExp: 'CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB)',
        yRepeatCountExp: '0',
        qtyExp: '((WC + HEM_SIDE) * P * 1.05) / 91.44',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr7',
        curtainStyle: 'ม่านพับ',
        grainType: 'opaque',
        subCalcType: 'stretched',
        label: 'เกรนม่านทึบ (แบบขึงตึง) - ม่านพับ: ย่น 1.0 • พับริม 10 • พับบนล่าง 40',
        gatherRatio: 1.0,
        sideHem: 10,
        topBottomHem: 40,
        econTopBottomHem: 0,
        panelRoundMode: 'ceil_plus1_if_frac_ge',
        panelFracThreshold: 0.9,
        panelExtraAdd: 1,
        panelCountExp: 'PANEL_ROUND(((WC + HEM_SIDE) * P) / FW_FAB)',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr8',
        curtainStyle: 'ม่านพับ',
        grainType: 'sheer',
        subCalcType: 'stretched',
        label: 'เกรนม่านโปร่ง (แบบขึงตึง) - ม่านพับ: ย่น 1.0 • พับริม 10 • พับบนล่าง 40',
        gatherRatio: 1.0,
        sideHem: 10,
        topBottomHem: 40,
        econTopBottomHem: 0,
        panelRoundMode: 'ceil',
        panelFracThreshold: 0.9,
        panelExtraAdd: 0,
        panelCountExp: 'CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB)',
        yRepeatCountExp: '0',
        qtyExp: '((WC + HEM_SIDE) * P * 1.05) / 91.44',
        roundMode: 'ceil_1dec',
      },
    ],
  };
}

/**
 * รับประกันว่ามีบัญชีแอดมินตั้งต้น username = T58121, password = Admin, role = admin เสมอ
 */
function ensureDefaultAdmin(staffList) {
  const list = Array.isArray(staffList) ? staffList.map(s => Object.assign({
    id: s.id || ('st_' + Math.random().toString(36).slice(2, 7)),
    username: s.username || '',
    password: s.password || '',
    role: s.role === 'admin' ? 'admin' : 'staff',
    name: s.name || '',
    dept: s.dept || '',
    branch: s.branch || '',
  }, s)) : [];

  const adminIdx = list.findIndex(s => String(s.username || '').trim().toUpperCase() === 'T58121');
  if (adminIdx >= 0) {
    list[adminIdx].username = 'T58121';
    if (!list[adminIdx].password) list[adminIdx].password = 'Admin';
    list[adminIdx].role = 'admin';
    if (!list[adminIdx].name) list[adminIdx].name = 'Admin (T58121)';
  } else {
    if (list.length === 1 && !list[0].username && list[0].name === 'นฤชา') {
      list[0].username = 'T58121';
      list[0].password = 'Admin';
      list[0].role = 'admin';
    } else {
      list.unshift({
        id: 'admin_t58121',
        username: 'T58121',
        password: 'Admin',
        role: 'admin',
        name: 'นฤชา',
        dept: 'ขาย',
        branch: 'สาขาเซ็นทรัลลาดพร้าว',
      });
    }
  }
  return list;
}

function getStdCurtainParams(styleName) {
  const def = defaultMasterDB();
  const std = (typeof masterDB !== 'undefined' && masterDB && masterDB.stdParams) || def.stdParams;
  const list = (typeof masterDB !== 'undefined' && masterDB && masterDB.curtains) || def.curtains;
  const found = list.find(c => c.name === styleName) || def.curtains.find(c => c.name === styleName) || null;
  return {
    subCalcType: (found && found.subCalcType) || getDefaultSubCalcType(styleName),
    gatherRatio: found && found.stdGatherRatio !== undefined ? parseFloat(found.stdGatherRatio) : 2.5,
    topBottomHem: found && found.stdTopBottomHem !== undefined ? parseFloat(found.stdTopBottomHem) : 35,
    econTopBottomHem: found && found.econTopBottomHem !== undefined ? parseFloat(found.econTopBottomHem) : 0,
    sideHem: found && found.stdSideHem !== undefined ? parseFloat(found.stdSideHem) : (parseFloat(std.stdSideHem) || 10),
    overlap: found && found.stdOverlap !== undefined ? parseFloat(found.stdOverlap) : (parseFloat(std.stdOverlap) || 8),
    sideReturn: found && found.stdSideReturn !== undefined ? parseFloat(found.stdSideReturn) : (parseFloat(std.stdSideReturn) || 8),
  };
}

const CALC_BEHAVIOR_MODES = [
  ['curtain', 'คำนวณตามสูตรผ้าม่าน (หลา)'],
  ['blind_piece', 'กำหนดขนาดต่อผืนเอง (แบบม่านม้วน/มู่ลี่ • ตร.ม.)'],
];

function getDefaultCalcBehavior(styleName) {
  return /ม่านม้วน|มู่ลี่|ม่านปรับแสง/.test(String(styleName || '').trim()) ? 'blind_piece' : 'curtain';
}

function normalizeCurtainItem(c, idx) {
  const defList = defaultMasterDB().curtains;
  const defMatch = defList.find(d => d.name === (c && c.name)) || defList[0];
  const item = Object.assign({
    id: 'c_' + (idx + 1),
    name: '',
    calcBehavior: (c && c.calcBehavior) || defMatch.calcBehavior || getDefaultCalcBehavior(c && c.name),
    subCalcType: defMatch.subCalcType || getDefaultSubCalcType(c && c.name),
    useHook: false,
    stdGatherRatio: defMatch.stdGatherRatio ?? 2.5,
    stdTopBottomHem: defMatch.stdTopBottomHem ?? 35,
    econTopBottomHem: defMatch.econTopBottomHem ?? 0,
    stdSideHem: defMatch.stdSideHem ?? 10,
    stdOverlap: defMatch.stdOverlap ?? 8,
    stdSideReturn: defMatch.stdSideReturn ?? 8,
  }, c || {});
  if (!item.calcBehavior || !['curtain', 'blind_piece'].includes(item.calcBehavior)) {
    item.calcBehavior = getDefaultCalcBehavior(item.name);
  }
  if (!item.subCalcType || !['gathered', 'stretched'].includes(item.subCalcType)) {
    item.subCalcType = getDefaultSubCalcType(item.name);
  }
  return item;
}

function parseCurtainStylesList(styleVal) {
  if (Array.isArray(styleVal)) {
    return Array.from(new Set(styleVal.map(x => String(x || '').trim()).filter(x => x && x !== '*')));
  }
  const s = String(styleVal || '').trim();
  if (!s || s === '*') return [];
  return Array.from(new Set(s.split(/[,;\n/|]+/).map(x => x.trim()).filter(x => x && x !== '*')));
}

function matchesCurtainStyleRule(ruleStyle, targetStyle) {
  const t = String(targetStyle || '').trim();
  if (!t) return true;
  const r = String(ruleStyle || '').trim();
  if (!r || r === '*') return true;
  const list = parseCurtainStylesList(r);
  if (!list.length) return true;
  return list.some(st => st === '*' || st === t || t.includes(st));
}

function normalizeWidthFormulaItem(wf, idx) {
  const def = defaultMasterDB().widthFormulas[0];
  const rawStyle = (wf && wf.curtainStyle) || 'ม่านจีบ';
  const styleList = parseCurtainStylesList(rawStyle);
  const style = (String(rawStyle).trim() === '*' || !styleList.length)
    ? (String(rawStyle).trim() === '*' ? '*' : 'ม่านจีบ')
    : styleList.join(', ');
  const primaryStyle = styleList[0] || style;
  const defSubType = getDefaultSubCalcType(primaryStyle);
  const item = Object.assign({
    id: 'wf_' + (idx + 1),
    curtainStyle: style,
    subCalcType: defSubType,
    layerType: 'both',
    rodType: '*',
    railTracks: '*',
    pieces: '*',
    label: '',
    railWidth: 'RW',
    overlap: defSubType === 'gathered' ? 8 : 0,
    sideReturn: defSubType === 'gathered' ? 8 : 0,
    widthExp: defSubType === 'gathered' ? '((RW / P) + OV + SR)' : '((RW * G) / P)',
    roundMode: 'ceil_int',
  }, def, wf || {});
  item.curtainStyle = style;
  item.pieces = '*'; // จำนวนผืนดึงจากบานหน้าต่าง/ประตูนั้นๆ เสมอ ไม่กำหนดในฐานข้อมูลความกว้าง
  if (!item.rodType) item.rodType = '*';
  if (!item.railTracks) item.railTracks = '*';
  if (!item.layerType || !['opaque', 'sheer', 'both'].includes(item.layerType)) item.layerType = 'both';
  if (!item.subCalcType || !['gathered', 'stretched'].includes(item.subCalcType)) {
    item.subCalcType = getDefaultSubCalcType(primaryStyle);
  }
  if (item.subCalcType === 'gathered' && (item.widthExp === '((RW + OV + SR) / P)' || item.widthExp === '(RW + OV + SR)')) {
    item.widthExp = '((RW / P) + OV + SR)';
  } else if (item.subCalcType === 'stretched' && primaryStyle === 'ม่านตาไก่' && item.widthExp === '((RW + OV + SR) / P)') {
    item.widthExp = '((RW * G) / P)';
  }
  return item;
}

function normalizeHeightFormulaItem(hf, idx) {
  const rawStyle = (hf && hf.curtainStyle !== undefined) ? hf.curtainStyle : '*';
  const styleList = parseCurtainStylesList(rawStyle);
  const style = (String(rawStyle).trim() === '*' || !styleList.length) ? '*' : styleList.join(', ');
  const item = Object.assign({
    id: 'hf_' + (idx + 1),
    curtainStyle: style,
    rodType: '*',
    railGroup: '*',
    railName: '*',
    railTracks: '*',
    pieces: '*',
    hookSize: '*',
    floorFloat: 1,
    label: '',
    heightExp: 'RH - FL_BASE',
    roundMode: 'none',
  }, hf || {});
  item.curtainStyle = style;
  item.pieces = '*'; // ไม่ใช้จำนวนผืนในฐานข้อมูลความสูงผ้าม่าน ใช้กลุ่มรางม่านและรายการรางม่านแทน
  if (!item.railGroup) item.railGroup = '*';
  if (!item.railName) item.railName = '*';
  return item;
}

function normalizeFabricCalcRuleItem(r, idx) {
  const isSheer = (r && r.grainType === 'sheer');
  const style = (r && r.curtainStyle) || 'ม่านจีบ';
  const subType = (r && r.subCalcType && ['gathered', 'stretched'].includes(r.subCalcType))
    ? r.subCalcType
    : getDefaultSubCalcType(style);
  const isGathered = subType === 'gathered';
  const defaultPanelExp = isSheer
    ? 'CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB)'
    : (isGathered ? 'PANEL_ROUND((((WC * G) + HEM_SIDE) * P) / FW_FAB)' : 'PANEL_ROUND(((WC + HEM_SIDE) * P) / FW_FAB)');
  const defaultQtyExp = isSheer
    ? (isGathered ? '(((WC * G) + HEM_SIDE) * P * 1.05) / 91.44' : '((WC + HEM_SIDE) * P * 1.05) / 91.44')
    : '((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44';

  const item = Object.assign({
    id: 'fcr_' + (idx + 1),
    curtainStyle: style,
    grainType: isSheer ? 'sheer' : 'opaque',
    subCalcType: subType,
    label: '',
    gatherRatio: 2.5,
    sideHem: 10,
    topBottomHem: 35,
    econTopBottomHem: isSheer && isGathered ? 25 : 0,
    panelRoundMode: isSheer ? 'ceil' : 'ceil_plus1_if_frac_ge',
    panelFracThreshold: 0.9,
    panelExtraAdd: isSheer ? 0 : 1,
    panelCountExp: defaultPanelExp,
    yRepeatCountExp: isSheer ? '0' : 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
    qtyExp: defaultQtyExp,
    roundMode: 'ceil_1dec',
  }, r || {});

  item.subCalcType = (item.subCalcType && ['gathered', 'stretched'].includes(item.subCalcType))
    ? item.subCalcType
    : getDefaultSubCalcType(item.curtainStyle);

  // อัปเกรดสูตรเดิมที่ยังเป็น / 90 หรือ P ให้เป็นสูตรมาตรฐานใหม่ (* 1.05 / 91.44 และแยกย่นสำเร็จ vs ขึงตึง)
  if (!item.panelCountExp || item.panelCountExp === 'P' || item.panelCountExp.includes('/ FW_FAB) * P')) {
    item.panelCountExp = defaultPanelExp;
  }
  if (!item.qtyExp || item.qtyExp.includes('/ 90')) {
    item.qtyExp = defaultQtyExp;
  }
  return item;
}

function normalizeFabricItem(f, idx) {
  const item = Object.assign({
    id: 'fab_' + (idx + 1),
    name: '',
    design: '',
    fabricWidth: 140,
    yRepeat: 0,
    calcMode: 'opaque',
  }, f || {});
  if (!canFabricUseSheerGrain(item.fabricWidth)) {
    item.calcMode = 'opaque';
  }
  return item;
}

function isAccessoryCategory(cat) {
  return /ด้ามจูง|ตะขอ|ห่วง|หัวปิด|ขาจับ|อุปกรณ์/.test(String(cat || ''));
}

function normalizeRailItem(rl, idx) {
  const def = defaultMasterDB().rails[idx] || {};
  const rodCategory = (rl && rl.rodCategory && !isAccessoryCategory(rl.rodCategory)) ? rl.rodCategory : 'รางม่านจีบ';
  const sellUnit = (rl && rl.sellUnit) || def.sellUnit || (rodCategory === 'รางโชว์' ? 'ชุด' : 'เมตร');
  const minLengthRaw = (rl && rl.minLength !== undefined && rl.minLength !== '')
    ? parseFloat(rl.minLength)
    : (def.minLength || (sellUnit === 'ชุด' || rodCategory === 'รางโชว์' ? 2.0 : 1.0));
  return Object.assign({
    id: 'rl_' + (idx + 1),
    name: '',
    railGroup: '',
    rodCategory,
    curtainStyle: '*',
    defaultColor: '',
    sellUnit,
    minLength: (!isNaN(minLengthRaw) && minLengthRaw > 0) ? minLengthRaw : (sellUnit === 'ชุด' ? 2.0 : 1.0),
    setRanges: def.setRanges || (rodCategory === 'รางโชว์' ? '0-2.00=1, 2.01-2.99=1, 3.00-4.00=2' : ''),
    spec: '',
  }, rl || {}, {
    rodCategory,
    sellUnit,
    minLength: (!isNaN(minLengthRaw) && minLengthRaw > 0) ? minLengthRaw : (sellUnit === 'ชุด' ? 2.0 : 1.0),
  });
}

function normalizeBlindItem(bl, idx) {
  const raw = bl || {};
  const modelName = String(raw.model || raw.group || raw.name || '').trim();
  let codesStr = String(raw.codes || '').trim();
  if (!codesStr && raw.name && raw.group && String(raw.name).trim() !== String(raw.group).trim()) {
    codesStr = String(raw.name).trim();
  }
  const item = Object.assign({
    id: 'bl_' + (idx + 1),
    model: modelName,
    group: modelName,
    name: modelName,
    codes: codesStr,
    curtainStyle: 'ม่านม้วน',
    cordColors: '',
    valanceColors: '',
    minSqm: 1.5,
    roundMode: 'ceil_1dec',
  }, raw, {
    model: modelName,
    group: modelName,
    name: modelName || String(raw.name || ''),
    codes: codesStr,
  });
  item.minSqm = Math.max(1.5, parseFloat(item.minSqm) || 1.5);
  return item;
}

function normalizeBlindCordItem(bc, idx) {
  const raw = bc || {};
  const ct = String(raw.cordType || '').trim();
  return Object.assign({
    id: 'bc_' + (idx + 1),
    cordType: ct === 'เชือกสลิง' ? 'เชือกสลิง' : 'เชือกเทป',
    name: '',
    code: '',
  }, raw, {
    cordType: ct === 'เชือกสลิง' ? 'เชือกสลิง' : 'เชือกเทป',
  });
}

function normalizeBlindValanceItem(bv, idx) {
  return Object.assign({
    id: 'bv_' + (idx + 1),
    name: '',
    code: '',
  }, bv || {});
}

function parseBlindCodesList(codesStr) {
  return Array.from(new Set(
    String(codesStr || '')
      .split(/[,;\n/|]+/)
      .map(s => s.trim())
      .filter(Boolean)
  ));
}

function getStaffBranchList(staffNameOrObj) {
  let st = null;
  const allStaff = (typeof masterDB !== 'undefined' && Array.isArray(masterDB.staff)) ? masterDB.staff : [];
  if (staffNameOrObj && typeof staffNameOrObj === 'object') {
    const uname = String(staffNameOrObj.username || '').trim().toLowerCase();
    const sname = String(staffNameOrObj.name || '').trim().toLowerCase();
    // ดึงข้อมูลล่าสุดจาก masterDB.staff เสมอ เพื่อให้สาขาที่เพิ่งเพิ่มใหม่มีผลทันทีโดยไม่ต้องล็อกอินใหม่
    const live = allStaff.find(s =>
      (uname && String(s.username || '').trim().toLowerCase() === uname) ||
      (sname && String(s.name || '').trim().toLowerCase() === sname)
    );
    st = live || staffNameOrObj;
  } else if (staffNameOrObj && allStaff.length) {
    const target = String(staffNameOrObj).trim().toLowerCase();
    st = allStaff.find(s => String(s.name || '').trim().toLowerCase() === target || String(s.username || '').trim().toLowerCase() === target);
  }
  const rawBranch = st ? String(st.branch || '') : '';
  return Array.from(new Set(rawBranch.split(/[,;\n/|]+/).map(s => s.trim()).filter(Boolean)));
}

function getAllBranchesList() {
  const set = new Set();
  if (typeof masterDB !== 'undefined') {
    if (Array.isArray(masterDB.branches)) {
      masterDB.branches.forEach(b => {
        const s = String(b || '').trim();
        if (s) set.add(s);
      });
    } else {
      (Array.isArray(masterDB.staff) ? masterDB.staff : []).forEach(st => {
        String((st && st.branch) || '').split(/[,;\n/|]+/).map(s => s.trim()).filter(Boolean).forEach(b => set.add(b));
      });
    }
  }
  return Array.from(set);
}

function normalizeAccessoryItem(ac, idx) {
  const def = defaultMasterDB().accessories[idx] || {};
  const category = (ac && (ac.category || ac.rodCategory)) || def.category || 'ด้ามจูง';
  return Object.assign({
    id: 'ac_' + (idx + 1),
    name: '',
    category,
    curtainStyle: '*',
    defaultColor: '',
    sellUnit: 'ชิ้น',
    spec: '',
  }, ac || {}, {
    category,
    sellUnit: 'ชิ้น',
  });
}

function normalizeMasterDBObject(raw) {
  const def = defaultMasterDB();
  if (!raw || typeof raw !== 'object') return def;
  const isLegacy8 = !(Number(raw.schemaVersion) >= 8);
  const isLegacy9 = !(Number(raw.schemaVersion) >= 9);
  const hasRawRails = Array.isArray(raw.rails);
  const rawRails = hasRawRails ? raw.rails : [];
  const onlyRails = rawRails.filter(r => r && !isAccessoryCategory(r.rodCategory || r.category));
  const migratedAcc = rawRails.filter(r => r && isAccessoryCategory(r.rodCategory || r.category));
  // เคารพ Array ว่าง ([]) เมื่อผู้ดูแลระบบลบข้อมูลออกหมดแล้ว ไม่ดึงค่าเริ่มต้นกลับมาทับอีก
  const rawAccessories = Array.isArray(raw.accessories)
    ? raw.accessories
    : (migratedAcc.length ? migratedAcc : def.accessories);

  const normalizedStaff = ensureDefaultAdmin(Array.isArray(raw.staff) ? raw.staff : def.staff);
  const branchSet = new Set();
  if (Array.isArray(raw.branches)) {
    raw.branches.forEach(b => {
      const s = String(b || '').trim();
      if (s) branchSet.add(s);
    });
  } else {
    normalizedStaff.forEach(st => {
      String((st && st.branch) || '').split(/[,;\n/|]+/).map(s => s.trim()).filter(Boolean).forEach(b => branchSet.add(b));
    });
    if (!branchSet.size) {
      (def.branches || []).forEach(b => {
        const s = String(b || '').trim();
        if (s) branchSet.add(s);
      });
    }
  }

  return {
    schemaVersion: 10,
    stdParams: Object.assign({}, def.stdParams, raw.stdParams || {}),
    branches: Array.from(branchSet),
    staff: normalizedStaff,
    curtains: Array.isArray(raw.curtains)
      ? raw.curtains.map((c, i) => normalizeCurtainItem(c, i))
      : def.curtains,
    hooks: Array.isArray(raw.hooks) ? raw.hooks : def.hooks,
    remarks: Array.isArray(raw.remarks) ? raw.remarks : def.remarks,
    fabrics: Array.isArray(raw.fabrics)
      ? raw.fabrics.map((f, i) => normalizeFabricItem(f, i))
      : def.fabrics,
    rails: (hasRawRails ? onlyRails : def.rails).map((rl, i) => normalizeRailItem(rl, i)),
    accessories: rawAccessories.map((ac, i) => normalizeAccessoryItem(ac, i)),
    blinds: (Array.isArray(raw.blinds) ? raw.blinds : def.blinds).map((bl, i) => normalizeBlindItem(bl, i)),
    blindCords: (Array.isArray(raw.blindCords) ? raw.blindCords : def.blindCords).map((bc, i) => normalizeBlindCordItem(bc, i)),
    blindValances: (Array.isArray(raw.blindValances) ? raw.blindValances : def.blindValances).map((bv, i) => normalizeBlindValanceItem(bv, i)),
    widthFormulas: !isLegacy9 && Array.isArray(raw.widthFormulas)
      ? raw.widthFormulas.map((w, i) => normalizeWidthFormulaItem(w, i))
      : def.widthFormulas,
    heightFormulas: !isLegacy9 && Array.isArray(raw.heightFormulas)
      ? raw.heightFormulas.map((h, i) => normalizeHeightFormulaItem(h, i))
      : def.heightFormulas,
    fabricCalcRules: !isLegacy8 && Array.isArray(raw.fabricCalcRules)
      ? raw.fabricCalcRules.map((r, i) => normalizeFabricCalcRuleItem(r, i))
      : def.fabricCalcRules,
  };
}

let masterDB = (() => {
  try {
    const raw = JSON.parse(
      localStorage.getItem(DB_KEY) ||
      localStorage.getItem('mto-master-db-v9') ||
      localStorage.getItem('mto-master-db-v8') ||
      localStorage.getItem('mto-master-db-v7') ||
      localStorage.getItem('mto-master-db-v6') ||
      localStorage.getItem('mto-master-db-v5') ||
      localStorage.getItem('mto-master-db-v4') ||
      localStorage.getItem('mto-master-db-v3')
    );
    return normalizeMasterDBObject(raw);
  } catch {
    return defaultMasterDB();
  }
})();

function saveMasterDB() {
  masterDB.staff = ensureDefaultAdmin(masterDB.staff);
  // คงรายการสาขาจาก masterDB.branches เป็นแหล่งข้อมูลหลักเพียงแหล่งเดียว (ไม่ดูดตัวอักษรระหว่างพิมพ์จากช่องพนักงานมาสร้างสาขาซ้ำ)
  const bSet = new Set(Array.isArray(masterDB.branches) ? masterDB.branches.map(b => String(b || '').trim()).filter(Boolean) : []);
  masterDB.branches = Array.from(bSet);
  masterDB.fabrics = (masterDB.fabrics || []).map((f, i) => normalizeFabricItem(f, i));
  masterDB.rails = (masterDB.rails || []).map((rl, i) => normalizeRailItem(rl, i));
  masterDB.accessories = (masterDB.accessories || []).map((ac, i) => normalizeAccessoryItem(ac, i));
  try { localStorage.setItem(DB_KEY, JSON.stringify(masterDB)); } catch (e) { console.warn(e); }
  // อัปเดต session ของผู้ใช้ที่ล็อกอินอยู่ทันทีเมื่อแก้ไขสาขา/ข้อมูลพนักงาน
  try {
    const sessRaw = sessionStorage.getItem('mto-auth-user');
    if (sessRaw) {
      const sess = JSON.parse(sessRaw);
      const liveSt = (masterDB.staff || []).find(s => String(s.username || '').toLowerCase() === String(sess.username || '').toLowerCase());
      if (liveSt) {
        sessionStorage.setItem('mto-auth-user', JSON.stringify(Object.assign({}, sess, {
          name: liveSt.name || sess.name,
          dept: liveSt.dept || sess.dept,
          branch: liveSt.branch || '',
          role: liveSt.role || sess.role,
        })));
      }
    }
  } catch (e) {}
  refreshRemarksDatalist();
  if (typeof RealtimeSync !== 'undefined') RealtimeSync.schedulePush();
}

function refreshRemarksDatalist() {
  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dlRemarks = document.getElementById('dlRemarks');
  if (dlRemarks) {
    dlRemarks.innerHTML = (masterDB.remarks || []).map(r => `<option value="${escH(r.name)}">`).join('');
  }
  const dlFabrics = document.getElementById('dlFabrics');
  if (dlFabrics) {
    dlFabrics.innerHTML = (masterDB.fabrics || []).map(f => `<option value="${escH(f.name)}">${escH(f.design || '')} (หน้าผ้า ${escH(f.fabricWidth)} ซม.)</option>`).join('');
  }
  const dlBlinds = document.getElementById('dlBlinds');
  if (dlBlinds) {
    dlBlinds.innerHTML = (masterDB.blinds || []).map(b => `<option value="${escH(b.name)}">${escH(b.curtainStyle || '')}</option>`).join('');
  }
  const dlRails = document.getElementById('dlRails');
  if (dlRails) {
    dlRails.innerHTML = (masterDB.rails || []).map(r => `<option value="${escH(r.name)}">${escH(r.rodCategory || '')}</option>`).join('');
  }
}

/**
 * Safe formula evaluator supporting:
 *   W (กว้างเฟรม ซม.), H (สูงเฟรม ซม.), EL (เผื่อซ้าย ซม.), ER (เผื่อขวา ซม.), ET (เผื่อบน ซม.), EB (เผื่อล่าง ซม.),
 *   RW (ความกว้างรางม่าน ซม.), RH (ความสูงรางม่าน ซม.), FW (กว้างเต็ม ซม.), FH (สูงเต็ม ซม.),
 *   WC (ความกว้างผ้าม่านต่อผืน ซม.), HC (ความสูงผ้าม่าน ซม.), P (จำนวนผืน: 1 หรือ 2), RT (จำนวนชั้นรางม่าน),
 *   G (ระยะย่นผ้าม่าน เท่า), OV (ระยะเผื่อเกย ซม.), SR (ระยะเผื่ออ้อมข้าง ซม.),
 *   FW_FAB (ขนาดหน้าผ้า ซม.), YR (ระยะลายผ้า Y-Repeat ซม.),
 *   HEM_SIDE (ระยะเผื่อพับริมผ้า ซม.), HEM_TB (ระยะเผื่อพับขอบบนล่างมาตรฐาน ซม.),
 *   HEM_TB_ECON (ระยะเผื่อพับขอบบนล่างแบบประหยัด ซม.), HEM_TB_SHEER_PANEL (เผื่อพับขอบบนล่างสำหรับหาจำนวนหน้าผ้าเกรนโปร่ง ซม.),
 *   PANELS (จำนวนหน้าผ้า), YR_CNT (จำนวน Repeat ของเกรนม่านทึบ)
 */
function evalFormulaExpr(expr, vars = {}, roundMode = 'none') {
  if (expr === undefined || expr === null || !String(expr).trim()) return '';
  try {
    const floorInt = x => Math.floor(Number(x) + 1e-9);
    const ceilInt = x => Math.ceil(Number(x) - 1e-9);
    const ceil1Dec = x => Math.ceil((Number(x) - 1e-9) * 10) / 10;
    const roundStd = x => Math.round(Number(x) * 100) / 100;
    const pMode = vars.PANEL_ROUND_MODE || 'ceil_plus1_if_frac_ge';
    const pTh = vars.PANEL_FRAC_TH !== undefined ? vars.PANEL_FRAC_TH : 0.9;
    const pAdd = vars.PANEL_EXTRA_ADD !== undefined ? vars.PANEL_EXTRA_ADD : 1;
    const panelRoundFn = (x, customTh, customAdd) => applyPanelRounding(
      x,
      pMode,
      customTh !== undefined ? customTh : pTh,
      customAdd !== undefined ? customAdd : pAdd
    );

    const fn = new Function(
      'W', 'H', 'EL', 'ER', 'ET', 'EB', 'RW', 'RH', 'FW', 'FH',
      'WC', 'HC', 'P', 'RT', 'G', 'OV', 'SR', 'FL_BASE',
      'FW_FAB', 'YR', 'HEM_SIDE', 'HEM_TB', 'HEM_TB_ECON', 'HEM_TB_SHEER_PANEL', 'PANELS', 'YR_CNT',
      'ceil', 'floor', 'round', 'ceil1', 'CEIL', 'FLOOR', 'ROUND', 'CEIL1', 'PANEL_ROUND', 'panel_round', 'max', 'min',
      `"use strict"; return (${expr});`
    );
    const flBase = vars.FL_BASE !== undefined ? vars.FL_BASE : 1;
    const hemTb = vars.HEM_TB || 0;
    const hemTbEcon = vars.HEM_TB_ECON || 0;
    const hemTbSheerPanel = vars.HEM_TB_SHEER_PANEL !== undefined
      ? vars.HEM_TB_SHEER_PANEL
      : (hemTbEcon > 0 ? hemTbEcon : hemTb);
    const res = fn(
      vars.W || 0, vars.H || 0, vars.EL || 0, vars.ER || 0, vars.ET || 0, vars.EB || 0,
      vars.RW || 0, vars.RH || 0, vars.FW || 0, vars.FH || 0,
      vars.WC || 0, vars.HC || 0, vars.P || 1, vars.RT || 1, vars.G || 1, vars.OV || 0, vars.SR || 0, flBase,
      vars.FW_FAB || 140, vars.YR || 0, vars.HEM_SIDE || 0, hemTb, hemTbEcon, hemTbSheerPanel,
      vars.PANELS || 1, vars.YR_CNT || 0,
      ceilInt, floorInt, roundStd, ceil1Dec, ceilInt, floorInt, roundStd, ceil1Dec, panelRoundFn, panelRoundFn, Math.max, Math.min
    );
    if (res === undefined || res === null || Number.isNaN(res) || !Number.isFinite(res)) return '';
    return applyRoundMode(res, roundMode);
  } catch (e) {
    console.warn('Formula error:', expr, e);
    return '';
  }
}

/**
 * ค้นหาสูตรความกว้างผ้าม่านตามเงื่อนไข:
 * รูปแบบผ้าม่าน (curtainStyle), จำนวนรางม่าน(ชั้น) (railTracks), ประเภทรางม่าน (rodType), และแยกม่านทึบ/ม่านโปร่ง/ทั้งคู่ (layerType)
 * (ไม่ระบุจำนวนผืนในฐานข้อมูลขนาดความกว้าง — ดึงจำนวนผืน P จากบานที่เลือกโดยตรง)
 */
function getWidthFormulasForStyle(curtainStyle, pieces = '', railTracks = '', rodType = '', layerType = '') {
  const all = masterDB.widthFormulas || [];
  if (!curtainStyle && !railTracks && !rodType && !layerType) return all;
  const matchLayerFn = f => {
    if (!layerType) return true;
    const lt = f.layerType || 'both';
    return lt === 'both' || lt === '*' || lt === layerType;
  };
  const matched = all.filter(f => {
    const matchStyle = matchesCurtainStyleRule(f.curtainStyle, curtainStyle);
    const matchTracks = !railTracks || !f.railTracks || String(f.railTracks) === '*' || String(f.railTracks) === String(railTracks);
    const matchRod = !rodType || !f.rodType || f.rodType === '*' || f.rodType === rodType;
    return matchStyle && matchTracks && matchRod && matchLayerFn(f);
  });
  if (matched.length) return matched;
  const byStyleLayer = all.filter(f => matchesCurtainStyleRule(f.curtainStyle, curtainStyle) && matchLayerFn(f));
  if (byStyleLayer.length) return byStyleLayer;
  const byStyle = all.filter(f => matchesCurtainStyleRule(f.curtainStyle, curtainStyle));
  return byStyle.length ? byStyle : all;
}

/**
 * ค้นหาสูตรความสูงผ้าม่านสำหรับแสดงในรายการเลือก (Dropdown) ตามรูปแบบผ้าม่านของบานนั้นๆ
 */
function normalizeHookKey(h) {
  const s = String(h || '').trim().toLowerCase();
  if (!s || s === '*') return '*';
  const m = /(\d+)/.exec(s);
  return m ? m[1] : s;
}

function inferNaturalRodTypeForStyle(curtainStyle) {
  const s = String(curtainStyle || '').trim();
  if (/ม่านจีบ/.test(s)) return 'รางม่านจีบ';
  if (/ม่านลอน/.test(s)) return 'รางม่านลอน';
  if (/ม่านพับ/.test(s)) return 'รางม่านพับ';
  if (/ม่านตาไก่|หูกระเช้า|ม่านสอด/.test(s)) return 'รางโชว์';
  return '';
}

function resolveRailMetaByName(railModelName) {
  const n = String(railModelName || '').trim();
  if (!n) return { name: '', railGroup: '', rodCategory: '' };
  const nLow = n.toLowerCase();
  const rl = (masterDB.rails || []).find(r => String(r.name || '').trim().toLowerCase() === nLow)
    || (masterDB.rails || []).find(r => {
      const rn = String(r.name || '').trim().toLowerCase();
      return rn && (nLow.includes(rn) || rn.includes(nLow));
    });
  return {
    name: rl ? String(rl.name || '').trim() : n,
    railGroup: rl ? String(rl.railGroup || '').trim() : '',
    rodCategory: rl ? String(rl.rodCategory || '').trim() : '',
  };
}

function getHeightFormulasForWindow(curtainStyle, rodType, hookSize, railTracks = '', railModel = '') {
  const all = masterDB.heightFormulas || [];
  if (!curtainStyle) return all;
  const hKey = normalizeHookKey(hookSize);
  const naturalRod = inferNaturalRodTypeForStyle(curtainStyle);
  const rm = resolveRailMetaByName(railModel);
  const effRod = rodType || rm.rodCategory || naturalRod;
  const matched = all.filter(f => {
    const matchStyle = matchesCurtainStyleRule(f.curtainStyle, curtainStyle);
    const matchRod = !effRod || !f.rodType || f.rodType === '*' || f.rodType === effRod || (effRod !== 'รางโชว์' && naturalRod && f.rodType === naturalRod);
    const matchRailGroup = !rm.railGroup || !f.railGroup || f.railGroup === '*' || f.railGroup.trim().toLowerCase() === rm.railGroup.toLowerCase();
    const matchRailName = !rm.name || !f.railName || f.railName === '*' || f.railName.trim().toLowerCase() === rm.name.toLowerCase();
    const fHookKey = normalizeHookKey(f.hookSize);
    const matchHook = !hookSize || !f.hookSize || f.hookSize === '*' || f.hookSize === hookSize || (hKey !== '*' && fHookKey === hKey);
    const matchTracks = !railTracks || !f.railTracks || String(f.railTracks) === '*' || String(f.railTracks) === String(railTracks);
    return matchStyle && matchRod && matchRailGroup && matchRailName && matchHook && matchTracks;
  });
  return matched.length ? matched : all;
}

/**
 * ค้นหาสูตรลดความสูงผ้าม่านอัตโนมัติอย่างฉลาดตามเงื่อนไขจริง:
 * รูปแบบผ้าม่าน + ประเภทรางม่าน + กลุ่มรางม่าน + รายการรางม่าน + ขนาดตะขอ + จำนวนชั้นราง (1 ชั้น / 2 ชั้น)
 * - จับคู่แบบแบ่งระดับความแม่นยำ (Tiered Scoring) เพื่อให้ได้สูตรที่ตรงที่สุดทั้งแบบ 1 ชั้น และ 2 ชั้น (รวมถึง 2 ชั้นคนละแบบ เช่น ม่านลอน+ม่านจีบ)
 */
function findAutoHeightFormulaForWindow(curtainStyle, rodType, hookSize, railTracks = '', railModel = '') {
  if (!curtainStyle) return null;
  const all = masterDB.heightFormulas || [];
  const styleTrim = String(curtainStyle || '').trim();
  const hKey = normalizeHookKey(hookSize);
  const naturalRod = inferNaturalRodTypeForStyle(styleTrim);
  const rm = resolveRailMetaByName(railModel);
  const isBlindStyle = isBlindOrRollerStyle(styleTrim);
  const primaryRod = String(rodType || '').trim() || rm.rodCategory || naturalRod;

  const filterFormulas = (effRod, { relaxRail = false, relaxTracks = false, allowUnsetHookWildcard = true } = {}) => all.filter(f => {
    const fStyle = String(f.curtainStyle || '*').trim();
    const fRod = String(f.rodType || '*').trim();
    const fGroup = String(f.railGroup || '*').trim();
    const fRail = String(f.railName || '*').trim();
    const fHook = String(f.hookSize || '*').trim();
    const fTracks = String(f.railTracks || '*').trim();

    const reqStyle = fStyle && fStyle !== '*';
    const reqRod = fRod && fRod !== '*';
    const reqRailGroup = fGroup && fGroup !== '*';
    const reqRailName = fRail && fRail !== '*';
    const reqHook = fHook && fHook !== '*';
    const reqTracks = fTracks && fTracks !== '*';

    if (reqStyle && !matchesCurtainStyleRule(fStyle, styleTrim)) return false;
    if (isBlindStyle && !reqStyle) return false;
    if (reqRod && (!effRod || fRod !== effRod)) return false;

    if (!relaxRail) {
      if (reqRailName && (!rm.name || fRail.toLowerCase() !== rm.name.toLowerCase())) return false;
      if (reqRailGroup && (!rm.railGroup || fGroup.toLowerCase() !== rm.railGroup.toLowerCase())) return false;
    } else {
      // ในโหมดผ่อนคลาย: หากมี railModel ที่ระบุกลุ่มแล้ว ห้ามข้ามไปจับคู่กับสูตรของกลุ่มรางอื่นที่ขัดแย้งกัน
      if (reqRailName && rm.name && fRail.toLowerCase() !== rm.name.toLowerCase()) return false;
      if (reqRailGroup && rm.railGroup && fGroup.toLowerCase() !== rm.railGroup.toLowerCase()) return false;
    }

    if (reqHook) {
      if (!hookSize) return false;
      const fHookKey = normalizeHookKey(fHook);
      if (fHook !== hookSize && (hKey === '*' || fHookKey !== hKey)) return false;
    } else if (!allowUnsetHookWildcard && hookSize) {
      return false;
    }

    if (!relaxTracks && reqTracks && (!railTracks || fTracks !== String(railTracks))) return false;
    return reqStyle || reqRod || reqRailName || reqRailGroup || reqHook;
  });

  const scoreFormula = x => {
    const fStyle = String(x.curtainStyle || '*').trim();
    const fRod = String(x.rodType || '*').trim();
    const fGroup = String(x.railGroup || '*').trim();
    const fRail = String(x.railName || '*').trim();
    const fHook = String(x.hookSize || '*').trim();
    const fTracks = String(x.railTracks || '*').trim();
    let sc = 0;
    if (fRail && fRail !== '*' && rm.name && fRail.toLowerCase() === rm.name.toLowerCase()) sc += 20;
    if (fGroup && fGroup !== '*' && rm.railGroup && fGroup.toLowerCase() === rm.railGroup.toLowerCase()) sc += 14;
    if (fStyle === styleTrim) sc += 12;
    else if (fStyle && fStyle !== '*') {
      const fList = parseCurtainStylesList(fStyle);
      if (fList.includes(styleTrim)) sc += 10;
      else if (matchesCurtainStyleRule(fStyle, styleTrim)) sc += 5;
    }
    if (fHook && fHook !== '*' && hookSize && (fHook === hookSize || normalizeHookKey(fHook) === hKey)) sc += 8;
    if (fRod && fRod !== '*' && (fRod === primaryRod || fRod === naturalRod)) sc += 6;
    if (fTracks && fTracks !== '*' && railTracks && fTracks === String(railTracks)) sc += 4;
    // หักคะแนนเล็กน้อยหากสูตรระบุเงื่อนไขที่ไม่ได้กรอกไว้ (เช่น สูตรเฉพาะรางอื่นเมื่อยังไม่เลือกราง)
    if (fRail && fRail !== '*' && !rm.name) sc -= 3;
    if (fGroup && fGroup !== '*' && !rm.railGroup) sc -= 2;
    return sc;
  };

  const pickBest = list => {
    if (!list.length) return null;
    return list.slice().sort((a, b) => scoreFormula(b) - scoreFormula(a))[0];
  };

  // Tier 1: จับคู่ตรงทุกเงื่อนไขด้วย primaryRod (rodType ของชั้นนั้น / rodCategory ของรุ่นราง / naturalRod)
  let hit = pickBest(filterFormulas(primaryRod, { relaxRail: false, relaxTracks: false }));
  // Tier 2: หากยังไม่พบ ลองจับคู่ด้วย naturalRod ของรูปแบบผ้าม่านชั้นนั้น (เช่น ม่านลอน -> รางม่านลอน, ม่านจีบ -> รางม่านจีบ)
  if (!hit && naturalRod && naturalRod !== primaryRod) {
    hit = pickBest(filterFormulas(naturalRod, { relaxRail: false, relaxTracks: false }));
  }
  // Tier 3: หากยังไม่พบ ลองผ่อนคลายเฉพาะจำนวนชั้นราง (railTracks) แต่ยังยึดรูปแบบม่าน/ราง/กลุ่มราง/ตะขอเป๊ะ
  if (!hit) {
    hit = pickBest(filterFormulas(primaryRod, { relaxRail: false, relaxTracks: true }))
      || (naturalRod ? pickBest(filterFormulas(naturalRod, { relaxRail: false, relaxTracks: true })) : null);
  }
  // Tier 4: หากยังไม่ได้กำหนดรุ่นรางหรือกลุ่มรางบนบาน ลองจับคู่แบบผ่อนคลายรางแต่ยึดรูปแบบม่าน + ตะขอ
  if (!hit && (!rm.name || !rm.railGroup)) {
    hit = pickBest(filterFormulas(primaryRod, { relaxRail: true, relaxTracks: true }))
      || (naturalRod ? pickBest(filterFormulas(naturalRod, { relaxRail: true, relaxTracks: true })) : null);
  }
  if (hit) return hit;

  if (isBlindStyle) return null;
  return all.find(f => (!f.curtainStyle || f.curtainStyle === '*') && (!f.rodType || f.rodType === '*') && (!f.hookSize || f.hookSize === '*')) || null;
}

/**
 * แยกเฉพาะตัวเลขจำนวนหลาของผืนด้านหน้า (ตัดส่วนในวงเล็บผ้าเย็บประกบออกก่อน) เช่น "3/7.5 (1/4.0)" -> 7.5 หรือ "5/8.9" -> 8.9
 */
function extractYardsFromCalcText(val) {
  const raw = String(val ?? '').trim();
  if (!raw) return 0;
  const s = raw.replace(/\([^)]*\)/g, '').trim();
  if (!s) return 0;
  if (s.includes('/')) {
    const parts = s.split('/');
    const afterSlash = parseFloat(parts[parts.length - 1].replace(/[^\d.-]/g, ''));
    return (!isNaN(afterSlash) && Number.isFinite(afterSlash)) ? afterSlash : 0;
  }
  const n = parseFloat(s.replace(/[^\d.-]/g, ''));
  return (!isNaN(n) && Number.isFinite(n)) ? n : 0;
}

/**
 * แยกตัวเลขจำนวนหลาของผ้าเย็บประกบจากวงเล็บด้านหลัง เช่น "3/7.5 (1/4.0)" -> 4.0 หรือ "1/4.0" -> 4.0
 */
function extractLiningYardsFromCalcText(val) {
  const raw = String(val ?? '').trim();
  if (!raw) return 0;
  const m = /\(([^)]+)\)/.exec(raw);
  const target = m ? m[1].trim() : raw;
  if (!target) return 0;
  if (target.includes('/')) {
    const parts = target.split('/');
    const afterSlash = parseFloat(parts[parts.length - 1].replace(/[^\d.-]/g, ''));
    return (!isNaN(afterSlash) && Number.isFinite(afterSlash)) ? afterSlash : 0;
  }
  const n = parseFloat(target.replace(/[^\d.-]/g, ''));
  return (!isNaN(n) && Number.isFinite(n)) ? n : 0;
}

function getFabricCalcRulesForWindow(curtainStyle, grainType) {
  const all = masterDB.fabricCalcRules || [];
  const matched = all.filter(r => {
    const matchStyle = !curtainStyle || !r.curtainStyle || r.curtainStyle === '*' || r.curtainStyle === curtainStyle || curtainStyle.includes(r.curtainStyle);
    const matchGrain = !grainType || r.grainType === grainType;
    return matchStyle && matchGrain;
  });
  return matched.length ? matched : all;
}
const getFabricCalcRulesForStyle = getFabricCalcRulesForWindow;

function getRailsForStyle(curtainStyle, rodType = '') {
  const all = masterDB.rails || [];
  if (!curtainStyle && !rodType) return all;
  const rt = String(rodType || '').trim();
  // หากระบุประเภทรางม่านชัดเจน (เช่น รางม่านจีบ / รางม่านลอน / รางโชว์) ให้ดึงรางทั้งหมดในประเภทนั้นมาก่อนเสมอ
  if (rt) {
    const byRod = all.filter(r => !r.rodCategory || r.rodCategory === '*' || r.rodCategory === rt);
    if (byRod.length) return byRod;
  }
  const matched = all.filter(r => {
    const matchStyle = !curtainStyle || !r.curtainStyle || r.curtainStyle === '*' || r.curtainStyle === curtainStyle || curtainStyle.includes(r.curtainStyle);
    const matchRod = !rt || !r.rodCategory || r.rodCategory === '*' || r.rodCategory === rt;
    return matchStyle && matchRod;
  });
  return matched.length ? matched : all;
}

function getBlindsForStyle(curtainStyle) {
  const all = masterDB.blinds || [];
  if (!curtainStyle) return all;
  const matched = all.filter(b => !b.curtainStyle || b.curtainStyle === '*' || b.curtainStyle === curtainStyle || curtainStyle.includes(b.curtainStyle));
  return matched.length ? matched : all;
}

function isBlindOrRollerStyle(styleName) {
  const s = String(styleName || '').trim();
  if (!s) return false;
  if (typeof masterDB !== 'undefined' && Array.isArray(masterDB.curtains)) {
    const matched = masterDB.curtains.find(c => c && String(c.name || '').trim() === s);
    if (matched && matched.calcBehavior) {
      return matched.calcBehavior === 'blind_piece';
    }
  }
  return /ม่านม้วน|มู่ลี่|ม่านปรับแสง/.test(s);
}

/**
 * คำนวณพื้นที่รวม (ตร.ม.) และจำนวนผืนจากรายการกำหนดขนาดต่อผืนเองของม่านม้วน/มู่ลี่ (w.blindPieces)
 * - คิดแยกแต่ละผืน (แม้มีขนาดเท่ากัน 2 ผืน) ขั้นต่ำ 1.5 ตร.ม./ผืน และปัดเศษทศนิยมขึ้นเป็น 1 ตำแหน่งทุกผืน
 */
function calcBlindPiecesTotalSqm(w) {
  const pieces = Array.isArray(w && w.blindPieces) ? w.blindPieces : [];
  if (!pieces.length) return { count: 0, totalWidth: 0, totalSqm: 0, totalSqmStr: '', pieceSqms: [] };
  const style = String((w && (w.curtainStyle1 || w.curtainStyle2)) || '').trim();
  const blindRule = (typeof masterDB !== 'undefined' && masterDB.blinds || []).find(bl => bl.curtainStyle === style)
    || { minSqm: 1.5, roundMode: 'ceil_1dec' };
  const minSqm = Math.max(1.5, parseFloat(blindRule.minSqm) || 1.5);
  const ceil1 = v => Math.ceil((v - 1e-9) * 10) / 10;
  let totalWidth = 0;
  let totalSqm = 0;
  let validCount = 0;
  const pieceSqms = pieces.map(p => {
    const wn = parseFloat(p && p.w) || 0;
    const hn = parseFloat(p && p.h) || 0;
    if (wn > 0) totalWidth += wn;
    if (wn > 0 && hn > 0) {
      validCount++;
      const sqm = Math.max(minSqm, (wn / 100) * (hn / 100));
      const rounded = ceil1(sqm);
      totalSqm += rounded;
      return String(rounded);
    }
    return '';
  });
  totalWidth = Math.round(totalWidth * 100) / 100;
  totalSqm = Math.round(totalSqm * 10) / 10;
  return {
    count: validCount,
    totalWidth,
    totalSqm,
    totalSqmStr: totalSqm > 0 ? String(totalSqm) : '',
    pieceSqms,
    minSqm,
  };
}

/**
 * คำนวณขนาดความกว้างผ้าม่าน, ความสูงผ้าม่าน, จำนวนผืน, จำนวนหน้าผ้า และจำนวนหลา
 * - บานที่ยังไม่ได้ใส่ขนาดหน้าต่าง/ประตู (RW <= 0 และ RH <= 0) จะไม่คำนวณค่าใดๆ ออกมาเลย (ป้องกันไม่ให้แสดง "8 x -1.5")
 * - แบ่งเป็น 2 เกรนหลัก (เกรนม่านทึบ opaque / เกรนม่านโปร่ง sheer) และ 2 การคิดย่อย (แบบย่นสำเร็จ gathered / แบบขึงตึง stretched)
 * - แบบย่นสำเร็จ (เฉพาะม่านจีบและม่านลอน): WC = (RW / P) + OV + SR
 * - แบบขึงตึง (รูปแบบม่านที่เหลือทั้งหมด): WC = (RW * G) / P
 * - เกรนม่านทึบ:
 *     - แบบย่นสำเร็จ: PANELS = PANEL_ROUND((((WC * G) + HEM_SIDE) * P) / FW_FAB)
 *     - แบบขึงตึง:    PANELS = PANEL_ROUND(((WC + HEM_SIDE) * P) / FW_FAB)
 *     - จำนวน Repeat: YR_CNT = CEIL((HC + HEM_TB) / YR) (ใช้เผื่อพับขอบบนล่างแบบมาตรฐาน)
 *     - ปริมาณผ้า (หลา): CEIL1(((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44)
 * - เกรนม่านโปร่ง:
 *     - จำนวนหน้าผ้า (ทั้งย่นสำเร็จและขึงตึง): PANELS = CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB)
 *       (ใช้เผื่อพับขอบบนล่างแบบประหยัดเฉพาะการหาจำนวนหน้าผ้าของเกรนม่านโปร่งที่มีกำหนดค่าแบบประหยัดไว้เท่านั้น นอกนั้นใช้แบบมาตรฐาน)
 *     - ปริมาณผ้าแบบย่นสำเร็จ (หลา): CEIL1((((WC * G) + HEM_SIDE) * P * 1.05) / 91.44)
 *     - ปริมาณผ้าแบบขึงตึง (หลา):    CEIL1(((WC + HEM_SIDE) * P * 1.05) / 91.44)
 */
function computeCurtainLayerByWidthHeight(w, wf, hf, opts = {}) {
  const num = v => {
    const s = String(v ?? '').replace(/\*/g, '').trim();
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };
  const W = num(w.width), H = num(w.height);
  const EL = num(w.extL), ER = num(w.extR), ET = num(w.extT), EB = num(w.extB);
  const RW = opts.overrideRW !== undefined
    ? num(opts.overrideRW)
    : (((w.calcMode === 'manual' || (w.manualFields && (w.manualFields.railW || w.manualFields.railA))) && w.customRailW !== undefined && String(w.customRailW).trim() !== '')
      ? num(w.customRailW)
      : (W + EL + ER));
  const RH = opts.overrideRH !== undefined
    ? num(opts.overrideRH)
    : (((w.calcMode === 'manual' || (w.manualFields && (w.manualFields.railH || w.manualFields.railB))) && w.customRailH !== undefined && String(w.customRailH).trim() !== '')
      ? num(w.customRailH)
      : (H + ET + EB));
  const FW = num(w.fullW), FH = num(w.fullHLeft || w.fullHMid || w.fullHRight || w.fullH);

  const layerKey = opts.layerKey || 'opaque'; // 'opaque' (ชั้น 1) | 'sheer' (ชั้น 2)
  const splitTarget = w.unequalSplitTarget || 'both'; // 'both' | 'opaque' | 'sheer'
  const rawSplitL = (layerKey === 'sheer' && w.unequalLayerRail && (num(w.splitLeft2) > 0 || num(w.splitRight2) > 0))
    ? num(w.splitLeft2)
    : num(w.splitLeft);
  const rawSplitR = (layerKey === 'sheer' && w.unequalLayerRail && (num(w.splitLeft2) > 0 || num(w.splitRight2) > 0))
    ? num(w.splitRight2)
    : num(w.splitRight);
  const hasUnequalSplit = !!(w.unequalSplit && (splitTarget === 'both' || splitTarget === layerKey) && (rawSplitL > 0 || rawSplitR > 0));
  // ป้องกันบานที่ยังไม่ได้ใส่ขนาดหน้าต่าง/ประตูไม่ให้คำนวณตัวเลขใดๆ ออกมาเลย (ห้ามแสดง 8 x -1.5 เด็ดขาด)
  if (RW <= 0 && RH <= 0 && !hasUnequalSplit) {
    return {
      a: '', b: '', n: '', t: '',
      RW: 0, RH: 0, unit1: 'ผืน', unit2: 'หลา',
      details: {},
    };
  }

  const styleName = opts.curtainStyle || (wf && wf.curtainStyle) || '';
  const stdP = getStdCurtainParams(styleName);
  const subCalcType = (wf && wf.subCalcType) || stdP.subCalcType || getDefaultSubCalcType(styleName);

  // จำนวนผืนดึงจากบานหน้าต่าง/ประตูนั้นๆ แทน (ไม่ดึงจากฐานข้อมูลความกว้าง)
  const P = num(opts.pieces) || num(w.pieces1) || (isBlindOrRollerStyle(styleName) ? 1 : 2);
  const RT = num(opts.railTracks) || num(w.railTracks) || ((w.curtainStyle1 && w.curtainStyle2) ? 2 : 1);
  // ระยะย่น, เผื่อพับริม, เผื่อพับขอบบนล่างมาตรฐาน/ประหยัด ใช้จากฐานข้อมูลกลาง (curtains) เพียงแหล่งเดียวทั้งหมด
  const G = (opts.gatherRatio !== undefined && opts.gatherRatio !== '') ? num(opts.gatherRatio) : (stdP.gatherRatio || 2.5);
  const OV = (wf && wf.overlap !== undefined && wf.overlap !== '') ? num(wf.overlap) : stdP.overlap;
  const SR = (wf && wf.sideReturn !== undefined && wf.sideReturn !== '') ? num(wf.sideReturn) : stdP.sideReturn;
  const baseFloorFloat = (hf && hf.floorFloat !== undefined && hf.floorFloat !== '') ? num(hf.floorFloat) : 1;

  const vars = {
    W, H, EL, ER, ET, EB, RW, RH, FW, FH,
    WC: RW > 0 ? RW : 0, HC: RH > 0 ? RH : 0, P, RT, G, OV, SR, FL_BASE: baseFloorFloat,
    FW_FAB: 140, YR: 0,
    HEM_SIDE: stdP.sideHem,
    HEM_TB: stdP.topBottomHem,
    HEM_TB_ECON: stdP.econTopBottomHem || 0,
    HEM_TB_SHEER_PANEL: (stdP.econTopBottomHem > 0) ? stdP.econTopBottomHem : stdP.topBottomHem,
    PANELS: P, YR_CNT: 0,
    PANEL_ROUND_MODE: 'ceil_plus1_if_frac_ge', PANEL_FRAC_TH: 0.9, PANEL_EXTRA_ADD: 1,
  };

  // 1) คำนวณขนาดความกว้างผ้าม่านต่อผืน (a)
  // กรณีแบ่งผืนซ้าย/ขวาไม่เท่ากันบนรางเดียว: ระยะที่แบ่งราง (splitL, splitR) คือขนาดรางของแต่ละผืน
  // นำไปคำนวณขนาดความกว้างผ้าม่านของผืนซ้าย (wcL) และผืนขวา (wcR) ตามสูตรความกว้างม่าน (โดยแต่ละฝั่งคิดเป็น P = 1 ผืน)
  let splitL = rawSplitL;
  let splitR = rawSplitR;
  if (hasUnequalSplit) {
    if (splitL > 0 && splitR <= 0 && RW > splitL) splitR = Math.round((RW - splitL) * 100) / 100;
    if (splitR > 0 && splitL <= 0 && RW > splitR) splitL = Math.round((RW - splitR) * 100) / 100;
  }

  let a = '';
  let wcLNum = 0;
  let wcRNum = 0;
  if (hasUnequalSplit && (splitL > 0 || splitR > 0)) {
    const evalPieceWidth = spanRW => {
      if (spanRW <= 0) return '0';
      if (wf && wf.widthExp) {
        // ในการแบ่งรางเป็นผืนซ้าย/ขวา แต่ละช่วงแบ่งคือขนาดรางของผืนนั้น (คิดต่อ 1 ผืน แต่ยังบวกเกย+อ้อมข้างตามสูตรปกติ ซึ่งในสูตรเดิม ((RW / P) + OV + SR) เมื่อ RW_total แบ่ง 2 ผืน P=2 คือ RW_piece + OV + SR)
        const pVars = Object.assign({}, vars, { RW: spanRW, WC: spanRW, P: 1 });
        return evalFormulaExpr(wf.widthExp, pVars, wf.roundMode || 'none') || String(spanRW);
      }
      return String(spanRW);
    };
    const wcLStr = evalPieceWidth(splitL);
    const wcRStr = evalPieceWidth(splitR);
    wcLNum = num(wcLStr);
    wcRNum = num(wcRStr);
    a = `${wcLStr}/${wcRStr}`;
    vars.P = 2;
    vars.WC = (wcLNum + wcRNum) / 2;
  } else if (RW > 0 && wf && wf.widthExp) {
    a = evalFormulaExpr(wf.widthExp, vars, wf.roundMode || 'none');
    vars.WC = num(a) || RW;
  } else if (RW > 0) {
    a = String(RW);
    vars.WC = RW;
  } else {
    a = '';
    vars.WC = 0;
  }

  // 2) คำนวณขนาดความสูงผ้าม่าน (b) — รวมระยะลอย/กองพื้นตามที่เลือกบนแปลน (บวกเพิ่มยิ่งลอย, ลบเพิ่มยิ่งกองพื้น — ไม่ดูเครื่องหมาย)
  // หากเป็นม่านม้วน/มู่ลี่ และไม่มีสูตรลดความสูงกำหนดไว้ (hf == null) ให้ใช้ความสูงเต็มตามขนาดที่วัดโดยไม่ลดความสูง
  let b = '';
  let hcNum = 0;
  const isBlindNoDeduct = (isBlindOrRollerStyle(styleName) || !!(opts.blindItem || opts.blindRule)) && !hf;
  const noRailDeduct = isBlindNoDeduct ? 0 : getNoRailHeightDeduction(w);
  const extraHeightDeduct = isBlindNoDeduct ? 0 : num(opts.extraHeightDeduct);
  const totalHeightDeduct = noRailDeduct + extraHeightDeduct;
  const floorDelta = (opts.skipFloorAdjust || isBlindNoDeduct) ? 0 : getWindowFloorDelta(w, baseFloorFloat);
  if (RH > 0) {
    if (hf && hf.heightExp) {
      b = evalFormulaExpr(hf.heightExp, vars, hf.roundMode || 'none');
    } else {
      b = String(RH);
    }
    hcNum = num(b);
    if ((totalHeightDeduct !== 0 || floorDelta !== 0) && hcNum > 0) {
      hcNum = Math.max(0, Math.round((hcNum - totalHeightDeduct + floorDelta) * 100) / 100);
      b = String(hcNum);
    }
    if (hcNum <= 0) {
      b = '';
      hcNum = 0;
    }
  }
  vars.HC = hcNum;

  const effPieces = hasUnequalSplit ? 2 : P;

  // 3) กรณีเป็นม่านม้วน / มู่ลี่ -> คิดแยกทีละชุด (แม้ขนาดเดียวกัน 2 ผืน) ขั้นต่ำ 1.5 ตร.ม./ผืน และปัดเศษทศนิยมขึ้นเป็น 1 ตำแหน่งทุกชุด
  const passedBlind = opts.blindItem || opts.blindRule || null;
  if (isBlindOrRollerStyle(styleName) || passedBlind) {
    const blindRule = passedBlind || (masterDB.blinds || []).find(bl => bl.curtainStyle === styleName) || { minSqm: 1.5, roundMode: 'ceil_1dec' };
    const minSqm = Math.max(1.5, num(blindRule.minSqm) || 1.5);
    const ceil1 = v => Math.ceil((v - 1e-9) * 10) / 10;
    let totalSqm = 0;
    if (hasUnequalSplit && (splitL > 0 || splitR > 0)) {
      const sqmL = (splitL > 0 && vars.HC > 0) ? ceil1(Math.max(minSqm, (splitL / 100) * (vars.HC / 100))) : 0;
      const sqmR = (splitR > 0 && vars.HC > 0) ? ceil1(Math.max(minSqm, (splitR / 100) * (vars.HC / 100))) : 0;
      totalSqm = Math.round((sqmL + sqmR) * 10) / 10;
    } else if (vars.WC > 0 && vars.HC > 0) {
      const sqmPerPiece = ceil1(Math.max(minSqm, (vars.WC / 100) * (vars.HC / 100)));
      totalSqm = Math.round((sqmPerPiece * effPieces) * 10) / 10;
    }
    const t = totalSqm > 0 ? String(totalSqm) : '';
    return {
      a, b, n: (RW > 0 || RH > 0 || hasUnequalSplit) ? String(effPieces) : '', t,
      RW, RH, unit1: 'ผืน', unit2: 'ตร.ม.',
      details: { mode: 'blind_sqm', minSqm, floorDelta },
    };
  }

  // 4) คำนวณปริมาณผ้า แยก 2 เกรนหลัก ('opaque' / 'sheer') และ 2 การคิดย่อย ('gathered' / 'stretched')
  // หากยังไม่ได้เลือกผ้า ระบบจะยังไม่คำนวณจำนวนหน้าผ้าและปริมาณผ้าให้
  const fabricItem = opts.fabric || opts.fabricItem || null;
  const hasSelectedFabric = !!(fabricItem && (num(fabricItem.fabricWidth) > 0 || String(fabricItem.name || '').trim()));
  if (!hasSelectedFabric && !opts.allowDefaultFabric) {
    return {
      a,
      b,
      n: (RW > 0 || RH > 0 || hasUnequalSplit) ? String(effPieces) : '',
      t: '',
      RW,
      RH,
      unit1: 'ผืน',
      unit2: 'หลา',
      details: {
        mode: opts.grainType || 'opaque',
        subCalcType,
        fabricMissing: true,
        panelCount: 0,
        yardsOnly: '',
        noRailDeduct,
        floorDelta,
      },
    };
  }

  let grainType = opts.grainType || 'opaque';
  const fabW = num(fabricItem && fabricItem.fabricWidth) || (grainType === 'sheer' ? 300 : 140);
  // บังคับกฎ: เฉพาะผ้าที่มีขนาดหน้าผ้าเกิน 270 ซม. ขึ้นไปถึงใช้เกรนม่านโปร่งได้
  if (grainType === 'sheer' && !canFabricUseSheerGrain(fabW)) {
    grainType = 'opaque';
  }

  const fRule = opts.fabricRule
    || getFabricCalcRulesForWindow(styleName, grainType)[0]
    || defaultMasterDB().fabricCalcRules[0];

  const ruleSubCalc = stdP.subCalcType || (fRule && fRule.subCalcType) || subCalcType;
  vars.FW_FAB = fabW;
  vars.YR = (fabricItem && fabricItem.yRepeat !== undefined && fabricItem.yRepeat !== '')
    ? num(fabricItem.yRepeat)
    : 0;
  // ใช้ค่า ระยะย่น, พับริม, พับขอบบนล่างมาตรฐาน, พับขอบบนล่างประหยัด จากฐานข้อมูลกลาง (curtains) แหล่งเดียว
  vars.G = G;
  vars.HEM_SIDE = stdP.sideHem;
  vars.HEM_TB = stdP.topBottomHem;
  vars.HEM_TB_ECON = stdP.econTopBottomHem || 0;
  vars.HEM_TB_SHEER_PANEL = (grainType === 'sheer' && vars.HEM_TB_ECON > 0) ? vars.HEM_TB_ECON : vars.HEM_TB;

  const pRoundMode = (fRule && fRule.panelRoundMode) || (grainType === 'sheer' ? 'ceil' : 'ceil_plus1_if_frac_ge');
  const pFracTh = (fRule && fRule.panelFracThreshold !== undefined && fRule.panelFracThreshold !== '') ? num(fRule.panelFracThreshold) : 0.9;
  const pExtraAdd = (fRule && fRule.panelExtraAdd !== undefined && fRule.panelExtraAdd !== '') ? parseInt(fRule.panelExtraAdd, 10) : (grainType === 'sheer' ? 0 : 1);

  vars.PANEL_ROUND_MODE = pRoundMode;
  vars.PANEL_FRAC_TH = pFracTh;
  vars.PANEL_EXTRA_ADD = pExtraAdd;

  // การคำนวณจำนวน Repeat ของเกรนม่านทึบ = CEIL((HC + HEM_TB) / YR) (ใช้เผื่อพับขอบบนล่างแบบมาตรฐานเสมอ)
  const yrCntStr = (grainType === 'opaque' && vars.HC > 0)
    ? ((fRule && fRule.yRepeatCountExp)
      ? evalFormulaExpr(fRule.yRepeatCountExp, vars, 'ceil_int')
      : (vars.YR > 0 ? String(Math.ceil((vars.HC + vars.HEM_TB) / vars.YR)) : '0'))
    : '0';
  vars.YR_CNT = num(yrCntStr);

  // ฟังก์ชันย่อยคำนวณจำนวนหน้าและจำนวนหลาดิบของแต่ละส่วน
  const calcPartPanelsAndYards = (partWC, partPieces) => {
    if (partWC <= 0 || vars.HC <= 0) return { panels: 0, rawYards: 0 };
    const partVars = Object.assign({}, vars, { WC: partWC, P: partPieces });
    let partPanels = 0;
    if (fRule && fRule.panelCountExp) {
      partPanels = num(evalFormulaExpr(fRule.panelCountExp, partVars, 'ceil_int'));
    } else if (grainType === 'sheer') {
      partPanels = Math.ceil(((vars.HC + vars.HEM_TB_SHEER_PANEL) / Math.max(1, vars.FW_FAB)) - 1e-9);
    } else if (ruleSubCalc === 'gathered') {
      const rawTotal = (((partWC * vars.G) + vars.HEM_SIDE) * partPieces) / Math.max(1, vars.FW_FAB);
      partPanels = applyPanelRounding(rawTotal, pRoundMode, pFracTh, pExtraAdd);
    } else {
      const rawTotal = ((partWC + vars.HEM_SIDE) * partPieces) / Math.max(1, vars.FW_FAB);
      partPanels = applyPanelRounding(rawTotal, pRoundMode, pFracTh, pExtraAdd);
    }
    partVars.PANELS = partPanels || 1;
    let rawYards = 0;
    if (fRule && fRule.qtyExp) {
      rawYards = num(evalFormulaExpr(fRule.qtyExp, partVars, 'none'));
    } else if (grainType === 'sheer') {
      rawYards = ruleSubCalc === 'gathered'
        ? ((((partWC * vars.G) + vars.HEM_SIDE) * partPieces * 1.05) / 91.44)
        : (((partWC + vars.HEM_SIDE) * partPieces * 1.05) / 91.44);
    } else {
      const hPerPanel = vars.YR > 0 ? (vars.YR_CNT * vars.YR) : (vars.HC + vars.HEM_TB);
      rawYards = (hPerPanel * partVars.PANELS * 1.05) / 91.44;
    }
    return { panels: partVars.PANELS, rawYards };
  };

  let totalPanels = 0;
  let totalRawYards = 0;

  if (hasUnequalSplit && (wcLNum > 0 || wcRNum > 0) && vars.HC > 0) {
    // คิดแยกผืนซ้าย (จากความกว้างผ้าผืนซ้าย wcLNum) และ ผืนขวา (จากความกว้างผ้าผืนขวา wcRNum) แล้วนำมารวมกัน
    const leftRes = wcLNum > 0 ? calcPartPanelsAndYards(wcLNum, 1) : { panels: 0, rawYards: 0 };
    const rightRes = wcRNum > 0 ? calcPartPanelsAndYards(wcRNum, 1) : { panels: 0, rawYards: 0 };
    totalPanels = grainType === 'sheer'
      ? Math.max(leftRes.panels, rightRes.panels)
      : (leftRes.panels + rightRes.panels);
    totalRawYards = leftRes.rawYards + rightRes.rawYards;
    vars.PANELS = totalPanels;
  } else if (vars.WC > 0 && vars.HC > 0) {
    const res = calcPartPanelsAndYards(vars.WC, effPieces);
    totalPanels = res.panels;
    totalRawYards = res.rawYards;
    vars.PANELS = totalPanels;
  }

  const yardMode = opts.yardMode || 'exact';
  const extraYards = num(opts.extraYards);
  const yardsStr = (vars.WC > 0 && vars.HC > 0 && totalRawYards > 0)
    ? applyYardDisplayMode(totalRawYards, yardMode, extraYards, (fRule && fRule.roundMode) || 'ceil_1dec')
    : '';

  // แสดงจำนวนหน้าผ้า/จำนวนหลา ในช่องหลา เช่น "5/8.9"
  let t = '';
  if (yardsStr) {
    t = totalPanels > 0 ? `${totalPanels}/${yardsStr}` : yardsStr;
  }

  return {
    a, b, n: (RW > 0 || RH > 0 || hasUnequalSplit) ? String(effPieces) : '', t,
    RW, RH, unit1: 'ผืน', unit2: 'หลา',
    details: {
      mode: grainType,
      subCalcType: ruleSubCalc,
      fabricWidth: vars.FW_FAB,
      panelCount: totalPanels,
      yardsOnly: yardsStr,
      rawYards: Math.round(totalRawYards * 100) / 100,
      yRepeat: vars.YR,
      yRepeatCount: vars.YR_CNT,
      sideHem: vars.HEM_SIDE,
      topBottomHem: vars.HEM_TB,
      econTopBottomHem: vars.HEM_TB_ECON,
      gatherRatio: vars.G,
      noRailDeduct,
    },
  };
}

/**
 * คำนวณแถวรางม่านของบานหน้าต่าง/ประตู (w.c1)
 * - กรณีไม่เอารางม่าน / ใช้รางเดิม (w.noRail): แสดงข้อความ "ใช้รางเดิม" หรือ "ไม่เอาราง" ในช่องจำนวนรางด้วย
 * - รางขายขั้นต่ำ 1 เมตรต่อราง (เช่น ขนาดราง 80 ซม. -> 1 เมตร ไม่ใช่ 0.8 เมตร)
 * - รองรับหน่วยขายราง: เมตร, ชุด, ชุด/เมตร, เมตร/ชุด, ตร.ม.
 * - รองรับหน่วยนับราง: ชั้น หรือ ผืน
 */
function computeWindowRailRow(w, sh = null) {
  const num = v => {
    const s = String(v ?? '').replace(/\*/g, '').trim();
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };
  const s1 = (w.curtainStyle1 || '').trim();
  const s2 = (w.curtainStyle2 || '').trim();
  const isBlind = isBlindOrRollerStyle(s1 || s2);
  const countUnit = w.railCountUnit || (isBlind ? 'ผืน' : 'ชั้น');

  // กรณีไม่รับรางม่าน หรือใช้รางเดิม -> แสดงข้อความในช่องจำนวนรางด้วย เช่น "ใช้รางเดิม" หรือ "ไม่เอาราง"
  if (w.noRail) {
    const statusText = (w.noRailStatus && String(w.noRailStatus).trim()) || 'ใช้รางเดิม';
    const deduct = getNoRailHeightDeduction(w);
    return {
      a: deduct > 0 ? `${statusText} (ลดสูง ${deduct} ซม.)` : statusText,
      b: '',
      n: '-',
      t: statusText,
      RW: 0,
      RH: 0,
      countUnit,
      totalUnit: '',
      isNoRail: true,
    };
  }

  const W = num(w.width), H = num(w.height);
  const EL = num(w.extL), ER = num(w.extR), ET = num(w.extT), EB = num(w.extB);
  const isManualRW = ((w.calcMode === 'manual' || (w.manualFields && (w.manualFields.railW || w.manualFields.railA))) && w.customRailW !== undefined && String(w.customRailW).trim() !== '');
  const isManualRH = ((w.calcMode === 'manual' || (w.manualFields && (w.manualFields.railH || w.manualFields.railB))) && w.customRailH !== undefined && String(w.customRailH).trim() !== '');
  const RW = isManualRW ? num(w.customRailW) : (W + EL + ER);
  const RH = isManualRH ? num(w.customRailH) : (H + ET + EB);

  const hasUnequalLayerW = !!(w.unequalLayerRail && (num(w.railW1) > 0 || num(w.railW2) > 0));
  const hasUnequalLayerH = !!(w.unequalLayerRail && (num(w.railH1) > 0 || num(w.railH2) > 0));

  if (RW <= 0 && RH <= 0 && !hasUnequalLayerW && !hasUnequalLayerH) {
    return {
      a: '', b: '', n: '', t: '',
      RW: 0, RH: 0, countUnit, totalUnit: isBlind ? 'ตร.ม.' : 'เมตร', isNoRail: false,
    };
  }

  const effTracks = (w.unequalLayerRail ? 2 : 0) || num(w.railTracks) || ((s1 && s2) ? 2 : 1);

  // ค้นหาข้อมูลรางในฐานข้อมูลตามประเภทรางม่านของบานหรือตารางรางในหน้าแปลน
  const findRailDbItem = rodCat => {
    if (w.railModel) {
      const byModel = (masterDB.rails || []).find(r => r.name === w.railModel);
      if (byModel) return byModel;
    }
    if (!rodCat) return null;
    if (sh && Array.isArray(sh.rails)) {
      for (const sr of sh.rails) {
        if (sr && sr.type) {
          const foundByName = (masterDB.rails || []).find(r => r.name === sr.type);
          if (foundByName && (!rodCat || foundByName.rodCategory === rodCat || sr.type.includes(rodCat))) return foundByName;
        }
      }
    }
    return (masterDB.rails || []).find(r => r.rodCategory === rodCat || r.name === rodCat) || null;
  };

  const railDb = findRailDbItem(w.rodType);
  const setRanges = (w.railSetRanges && String(w.railSetRanges).trim())
    || (railDb && railDb.setRanges)
    || '0-2.00=1, 2.01-2.99=1, 3.00-4.00=2';

  let totalUnit = (w.railUnit && String(w.railUnit).trim()) || '';
  if (!totalUnit) {
    if (isBlind) {
      totalUnit = 'ตร.ม.';
    } else if (railDb && railDb.sellUnit) {
      totalUnit = railDb.sellUnit;
    } else if (w.rodType === 'รางโชว์') {
      totalUnit = 'ชุด';
    } else {
      totalUnit = 'เมตร';
    }
  }

  // ขั้นต่ำความยาวรางต่อชุด/ราง (เมตร): กำหนดเองได้ในบาน (w.railMinLength) หรือในฐานข้อมูลราง (railDb.minLength) เช่น 2.00 หรือ 1.00 เมตร
  const customMinLen = num(w.railMinLength);
  const dbMinLen = railDb && num(railDb.minLength) > 0 ? num(railDb.minLength) : 0;
  const minLenPerRail = customMinLen > 0 ? customMinLen : (dbMinLen > 0 ? dbMinLen : (totalUnit === 'ชุด' ? 2.0 : 1.0));

  const rw1 = hasUnequalLayerW ? (num(w.railW1) || RW) : RW;
  const rw2 = hasUnequalLayerW ? (num(w.railW2) || RW) : RW;
  const rh1 = hasUnequalLayerH ? (num(w.railH1) || RH) : RH;
  const rh2 = hasUnequalLayerH ? (num(w.railH2) || RH) : RH;

  // ปัดความยาวรางเป็นเต็ม 10 ซม. (0.1 เมตร) เช่น 184 ซม. -> 1.9 เมตร (ขั้นต่ำตาม minLenPerRail)
  const roundUpRailMeters10cm = cm => (cm > 0 ? Math.ceil((cm - 1e-9) / 10) / 10 : 0);
  const rawM1 = rw1 > 0 ? (rw1 / 100) : 0;
  const rawM2 = rw2 > 0 ? (rw2 / 100) : 0;
  const effM1 = rw1 > 0 ? Math.max(minLenPerRail, rawM1) : 0;
  const effM2 = rw2 > 0 ? Math.max(minLenPerRail, rawM2) : 0;
  const effM10_1 = rw1 > 0 ? Math.max(minLenPerRail, roundUpRailMeters10cm(rw1)) : 0;
  const effM10_2 = rw2 > 0 ? Math.max(minLenPerRail, roundUpRailMeters10cm(rw2)) : 0;
  const totalMeters = effTracks >= 2
    ? Math.round((effM10_1 + effM10_2) * 10) / 10
    : Math.round(effM10_1 * effTracks * 10) / 10;
  const sets1 = rw1 > 0 ? (evalRailSetBrackets(effM1, setRanges).sets || 1) : 0;
  const sets2 = rw2 > 0 ? (evalRailSetBrackets(effM2, setRanges).sets || 1) : 0;
  const singleSets = sets1;
  const totalSets = effTracks >= 2 ? (sets1 + sets2) : (sets1 * effTracks);

  let t = '';
  if (rw1 > 0 || rw2 > 0) {
    if (totalUnit === 'ชุด') {
      // เช่น กว้าง 285 -> 2.85 1 ชุด (เป็นเมตร พร้อมขั้นต่ำ เช่น 2.00 หรือ 1.00)
      const fmtM1 = effM1.toFixed(2);
      const fmtM2 = effM2.toFixed(2);
      const mDisp = (hasUnequalLayerW && rw1 !== rw2) ? `${fmtM1}/${fmtM2}` : fmtM1;
      t = `${mDisp} ${totalSets}`;
    } else if (totalUnit === 'ชุด/เมตร') {
      t = `${singleSets}/${effM10_1}`;
    } else if (totalUnit === 'เมตร/ชุด') {
      t = `${effM10_1}/${singleSets}`;
    } else if (totalUnit === 'ตร.ม.') {
      const blindRule = (masterDB.blinds || []).find(bl => bl.curtainStyle === (s1 || s2)) || { minSqm: 1.5, roundMode: 'ceil_1dec' };
      const minSqm = Math.max(1.5, num(blindRule.minSqm) || 1.5);
      const rawSqm = (rw1 / 100) * (Math.max(0, rh1) / 100);
      const sqm = (rw1 > 0 && rh1 > 0) ? Math.max(minSqm, rawSqm) * effTracks : 0;
      t = sqm > 0 ? applyRoundMode(sqm, blindRule.roundMode || 'ceil_1dec') : '';
    } else {
      t = String(totalMeters);
    }
  }

  let aStr = '';
  if (hasUnequalLayerW && rw1 > 0 && rw2 > 0 && rw1 !== rw2) {
    const s1Star = (num(w.railW1) > 0 || isManualRW) ? '*' : '';
    const s2Star = (num(w.railW2) > 0 || isManualRW) ? '*' : '';
    aStr = `${rw1}${s1Star}/${rw2}${s2Star}`;
  } else if (rw1 > 0) {
    const wStar = (isManualRW || (hasUnequalLayerW && num(w.railW1) > 0)) ? '*' : '';
    aStr = `${rw1}${wStar}`;
  }

  let bStr = '';
  if (hasUnequalLayerH && rh1 > 0 && rh2 > 0 && rh1 !== rh2) {
    const h1Star = (num(w.railH1) > 0 || isManualRH) ? '*' : '';
    const h2Star = (num(w.railH2) > 0 || isManualRH) ? '*' : '';
    bStr = `${rh1}${h1Star}/${rh2}${h2Star}`;
  } else if (rh1 > 0) {
    const hStar = (isManualRH || (hasUnequalLayerH && num(w.railH1) > 0)) ? '*' : '';
    bStr = `${rh1}${hStar}`;
  }

  return {
    a: aStr,
    b: bStr,
    n: (rw1 > 0 || rh1 > 0 || rw2 > 0 || rh2 > 0) ? String(effTracks) : '',
    t,
    RW: rw1,
    RH: rh1,
    RW2: rw2,
    RH2: rh2,
    countUnit,
    totalUnit,
    isNoRail: false,
  };
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

/**
 * Combine opaque and sheer curtain style names with " / " when different.
 * หากเลือกเย็บประกบ (lining1 / lining2) จะเติมคำว่า "เย็บประกบ" ต่อท้ายรูปแบบผ้าม่านของชั้นที่เลือก เช่น ม่านจีบเย็บประกบ หรือ ม่านลอนเทปเย็บประกบ / ม่านจีบ
 * หากเลือกบานนั้นๆ เป็นม่านจั่ว (w.specialType === 'gable') จะแสดง "ม่านจั่ว" กำกับไว้ด้วยเสมอ
 */
function formatCurtainType(w) {
  const s1Raw = (w.curtainStyle1 || '').trim();
  const s2Raw = (w.curtainStyle2 || '').trim();
  const s1 = (s1Raw && w.lining1 && !s1Raw.includes('เย็บประกบ')) ? `${s1Raw}เย็บประกบ` : s1Raw;
  const s2 = (s2Raw && w.lining2 && !s2Raw.includes('เย็บประกบ')) ? `${s2Raw}เย็บประกบ` : s2Raw;
  let base = '';
  if (s1 && s2 && s1 !== s2) base = `${s1} / ${s2}`;
  else if (s1) base = s1;
  else if (s2) base = s2;
  else base = (w.curtainType || '').trim();

  if (w && w.specialType === 'gable') {
    if (!base) return 'ม่านจั่ว';
    if (!base.includes('ม่านจั่ว')) return `${base} (ม่านจั่ว)`;
  }
  return base;
}

/* ---------------- Modal UI for Master DB (Admin Only + Per-Tab TXT/CSV Import & Pattern) ---------------- */
const DB_IMPORT_SCHEMAS = {
  staff: {
    title: 'ฐานข้อมูลพนักงาน & ผู้ใช้งาน (Login)',
    pattern: 'username, password, role, name, dept, branch',
    desc: 'คอลัมน์: รหัสผู้ใช้ (Username), รหัสผ่าน (Password), สิทธิ์ (admin หรือ staff), ชื่อพนักงาน, แผนก, สาขา',
    example: [
      'username, password, role, name, dept, branch',
      'T58121, Admin, admin, นฤชา, ขาย, สาขาเซ็นทรัลลาดพร้าว',
      'EMP001, 1234, staff, สมชาย ใจดี, ขาย, สาขาสยามพารากอน',
    ].join('\n'),
    headers: ['username', 'รหัสผู้ใช้', 'user'],
    parseRow(cols, idx) {
      if (!cols[0] && !cols[3]) return null;
      return {
        id: 'st_imp_' + Date.now() + '_' + idx,
        username: cols[0] || '',
        password: cols[1] || '1234',
        role: String(cols[2] || '').toLowerCase() === 'admin' ? 'admin' : 'staff',
        name: cols[3] || cols[0] || '',
        dept: cols[4] || '',
        branch: cols[5] || '',
      };
    },
  },
  fabrics: {
    title: 'ฐานข้อมูลผ้า',
    pattern: 'name, design, fabricWidth, yRepeat, calcMode',
    desc: 'คอลัมน์: ชื่อผ้า, ดีไซน์ผ้า, ขนาดหน้าผ้า(ซม.), Y-Repeat(ซม.), รูปแบบเกรน (opaque / both / sheer — เฉพาะหน้าผ้า > 270 ซม. จึงใช้ both หรือ sheer ได้)',
    example: [
      'name, design, fabricWidth, yRepeat, calcMode',
      'PASAYA Blackout, BO-140, 140, 0, opaque',
      'PASAYA Wide Width, WW-300, 300, 0, both',
      'PASAYA Jacquard, JQ-280, 280, 32, both',
    ].join('\n'),
    headers: ['name', 'ชื่อผ้า', 'cs des'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      const fw = parseFloat(cols[2]) || 140;
      const yr = parseFloat(cols[3]) || 0;
      const rawMode = String(cols[4] || 'opaque').toLowerCase();
      const allowSheer = canFabricUseSheerGrain(fw);
      const calcMode = allowSheer
        ? (rawMode === 'sheer' ? 'sheer' : (rawMode === 'both' ? 'both' : 'opaque'))
        : 'opaque';
      return {
        id: 'fab_imp_' + Date.now() + '_' + idx,
        name: cols[0],
        design: cols[1] || '',
        fabricWidth: fw,
        yRepeat: yr,
        calcMode,
      };
    },
  },
  widthFormulas: {
    title: 'ฐานข้อมูลขนาดความกว้างผ้าม่าน (ไม่ต้องระบุจำนวนผืน — ดึงจำนวนผืนจากบานที่เลือกอัตโนมัติ)',
    pattern: 'curtainStyle, subCalcType, layerType, rodType, railTracks, label, overlap, sideReturn, widthExp, roundMode',
    desc: 'คอลัมน์: รูปแบบผ้าม่าน, การคิดย่อย(gathered=ย่นสำเร็จ / stretched=ขึงตึง), ประเภทม่าน(both/opaque/sheer), ประเภทรางม่าน(*), จำนวนชั้นราง(* หรือ 1/2), ชื่อเงื่อนไข, เผื่อเกย(OV), เผื่ออ้อมข้าง(SR), สูตรความกว้างผ้าต่อผืน, การปัดเศษ (จำนวนผืน P และระยะย่น G ดึงจากบาน/ฐานข้อมูลกลางอัตโนมัติ)',
    example: [
      'curtainStyle, subCalcType, layerType, rodType, railTracks, label, overlap, sideReturn, widthExp, roundMode',
      'ม่านจีบ, gathered, both, *, *, ม่านจีบ — แบบย่นสำเร็จ (เกย 8 อ้อมข้าง 8), 8, 8, ((RW / P) + OV + SR), ceil_int',
      'ม่านลอน, gathered, both, *, *, ม่านลอน — แบบย่นสำเร็จ (เกย 8 อ้อมข้าง 8), 8, 8, ((RW / P) + OV + SR), ceil_int',
      'ม่านตาไก่, stretched, both, *, *, ม่านตาไก่ — แบบขึงตึง, 0, 0, ((RW * G) / P), ceil_int',
    ].join('\n'),
    headers: ['curtainstyle', 'รูปแบบผ้าม่าน', 'รูปแบบม่าน'],
    parseRow(cols, idx) {
      if (!cols[0] && !cols[1]) return null;
      const parseLayer = v => {
        const s = String(v || '').trim().toLowerCase();
        if (s === 'opaque' || s === 'ม่านทึบ' || s === 'ทึบ') return 'opaque';
        if (s === 'sheer' || s === 'ม่านโปร่ง' || s === 'โปร่ง') return 'sheer';
        return 'both';
      };
      if (cols.length >= 10) {
        const subCalc = cols[1] === 'stretched' || cols[1] === 'gathered' ? cols[1] : getDefaultSubCalcType(cols[0]);
        return {
          id: 'wf_imp_' + Date.now() + '_' + idx,
          curtainStyle: cols[0] || '*',
          subCalcType: subCalc,
          layerType: parseLayer(cols[2]),
          rodType: cols[3] || '*',
          railTracks: cols[4] || '*',
          pieces: '*',
          label: cols[5] || cols[0] || 'เงื่อนไขความกว้าง',
          railWidth: 'RW',
          overlap: cols[6] !== undefined && cols[6] !== '' ? parseFloat(cols[6]) : 8,
          sideReturn: cols[7] !== undefined && cols[7] !== '' ? parseFloat(cols[7]) : 8,
          widthExp: cols[8] || (subCalc === 'stretched' ? '((RW * G) / P)' : '((RW / P) + OV + SR)'),
          roundMode: cols[9] || 'ceil_int',
        };
      }
      const subCalc = getDefaultSubCalcType(cols[0]);
      return {
        id: 'wf_imp_' + Date.now() + '_' + idx,
        curtainStyle: cols[0] || '*',
        subCalcType: subCalc,
        layerType: 'both',
        rodType: '*',
        railTracks: '*',
        pieces: '*',
        label: cols[1] || cols[0] || 'เงื่อนไขความกว้าง',
        railWidth: 'RW',
        overlap: cols[4] !== undefined && cols[4] !== '' ? parseFloat(cols[4]) : 8,
        sideReturn: cols[5] !== undefined && cols[5] !== '' ? parseFloat(cols[5]) : 8,
        widthExp: cols[6] || (subCalc === 'stretched' ? '((RW * G) / P)' : '((RW / P) + OV + SR)'),
        roundMode: cols[7] || 'ceil_int',
      };
    },
  },
  heightFormulas: {
    title: 'ฐานข้อมูลขนาดความสูงผ้าม่าน (กำหนดระยะลอยจากพื้นมาตรฐาน FL_BASE = 1 ซม.)',
    pattern: 'curtainStyle, rodType, railTracks, pieces, hookSize, floorFloat, label, heightExp, roundMode',
    desc: 'คอลัมน์: รูปแบบผ้าม่าน, ประเภทรางม่าน, จำนวนชั้นราง(*), จำนวนผืน(*), ขนาดตะขอ(*), ระยะลอยจากพื้นมาตรฐาน(ซม. ค่าเริ่มต้น 1), ชื่อเงื่อนไขความสูง, สูตรความสูงผ้า, การปัดเศษ',
    example: [
      'curtainStyle, rodType, railTracks, pieces, hookSize, floorFloat, label, heightExp, roundMode',
      'ม่านจีบ, รางม่านจีบ, *, *, No.5, 1, ม่านจีบ + รางม่านจีบ + ตะขอ No.5 (หักตะขอ 1.5 + ลอยพื้น 1 ซม.), RH - 1.5 - FL_BASE, none',
      'ม่านลอน, รางม่านลอน, *, *, *, 1, ม่านลอน + รางม่านลอน (หักราง 2.5 + ลอยพื้น 1 ซม.), RH - 2.5 - FL_BASE, none',
    ].join('\n'),
    headers: ['curtainstyle', 'รูปแบบผ้าม่าน', 'รูปแบบม่าน'],
    parseRow(cols, idx) {
      if (!cols[0] && !cols[3]) return null;
      if (cols.length >= 9) {
        return {
          id: 'hf_imp_' + Date.now() + '_' + idx,
          curtainStyle: cols[0] || '*',
          rodType: cols[1] || '*',
          railTracks: cols[2] || '*',
          pieces: cols[3] || '*',
          hookSize: cols[4] || '*',
          floorFloat: cols[5] !== undefined && cols[5] !== '' ? parseFloat(cols[5]) : 1,
          label: cols[6] || 'เงื่อนไขความสูง',
          heightExp: cols[7] || 'RH - FL_BASE',
          roundMode: cols[8] || 'none',
        };
      }
      if (cols.length >= 8) {
        return {
          id: 'hf_imp_' + Date.now() + '_' + idx,
          curtainStyle: cols[0] || '*',
          rodType: cols[1] || '*',
          railTracks: cols[2] || '*',
          pieces: cols[3] || '*',
          hookSize: cols[4] || '*',
          floorFloat: 1,
          label: cols[5] || 'เงื่อนไขความสูง',
          heightExp: cols[6] || 'RH - FL_BASE',
          roundMode: cols[7] || 'none',
        };
      }
      return {
        id: 'hf_imp_' + Date.now() + '_' + idx,
        curtainStyle: cols[0] || '*',
        rodType: cols[1] || '*',
        railTracks: '*',
        pieces: '*',
        hookSize: cols[2] || '*',
        floorFloat: 1,
        label: cols[3] || 'เงื่อนไขความสูง',
        heightExp: cols[4] || 'RH - FL_BASE',
        roundMode: cols[5] || 'none',
      };
    },
  },
  fabricCalcRules: {
    title: 'ฐานข้อมูลคำนวณปริมาณผ้า (ดึงระยะย่น, พับริม, พับบนล่างมาตรฐาน/ประหยัด จากฐานข้อมูลกลางรูปแบบผ้าม่านแหล่งเดียว)',
    pattern: 'curtainStyle, grainType, subCalcType, label, panelRoundMode, panelFracThreshold, panelExtraAdd, panelCountExp, yRepeatCountExp, qtyExp, roundMode',
    desc: 'คอลัมน์: รูปแบบม่าน, เกรนหลัก(opaque/sheer), การคิดย่อย(gathered/stretched), ชื่อสูตร, โหมดปัดหน้าผ้า, เศษทศนิยม(0.9), +เพิ่มหน้า(1), สูตรจำนวนหน้า(PANELS), สูตร Repeat(YR_CNT), สูตรปริมาณผ้า(หลา), การปัดเศษ',
    example: [
      'curtainStyle, grainType, subCalcType, label, panelRoundMode, panelFracThreshold, panelExtraAdd, panelCountExp, yRepeatCountExp, qtyExp, roundMode',
      'ม่านจีบ, opaque, gathered, เกรนม่านทึบ (แบบย่นสำเร็จ) - ม่านจีบ, ceil_plus1_if_frac_ge, 0.9, 1, PANEL_ROUND((((WC * G) + HEM_SIDE) * P) / FW_FAB), YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0, ((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44, ceil_1dec',
      'ม่านจีบ, sheer, gathered, เกรนม่านโปร่ง (แบบย่นสำเร็จ) - ม่านจีบ, ceil, 0.9, 0, CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB), 0, (((WC * G) + HEM_SIDE) * P * 1.05) / 91.44, ceil_1dec',
    ].join('\n'),
    headers: ['curtainstyle', 'รูปแบบผ้าม่าน', 'รูปแบบม่าน'],
    parseRow(cols, idx) {
      if (!cols[0] && !cols[2]) return null;
      const isSheer = String(cols[1] || '').toLowerCase() === 'sheer' || String(cols[1] || '').includes('โปร่ง');
      const subCalc = cols[2] === 'stretched' || cols[2] === 'gathered' ? cols[2] : getDefaultSubCalcType(cols[0]);
      if (cols.length >= 11) {
        return {
          id: 'fcr_imp_' + Date.now() + '_' + idx,
          curtainStyle: cols[0] || '*',
          grainType: isSheer ? 'sheer' : 'opaque',
          subCalcType: subCalc,
          label: cols[3] || 'สูตรคำนวณปริมาณผ้า',
          panelRoundMode: cols[4] || (isSheer ? 'ceil' : 'ceil_plus1_if_frac_ge'),
          panelFracThreshold: cols[5] !== undefined && cols[5] !== '' ? parseFloat(cols[5]) : 0.9,
          panelExtraAdd: cols[6] !== undefined && cols[6] !== '' ? parseInt(cols[6], 10) : (isSheer ? 0 : 1),
          panelCountExp: cols[7] || (isSheer ? 'CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB)' : (subCalc === 'gathered' ? 'PANEL_ROUND((((WC * G) + HEM_SIDE) * P) / FW_FAB)' : 'PANEL_ROUND(((WC + HEM_SIDE) * P) / FW_FAB)')),
          yRepeatCountExp: cols[8] || (isSheer ? '0' : 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0'),
          qtyExp: cols[9] || (isSheer ? (subCalc === 'gathered' ? '(((WC * G) + HEM_SIDE) * P * 1.05) / 91.44' : '((WC + HEM_SIDE) * P * 1.05) / 91.44') : '((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44'),
          roundMode: cols[10] || 'ceil_1dec',
        };
      }
      return {
        id: 'fcr_imp_' + Date.now() + '_' + idx,
        curtainStyle: cols[0] || '*',
        grainType: isSheer ? 'sheer' : 'opaque',
        subCalcType: subCalc,
        label: cols[2] || 'สูตรคำนวณปริมาณผ้า',
        panelRoundMode: isSheer ? 'ceil' : 'ceil_plus1_if_frac_ge',
        panelFracThreshold: 0.9,
        panelExtraAdd: isSheer ? 0 : 1,
        panelCountExp: isSheer ? 'CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB)' : (subCalc === 'gathered' ? 'PANEL_ROUND((((WC * G) + HEM_SIDE) * P) / FW_FAB)' : 'PANEL_ROUND(((WC + HEM_SIDE) * P) / FW_FAB)'),
        yRepeatCountExp: isSheer ? '0' : 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44',
        roundMode: 'ceil_1dec',
      };
    },
  },
  rails: {
    title: 'ฐานข้อมูลรางม่าน (แยกออกจากอุปกรณ์เสริม • กำหนดหน่วยขาย เมตร หรือ ชุด พร้อมขั้นต่ำต่อชุด เช่น 2.00 หรือ 1.00 เมตร)',
    pattern: 'name, rodCategory, curtainStyle, sellUnit, minLength, setRanges, defaultColor, spec',
    desc: 'คอลัมน์: ชื่อรางม่าน, หมวดหมู่ราง(รางม่านจีบ/รางโชว์/รางม่านลอน/รางม่านพับ), ใช้กับรูปแบบม่าน, หน่วยขาย(เมตร / ชุด), ขั้นต่ำต่อชุด/ราง(เมตร เช่น 2.00 หรือ 1.00), ช่วงการแบ่งชุด(เช่น 0-2.00=1; 2.01-2.99=1; 3.00-4.00=2), สีมาตรฐาน, รายละเอียด/ขนาด',
    example: [
      'name, rodCategory, curtainStyle, sellUnit, minLength, setRanges, defaultColor, spec',
      'รางม่านจีบ มาตรฐาน (M), รางม่านจีบ, ม่านจีบ, เมตร, 1.00, , ขาว, รางอลูมิเนียมลื่นพิเศษ (ขั้นต่ำ 1.00 เมตร/ราง)',
      'รางโชว์ ลายไม้สัก 28 มม., รางโชว์, ม่านตาไก่, ชุด, 2.00, "0-2.00=1, 2.01-2.99=1, 3.00-4.00=2", ลายไม้สัก, ขั้นต่ำ 2.00 ม. เช่น กว้าง 285 = 2.85 1 ชุด',
    ].join('\n'),
    headers: ['name', 'ชื่อราง', 'ชื่อรางม่าน'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      if (cols.length >= 8) {
        const su = cols[3] || (cols[1] === 'รางโชว์' ? 'ชุด' : 'เมตร');
        return {
          id: 'rl_imp_' + Date.now() + '_' + idx,
          name: cols[0],
          rodCategory: cols[1] || 'รางม่านจีบ',
          curtainStyle: cols[2] || '*',
          sellUnit: su,
          minLength: parseFloat(cols[4]) || (su === 'ชุด' ? 2.0 : 1.0),
          setRanges: cols[5] || '',
          defaultColor: cols[6] || '',
          spec: cols[7] || '',
        };
      }
      if (cols.length >= 7) {
        const su = cols[3] || (cols[1] === 'รางโชว์' ? 'ชุด' : 'เมตร');
        return {
          id: 'rl_imp_' + Date.now() + '_' + idx,
          name: cols[0],
          rodCategory: cols[1] || 'รางม่านจีบ',
          curtainStyle: cols[2] || '*',
          sellUnit: su,
          minLength: su === 'ชุด' ? 2.0 : 1.0,
          setRanges: cols[4] || '',
          defaultColor: cols[5] || '',
          spec: cols[6] || '',
        };
      }
      return {
        id: 'rl_imp_' + Date.now() + '_' + idx,
        name: cols[0],
        rodCategory: cols[1] || 'รางม่านจีบ',
        curtainStyle: cols[2] || '*',
        sellUnit: cols[1] === 'รางโชว์' ? 'ชุด' : 'เมตร',
        minLength: cols[1] === 'รางโชว์' ? 2.0 : 1.0,
        setRanges: cols[1] === 'รางโชว์' ? '0-2.00=1, 2.01-2.99=1, 3.00-4.00=2' : '',
        defaultColor: cols[3] || '',
        spec: cols[4] || '',
      };
    },
  },
  accessories: {
    title: 'ฐานข้อมูลอุปกรณ์เสริม (แยกออกจากรางม่าน • ขายเป็นชิ้น)',
    pattern: 'name, category, curtainStyle, sellUnit, defaultColor, spec',
    desc: 'คอลัมน์: ชื่ออุปกรณ์เสริม, หมวดหมู่(ด้ามจูง/ตะขอเกี่ยวสายรวบ/ห่วงตาไก่/หัวปิดราง/ขาจับราง/อุปกรณ์เสริมอื่นๆ), ใช้กับรูปแบบม่าน, หน่วยขาย(ชิ้น), สีมาตรฐาน, รายละเอียด/ขนาด',
    example: [
      'name, category, curtainStyle, sellUnit, defaultColor, spec',
      'ด้ามจูงอะคริลิค 120 ซม., ด้ามจูง, *, ชิ้น, ใส, ขนาดมาตรฐาน 120 ซม.',
      'ตะขอเกี่ยวสายรวบคริสตัล, ตะขอเกี่ยวสายรวบ, *, ชิ้น, เงิน, หัวคริสตัล',
      'ห่วงตาไก่ แบบเรียบ, ห่วงตาไก่, ม่านตาไก่, ชิ้น, สีเงิน, สีเงิน / ทองเหลือง / ทองแดง',
    ].join('\n'),
    headers: ['name', 'ชื่ออุปกรณ์', 'ชื่ออุปกรณ์เสริม'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      return {
        id: 'ac_imp_' + Date.now() + '_' + idx,
        name: cols[0],
        category: cols[1] || 'ด้ามจูง',
        curtainStyle: cols[2] || '*',
        sellUnit: 'ชิ้น',
        defaultColor: cols[4] || cols[3] || '',
        spec: cols[5] || cols[4] || '',
      };
    },
  },
  blinds: {
    title: 'ฐานข้อมูลมู่ลี่ ม่านม้วน ม่านปรับแสง (ชื่อรุ่น + รหัสสินค้าหลายรหัสในช่องเดียว)',
    pattern: 'curtainStyle, model, codes, minSqm, roundMode',
    desc: 'คอลัมน์: รูปแบบม่าน (ม่านม้วน/มู่ลี่ไม้/มู่ลี่อลูมิเนียม/ม่านปรับแสง), ชื่อรุ่น (เช่น P100), รหัสสินค้าหลายรหัสคั่นด้วย ; (เช่น P101; P102; P103), ขายขั้นต่ำ(ตร.ม./ผืน อย่างน้อย 1.5), การปัดเศษ',
    example: [
      'curtainStyle, model, codes, minSqm, roundMode',
      'ม่านม้วน, P100, P101; P102; P103, 1.5, ceil_1dec',
      'มู่ลี่ไม้, Basswood 50mm, BW-501; BW-502; BW-503, 1.5, ceil_1dec',
    ].join('\n'),
    headers: ['curtainStyle', 'model', 'group', 'name', 'ชื่อรุ่น', 'รูปแบบม่าน'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      if (cols.length >= 4 && /ม่านม้วน|มู่ลี่|ม่านปรับแสง/.test(String(cols[0]))) {
        const model = cols[1] || cols[0];
        return {
          id: 'bl_imp_' + Date.now() + '_' + idx,
          curtainStyle: cols[0] || 'ม่านม้วน',
          model,
          group: model,
          name: model,
          codes: String(cols[2] || '').replace(/;/g, ', '),
          minSqm: Math.max(1.5, parseFloat(cols[3]) || 1.5),
          roundMode: cols[4] || 'ceil_1dec',
        };
      }
      const model = cols[0];
      return {
        id: 'bl_imp_' + Date.now() + '_' + idx,
        curtainStyle: cols[2] || 'ม่านม้วน',
        model,
        group: model,
        name: model,
        codes: String(cols[1] || '').replace(/;/g, ', '),
        minSqm: Math.max(1.5, parseFloat(cols[3]) || 1.5),
        roundMode: cols[4] || 'ceil_1dec',
      };
    },
  },
  blindCords: {
    title: 'ฐานข้อมูลสีเชือกเทป และสีเชือกสลิง (ชุดข้อมูลแยกต่างหาก)',
    pattern: 'cordType, name, code',
    desc: 'คอลัมน์: ประเภทเชือก (เชือกเทป / เชือกสลิง), ชื่อสี, รหัสสี',
    example: [
      'cordType, name, code',
      'เชือกเทป, สีครีม, TP-01',
      'เชือกสลิง, สีเทา, SL-03',
    ].join('\n'),
    headers: ['cordType', 'ประเภทเชือก', 'name'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      const isSling = /สลิง/.test(String(cols[0]));
      return {
        id: 'bc_imp_' + Date.now() + '_' + idx,
        cordType: isSling ? 'เชือกสลิง' : 'เชือกเทป',
        name: cols[1] || cols[0],
        code: cols[2] || '',
      };
    },
  },
  curtains: {
    title: 'ฐานข้อมูลรูปแบบผ้าม่าน & ค่ามาตรฐานประจำรูปแบบ (การคิดย่อย, ระยะย่น, เผื่อพับขอบบนล่างมาตรฐาน/ประหยัด, เผื่อริม=10, เกย=8, อ้อมข้าง=8)',
    pattern: 'name, subCalcType, useHook, stdGatherRatio, stdTopBottomHem, econTopBottomHem, stdSideHem, stdOverlap, stdSideReturn',
    desc: 'คอลัมน์: ชื่อรูปแบบผ้าม่าน, การคิดย่อย(gathered=ย่นสำเร็จ / stretched=ขึงตึง), ใช้ตะขอ(true/false), ระยะย่นมาตรฐาน, เผื่อพับขอบบนล่างมาตรฐาน(ซม.), เผื่อพับขอบบนล่างแบบประหยัด(ซม.), เผื่อพับริมผ้า(10), เผื่อเกย(8), เผื่ออ้อมข้าง(8)',
    example: [
      'name, subCalcType, useHook, stdGatherRatio, stdTopBottomHem, econTopBottomHem, stdSideHem, stdOverlap, stdSideReturn',
      'ม่านจีบ, gathered, true, 2.5, 35, 25, 10, 8, 8',
      'ม่านลอน, gathered, true, 2.2, 30, 20, 10, 8, 8',
      'ม่านตาไก่, stretched, false, 2.2, 35, 25, 10, 0, 0',
      'ม่านพับ, stretched, false, 1.0, 40, 0, 10, 0, 0',
    ].join('\n'),
    headers: ['name', 'ชื่อรูปแบบผ้าม่าน', 'รูปแบบผ้าม่าน'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      if (cols.length >= 9) {
        const h = String(cols[2] || '').toLowerCase();
        return {
          id: 'ct_imp_' + Date.now() + '_' + idx,
          name: cols[0],
          subCalcType: cols[1] === 'stretched' || cols[1] === 'gathered' ? cols[1] : getDefaultSubCalcType(cols[0]),
          useHook: h === 'true' || h === '1' || h === 'yes' || h === 'ใช่',
          stdGatherRatio: parseFloat(cols[3]) || 2.5,
          stdTopBottomHem: cols[4] !== undefined && cols[4] !== '' ? parseFloat(cols[4]) : 35,
          econTopBottomHem: cols[5] !== undefined && cols[5] !== '' ? parseFloat(cols[5]) : 0,
          stdSideHem: cols[6] !== undefined && cols[6] !== '' ? parseFloat(cols[6]) : 10,
          stdOverlap: cols[7] !== undefined && cols[7] !== '' ? parseFloat(cols[7]) : 8,
          stdSideReturn: cols[8] !== undefined && cols[8] !== '' ? parseFloat(cols[8]) : 8,
        };
      }
      const h = String(cols[1] || '').toLowerCase();
      return {
        id: 'ct_imp_' + Date.now() + '_' + idx,
        name: cols[0],
        subCalcType: getDefaultSubCalcType(cols[0]),
        useHook: h === 'true' || h === '1' || h === 'yes' || h === 'ใช่',
        stdGatherRatio: parseFloat(cols[2]) || 2.5,
        stdTopBottomHem: cols[3] !== undefined && cols[3] !== '' ? parseFloat(cols[3]) : 35,
        econTopBottomHem: 0,
        stdSideHem: cols[4] !== undefined && cols[4] !== '' ? parseFloat(cols[4]) : 10,
        stdOverlap: cols[5] !== undefined && cols[5] !== '' ? parseFloat(cols[5]) : 8,
        stdSideReturn: cols[6] !== undefined && cols[6] !== '' ? parseFloat(cols[6]) : 8,
      };
    },
  },
  hooks: {
    title: 'ฐานข้อมูลขนาดตะขอ',
    pattern: 'name',
    desc: 'คอลัมน์: ชื่อขนาดตะขอ (1 บรรทัดต่อ 1 รายการ)',
    example: [
      'name',
      'No.5',
      'No.7',
      'No.9',
    ].join('\n'),
    headers: ['name', 'ขนาดตะขอ'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      return { id: 'hk_imp_' + Date.now() + '_' + idx, name: cols[0] };
    },
  },
  remarks: {
    title: 'ฐานข้อมูลข้อความหมายเหตุรอบบาน',
    pattern: 'name',
    desc: 'คอลัมน์: ข้อความหมายเหตุรอบบาน (1 บรรทัดต่อ 1 รายการ)',
    example: [
      'name',
      'ชนแอร์',
      'ปลั๊กไฟ',
      'ติดบิ้วอิน',
    ].join('\n'),
    headers: ['name', 'ข้อความหมายเหตุ', 'หมายเหตุ'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      return { id: 'rm_imp_' + Date.now() + '_' + idx, name: cols[0] };
    },
  },
};

function splitDelimitedLine(line) {
  const s = String(line || '').trim();
  if (!s) return [];
  // รองรับทั้ง Tab, Pipe (|) และ Comma (,) พร้อมเครื่องหมายคำพูด "..."
  const delim = s.includes('\t') ? '\t' : (s.includes('|') && !s.includes(',') ? '|' : ',');
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      if (inQuotes && s[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

const MasterDBModal = (() => {
  let activeTab = 'staff';
  let onUpdate = null;
  let importStatusMsg = '';
  let branchStatusMsg = '';
  let showPasteBox = false;
  let importMode = 'append'; // 'append' | 'replace'
  let fabricGrainFilter = 'all'; // 'all' | 'opaque' | 'sheer'
  let widthLayerFilter = 'all'; // 'all' | 'opaque' | 'sheer' | 'both'
  let railCatFilter = 'all';

  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function sortTabByName(tab, dir = 'asc') {
    const arr = masterDB[tab];
    if (!Array.isArray(arr) || arr.length <= 1) return;
    const getSortKey = item => {
      if (!item) return '';
      if (tab === 'widthFormulas' || tab === 'heightFormulas' || tab === 'fabricCalcRules') {
        return String(item.label || item.curtainStyle || '').trim();
      }
      return String(item.name || item.username || item.label || '').trim();
    };
    arr.sort((a, b) => {
      const ka = getSortKey(a);
      const kb = getSortKey(b);
      const cmp = ka.localeCompare(kb, 'th', { numeric: true, sensitivity: 'base' });
      return dir === 'desc' ? -cmp : cmp;
    });
    saveMasterDB();
    importStatusMsg = `✔ เรียงลำดับข้อมูลตามชื่อ (${dir === 'desc' ? 'Z → A / ฮ → ก' : 'A → Z / ก → ฮ'}) เรียบร้อยแล้ว`;
    render();
    if (onUpdate) onUpdate();
  }

  function renderImportBox(tab) {
    const schema = DB_IMPORT_SCHEMAS[tab];
    if (!schema) return '';
    return `
      <div class="subcard" style="margin-bottom:10px;background:#f4f8ff;border:1px solid #bfd6ff">
        <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <b style="color:#0b3a8c;font-size:12.5px">📥 นำเข้าข้อมูลและจัดเรียง "${escH(schema.title)}"</b>
            <div style="font-size:11.5px;color:#333;margin-top:2px">
              <b>รูปแบบข้อมูลที่ต้องนำเข้า:</b> <code style="background:#fff;padding:2px 6px;border:1px solid #ccd8ee;border-radius:4px;color:#b42318;font-weight:700">${escH(schema.pattern)}</code>
            </div>
            <div style="font-size:11px;color:#555;margin-top:2px">${escH(schema.desc)}</div>
          </div>
          <div class="inline" style="flex-wrap:wrap">
            <button type="button" data-db-sort="asc" title="เรียงลำดับตามชื่อ ก-ฮ / A-Z">🔤 เรียงชื่อ A → Z</button>
            <button type="button" data-db-sort="desc" title="เรียงลำดับตามชื่อ ฮ-ก / Z-A">🔤 เรียงชื่อ Z → A</button>
            <select id="dbImportModeSel" style="width:auto;font-size:12px" title="เลือกรูปแบบการนำเข้า">
              <option value="append" ${importMode === 'append' ? 'selected' : ''}>➕ เพิ่มต่อท้ายข้อมูลเดิม</option>
              <option value="replace" ${importMode === 'replace' ? 'selected' : ''}>🔄 แทนที่ข้อมูลเดิมในหมวดนี้</option>
            </select>
            <button type="button" class="primary" data-db-import-file="${escH(tab)}">📂 เลือกไฟล์ .txt / .csv นำเข้า</button>
            <button type="button" data-db-toggle-paste="${escH(tab)}">📋 วางข้อความนำเข้า</button>
            <button type="button" data-db-dl-sample="${escH(tab)}" title="ดาวน์โหลดไฟล์ตัวอย่างของฐานข้อมูลหน้านี้">⬇ ไฟล์ตัวอย่าง (.csv/.txt)</button>
          </div>
        </div>
        <details style="margin-top:6px;font-size:11.5px">
          <summary style="cursor:pointer;color:#1f6feb;font-weight:600">👁️ ดูตัวอย่างข้อมูลสำหรับนำเข้าของหมวดนี้</summary>
          <pre style="margin:4px 0 0;padding:6px 8px;background:#fff;border:1px solid #d5e0f2;border-radius:4px;font-size:11px;overflow-x:auto;line-height:1.4">${escH(schema.example)}</pre>
        </details>
        ${showPasteBox ? `
          <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #bfd6ff">
            <textarea id="dbPasteTextarea" rows="4" placeholder="วางข้อมูล (${escH(schema.pattern)}) บรรทัดละ 1 รายการ..." style="font-family:monospace;font-size:12px"></textarea>
            <div class="inline" style="margin-top:4px;justify-content:flex-end">
              <button type="button" data-db-cancel-paste="1">ยกเลิก</button>
              <button type="button" class="primary" data-db-run-paste="${escH(tab)}">✔ นำเข้าข้อมูลที่วาง</button>
            </div>
          </div>
        ` : ''}
        ${importStatusMsg ? `<div style="margin-top:6px;padding:4px 8px;background:#e6f7ed;border:1px solid #8fd1a8;border-radius:4px;color:#0f5132;font-size:12px;font-weight:600">${escH(importStatusMsg)}</div>` : ''}
      </div>
    `;
  }

  function importTextIntoTab(tab, rawText, mode = 'append') {
    const schema = DB_IMPORT_SCHEMAS[tab];
    if (!schema || !Array.isArray(masterDB[tab])) return 0;
    const text = String(rawText || '').replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
    const parsedItems = [];
    lines.forEach((line, idx) => {
      const cols = splitDelimitedLine(line);
      if (!cols.length) return;
      if (idx === 0) {
        const firstCol = String(cols[0] || '').trim().toLowerCase();
        if (schema.headers && schema.headers.some(h => firstCol === h.toLowerCase())) {
          return; // ข้ามบรรทัด Header อัตโนมัติ
        }
      }
      const item = schema.parseRow(cols, idx);
      if (item) parsedItems.push(item);
    });
    if (!parsedItems.length) {
      alert('ไม่พบข้อมูลที่ตรงตามรูปแบบสำหรับการนำเข้า กรุณาตรวจสอบข้อมูลอีกครั้ง');
      return 0;
    }
    if (mode === 'replace') {
      masterDB[tab] = parsedItems;
    } else {
      masterDB[tab].push(...parsedItems);
    }
    saveMasterDB();
    importStatusMsg = `✔ นำเข้าข้อมูลเข้าสู่ "${schema.title}" สำเร็จจำนวน ${parsedItems.length} รายการ`;
    showPasteBox = false;
    render();
    if (onUpdate) onUpdate();
    return parsedItems.length;
  }

  function downloadSampleForTab(tab) {
    const schema = DB_IMPORT_SCHEMAS[tab];
    if (!schema) return;
    const blob = new Blob(['\uFEFF' + schema.example + '\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pattern_${tab}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function curtainSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด (*)'], ...(masterDB.curtains || []).map(c => [c.name, c.name])];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function widthLayerSelectOpts(selected) {
    const cur = selected || 'both';
    return WIDTH_LAYER_TYPES.map(([v, t]) => `<option value="${escH(v)}" ${cur === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function subCalcSelectOpts(selected) {
    const cur = selected || 'gathered';
    return SUB_CALC_TYPES.map(([v, t]) => `<option value="${escH(v)}" ${cur === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function railSellUnitSelectOpts(selected) {
    const cur = selected || 'เมตร';
    return RAIL_SELL_UNITS.map(([v, t]) => `<option value="${escH(v)}" ${cur === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function rodSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด (*)'], ...ROD_TYPES_LIST.map(r => [r, r])];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function railTrackSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด (*)'], ['1', '1 ชั้น (รางเดี่ยว)'], ['2', '2 ชั้น (รางคู่ ทึบ+โปร่ง)']];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${String(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function piecesSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด (*)'], ['1', '1 ผืน'], ['2', '2 ผืน'], ['3', '3 ผืน'], ['4', '4 ผืน']];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${String(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function railGroupSelectOpts(selected) {
    const groups = Array.from(new Set((masterDB.rails || []).map(r => String(r.railGroup || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'th'));
    const opts = [['*', 'ทุกกลุ่ม (*)'], ...groups.map(g => [g, g])];
    if (selected && selected !== '*' && !groups.includes(selected)) opts.push([selected, selected]);
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function railNameSelectOpts(selected, railGroup = '*') {
    const grp = String(railGroup || '*').trim();
    const srcRails = (grp && grp !== '*')
      ? (masterDB.rails || []).filter(r => String(r.railGroup || '').trim() === grp)
      : (masterDB.rails || []);
    const names = Array.from(new Set(srcRails.map(r => String(r.name || '').trim()).filter(Boolean)));
    const allLabel = (grp && grp !== '*') ? `ทุกรายการในกลุ่ม (${names.length} ราง)` : 'ทุกรายการราง (*)';
    const opts = [['*', allLabel], ...names.map(n => [n, n])];
    if (selected && selected !== '*' && !names.includes(selected)) opts.push([selected, selected]);
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function hookSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด / ไม่ใช้ (*)'], ...(masterDB.hooks || []).map(h => [h.name, h.name])];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function roundModeSelectOpts(selected) {
    return ROUND_MODES.map(([v, t]) => `<option value="${escH(v)}" ${(selected || 'ceil_1dec') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function panelRoundModeSelectOpts(selected) {
    return PANEL_ROUND_MODES.map(([v, t]) => `<option value="${escH(v)}" ${(selected || 'ceil_plus1_if_frac_ge') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function renderStdParamsBanner() {
    const sp = masterDB.stdParams || { stdSideHem: 10, stdOverlap: 8, stdSideReturn: 8 };
    return `
      <div class="subcard" style="margin-bottom:8px;background:#fff9eb;border:1px solid #f5d08a;font-size:12px">
        <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
          <b>⚙️ ค่ามาตรฐานกลางของระบบ (ใช้เป็นค่าตั้งต้นในการคำนวณขนาดและปริมาณผ้า):</b>
          <div class="inline" style="flex-wrap:wrap;gap:12px">
            <label class="inline" style="margin:0">เผื่อเย็บริมผ้ามาตรฐาน (ซม.):
              <input type="number" step="any" data-db-std="stdSideHem" value="${escH(sp.stdSideHem ?? 10)}" style="width:65px;font-weight:700">
            </label>
            <label class="inline" style="margin:0">อ้อมข้างมาตรฐาน (ซม.):
              <input type="number" step="any" data-db-std="stdSideReturn" value="${escH(sp.stdSideReturn ?? 8)}" style="width:65px;font-weight:700">
            </label>
            <label class="inline" style="margin:0">เกยมาตรฐาน (ซม.):
              <input type="number" step="any" data-db-std="stdOverlap" value="${escH(sp.stdOverlap ?? 8)}" style="width:65px;font-weight:700">
            </label>
            <button type="button" data-db-apply-std="1" title="อัปเดตค่าเผื่อริม=10, อ้อมข้าง=8, เกย=8 ลงในสูตรทั้งหมดในหมวดนี้">🔄 นำค่ามาตรฐานไปอัปเดตในตาราง</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderVariableReferenceCard(mode) {
    if (mode === 'width') {
      return `
        <details class="subcard" open style="margin-bottom:8px;background:#f8fafc;border:1px solid #cbd5e1;font-size:11.5px">
          <summary style="cursor:pointer;font-weight:700;color:#0f172a">📘 ตารางอธิบายตัวแปรสำหรับตรวจสอบและแก้ไขสูตรความกว้างผ้าม่าน (ชื่อตัวแปร / ขนาดและหน่วย / หน้าที่การทำงาน)</summary>
          <table class="ed-tbl" style="margin-top:6px;background:#fff">
            <thead>
              <tr>
                <th style="width:120px">ชื่อตัวแปร</th>
                <th style="width:180px">ขนาด / ค่ามาตรฐาน (หน่วย)</th>
                <th>หน้าที่และการทำงานในสูตรคำนวณ</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>RW</code></td><td>กว้างเฟรม + เผื่อซ้าย + เผื่อขวา (ซม.)</td><td>ขนาดความกว้างรางม่านของบานหน้าต่าง/ประตู (ม่านจั่วใช้ด้านเอียงพีทาโกรัส $Z = \lfloor\sqrt{X^2+Y^2}\rfloor$ ซม.)</td></tr>
              <tr><td><code>P</code></td><td>1 หรือ 2 (ผืน)</td><td>จำนวนผืนผ้าม่านของบานนั้นๆ (เช่น 1 ผืน รวบข้างเดียว หรือ 2 ผืน แยกกลาง)</td></tr>
              <tr><td><code>G</code></td><td>1.0 – 2.5 (เท่า)</td><td>ระยะย่นผ้าม่านตามรูปแบบม่าน (ใช้คูณขนาดรางในสูตรแบบขึงตึง <code>((RW * G) / P)</code>)</td></tr>
              <tr><td><code>OV</code></td><td>มาตรฐาน 8 ซม. (หรือ 0 ซม.)</td><td>ระยะเผื่อเกยกลางราง (ใช้บวกเพิ่มหลังหารจำนวนผืนในสูตรแบบย่นสำเร็จ <code>((RW / P) + OV + SR)</code>)</td></tr>
              <tr><td><code>SR</code></td><td>มาตรฐาน 8 ซม. (หรือ 0 ซม.)</td><td>ระยะเผื่ออ้อมข้างราง (สามารถกำหนดทั้งเกย+อ้อมข้าง หรือบวกเฉพาะเผื่อเกยอย่างเดียวได้โดยตั้ง <code>SR = 0</code>)</td></tr>
              <tr><td><code>RT</code></td><td>1 หรือ 2 (ชั้น)</td><td>จำนวนชั้นรางม่านของบานหน้าต่าง/ประตู (1 ชั้น = รางเดี่ยว, 2 ชั้น = รางคู่ ทึบ+โปร่ง)</td></tr>
            </tbody>
          </table>
        </details>
      `;
    }
    if (mode === 'height') {
      return `
        <details class="subcard" open style="margin-bottom:8px;background:#f8fafc;border:1px solid #cbd5e1;font-size:11.5px">
          <summary style="cursor:pointer;font-weight:700;color:#0f172a">📘 ตารางอธิบายตัวแปรสำหรับตรวจสอบและแก้ไขสูตรความสูงผ้าม่าน (มาตรฐานลอยจากพื้น 1 ซม.)</summary>
          <table class="ed-tbl" style="margin-top:6px;background:#fff">
            <thead>
              <tr>
                <th style="width:120px">ชื่อตัวแปร</th>
                <th style="width:195px">ขนาด / ค่ามาตรฐาน (หน่วย)</th>
                <th>หน้าที่และการทำงานในสูตรคำนวณ</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>RH</code></td><td><code>H + ET + EB</code> (ซม.)</td><td>ขนาดความสูงรางม่าน (สูงเฟรม <code>H</code> + เผื่อบน <code>ET</code> + เผื่อล่าง <code>EB</code>; ม่านจั่วใช้ความสูงที่สูงที่สุดของช่วงบานนั้นๆ)</td></tr>
              <tr><td><code>FL_BASE</code></td><td>มาตรฐาน <code>1</code> ซม. (ลอยจากพื้น 1 ซม.)</td><td>ระยะลอยจากพื้นมาตรฐานในฐานข้อมูล (หากบนแปลนเลือกให้ลอยเพิ่ม กองพื้น หรือพอดีพื้น ระบบจะบวก/ลบปรับจากค่านี้ให้อัตโนมัติ)</td></tr>
              <tr><td><code>H</code>, <code>ET</code>, <code>EB</code></td><td>หน่วยเป็น เซนติเมตร (ซม.)</td><td><code>H</code> = สูงเฟรมหน้าต่าง/ประตู, <code>ET</code> = ระยะเผื่อขึ้นด้านบน, <code>EB</code> = ระยะเผื่อลงด้านล่าง</td></tr>
              <tr><td><code>FH</code></td><td>หน่วยเป็น เซนติเมตร (ซม.)</td><td>ความสูงเต็มจากพื้นถึงฝ้าเพดาน (ใช้ตรวจสอบกรณีติดฝ้าเพดานหรือหักลดจากความสูงเต็ม)</td></tr>
            </tbody>
          </table>
        </details>
      `;
    }
    return `
      <details class="subcard" open style="margin-bottom:8px;background:#f8fafc;border:1px solid #cbd5e1;font-size:11.5px">
        <summary style="cursor:pointer;font-weight:700;color:#0f172a">📘 ตารางอธิบายตัวแปรและโครงสร้างสูตรคำนวณปริมาณผ้า (2 เกรนหลัก × 2 การคิดย่อย)</summary>
        <table class="ed-tbl" style="margin-top:6px;background:#fff">
          <thead>
            <tr>
              <th style="width:165px">ชื่อตัวแปร / ฟังก์ชัน</th>
              <th style="width:195px">ขนาด / ค่ามาตรฐาน (หน่วย)</th>
              <th>หน้าที่และการทำงานในสูตรคำนวณปริมาณผ้า</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code>WC</code></td><td>ความกว้างผ้าม่านต่อผืน (ซม.)</td><td>ได้จากการคำนวณความกว้างผ้าม่านต่อผืน: แบบย่นสำเร็จ <code>(RW / P) + OV + SR</code> หรือ แบบขึงตึง <code>(RW * G) / P</code></td></tr>
            <tr><td><code>HC</code></td><td>ความสูงผ้าม่านสุทธิ (ซม.)</td><td>ความสูงผ้าม่านหลังหักลดตามประเภทราง/ขนาดตะขอ/ไม่รับราง/ม่านชั้นหลัง (ม่านจั่วใช้ความสูงที่สูงที่สุดของช่วงบานนั้นๆ)</td></tr>
            <tr><td><code>P</code></td><td>1 หรือ 2 (ผืน)</td><td>จำนวนผืนผ้าม่านของบานที่เลือก (ดึงจากบานหน้าต่าง/ประตูอัตโนมัติ)</td></tr>
            <tr><td><code>G</code></td><td>1.0 – 2.5 (เท่า)</td><td>ระยะย่นผ้าม่าน (ในสูตรปริมาณผ้า ใช้คูณกับ <code>WC</code> เฉพาะการคิดย่อยแบบย่นสำเร็จ คือ ม่านจีบและม่านลอน)</td></tr>
            <tr><td><code>FW_FAB</code></td><td>เช่น 140, 280, 300 (ซม.)</td><td>ขนาดหน้าผ้า ดึงจากฐานข้อมูลผ้าตามผ้าที่เลือกในบานนั้นๆ (เฉพาะหน้าผ้า &gt; 270 ซม. จึงใช้เกรนม่านโปร่งได้)</td></tr>
            <tr><td><code>YR</code> และ <code>YR_CNT</code></td><td>ระยะลายผ้า (ซม.) / จำนวน Repeat</td><td><code>YR</code> = Y-Repeat จากฐานข้อมูลผ้า, <code>YR_CNT = CEIL((HC + HEM_TB) / YR)</code> (ปัดขึ้นเป็นจำนวนเต็ม เฉพาะเกรนม่านทึบ)</td></tr>
            <tr><td><code>HEM_SIDE</code></td><td>มาตรฐาน 10 ซม.</td><td>ระยะเผื่อพับริมผ้าด้านข้างต่อผืน (ซม.)</td></tr>
            <tr><td><code>HEM_TB</code></td><td>เช่น 35, 30, 40 (ซม.)</td><td>ระยะเผื่อพับขอบบนล่างแบบมาตรฐาน (ใช้คำนวณทุกกรณี ยกเว้นการหาจำนวนหน้าผ้าเกรนม่านโปร่งที่มีค่าแบบประหยัด)</td></tr>
            <tr><td><code>HEM_TB_ECON</code> / <code>HEM_TB_SHEER_PANEL</code></td><td>เช่น 25, 20 หรือ 0 (ซม.)</td><td>เผื่อพับขอบบนล่างแบบประหยัด ใช้เฉพาะหาจำนวนหน้าผ้าของเกรนม่านโปร่ง <code>CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB)</code> (ถ้าตั้งเป็น 0 จะใช้ <code>HEM_TB</code> มาตรฐานแทน)</td></tr>
            <tr><td><code>PANELS</code> / <code>PANEL_ROUND(x)</code></td><td>จำนวนหน้าผ้า (หน้า)</td><td>เกรนม่านทึบปัดขึ้นเป็นจำนวนเต็ม และถ้าเศษทศนิยม <code>&gt;= 0.9</code> ปัดขึ้นเป็นจำนวนเต็มแล้ว <code>+ 1</code>; เกรนม่านโปร่งปัดขึ้นเป็นจำนวนเต็ม <code>CEIL(...)</code> เท่านั้น</td></tr>
            <tr><td><code>* 1.05 / 91.44</code></td><td>แปลง ซม. เป็น หลา (เผื่อ 5%)</td><td>ตัวคูณเผื่อผ้า <code>1.05</code> แล้วหารด้วย <code>91.44</code> ซม./หลา จากนั้นปัดเศษทศนิยมขึ้นเป็นทศนิยม 1 ตำแหน่ง (<code>ceil_1dec</code>)</td></tr>
          </tbody>
        </table>
      </details>
    `;
  }

  function dupDelBtns(list, i) {
    return `<span class="db-row-acts"><button type="button" class="db-dup-btn" data-db-dup="${list}.${i}" title="ทำซ้ำรายการนี้">📋</button><button type="button" class="danger" data-db-del="${list}.${i}" title="ลบรายการนี้">✕</button></span>`;
  }

  let msMenuEl = null;
  let msActive = null; // { listKey, idx, btnEl }

  function closeMultiStyleMenu() {
    if (msMenuEl) msMenuEl.hidden = true;
    msActive = null;
  }

  function renderMultiStyleDropdown(listKey, i, styleVal) {
    const raw = String(styleVal || '*').trim();
    const isAll = !raw || raw === '*';
    const picked = isAll ? [] : parseCurtainStylesList(raw);
    const label = isAll ? 'ทั้งหมด (*)' : picked.join(', ');
    const badge = (!isAll && picked.length > 1) ? `<span class="db-ms-cnt">${picked.length}</span>` : '';
    return `<button type="button" class="db-ms-btn" data-db-ms-open="${listKey}.${i}" title="${escH(label)}"><span class="db-ms-lbl">${escH(label)}</span>${badge}<span>▾</span></button>`;
  }

  function openMultiStyleMenu(listKey, idx, btnEl) {
    if (!msMenuEl) {
      msMenuEl = document.createElement('div');
      msMenuEl.id = 'dbMultiStyleMenu';
      msMenuEl.className = 'db-ms-menu no-print';
      msMenuEl.hidden = true;
      document.body.appendChild(msMenuEl);
      msMenuEl.addEventListener('click', e => {
        e.stopPropagation();
        const cb = e.target.closest('input[type="checkbox"][data-ms-val]');
        if (!cb || !msActive) return;
        const { listKey: lk, idx: rowIdx } = msActive;
        const arr = masterDB[lk];
        const rowObj = arr && arr[rowIdx];
        if (!rowObj) return;
        const val = cb.dataset.msVal;
        if (val === '*') {
          rowObj.curtainStyle = '*';
        } else {
          const curList = (String(rowObj.curtainStyle || '').trim() === '*') ? [] : parseCurtainStylesList(rowObj.curtainStyle);
          const pos = curList.indexOf(val);
          if (cb.checked && pos < 0) curList.push(val);
          else if (!cb.checked && pos >= 0) curList.splice(pos, 1);
          rowObj.curtainStyle = curList.length ? curList.join(', ') : '*';
        }
        saveMasterDB();
        // อัปเดตเฉพาะปุ่มในแถวเดิมและรายการติ๊กในเมนูโดยไม่ re-render ทั้งหน้าต่าง
        const tr = document.querySelector(`tr[data-db-row="${lk}.${rowIdx}"]`);
        const cell = tr && tr.querySelector('.db-ms-cell');
        if (cell) {
          cell.innerHTML = renderMultiStyleDropdown(lk, rowIdx, rowObj.curtainStyle);
          msActive.btnEl = cell.querySelector('.db-ms-btn');
        }
        if (lk === 'widthFormulas') {
          const gatherCell = tr && tr.querySelector('.wf-gather-cell');
          if (gatherCell) gatherCell.textContent = formatWidthGatherText(rowObj.curtainStyle);
        }
        renderMultiStyleMenuItems(rowObj.curtainStyle);
      });
      document.addEventListener('click', e => {
        if (msMenuEl && !msMenuEl.hidden && !e.target.closest('#dbMultiStyleMenu') && !e.target.closest('[data-db-ms-open]')) {
          closeMultiStyleMenu();
        }
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && msMenuEl && !msMenuEl.hidden) closeMultiStyleMenu();
      });
    }
    if (msActive && msActive.listKey === listKey && msActive.idx === idx && !msMenuEl.hidden) {
      closeMultiStyleMenu();
      return;
    }
    const rowObj = masterDB[listKey] && masterDB[listKey][idx];
    if (!rowObj) return;
    msActive = { listKey, idx, btnEl };
    renderMultiStyleMenuItems(rowObj.curtainStyle);
    msMenuEl.hidden = false;
    const rect = btnEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mw = Math.max(210, Math.min(280, rect.width + 40));
    let left = Math.max(8, Math.min(rect.left, vw - mw - 8));
    let top = rect.bottom + 3;
    if (top + 260 > vh && rect.top > 260) top = Math.max(8, rect.top - 265);
    msMenuEl.style.left = left + 'px';
    msMenuEl.style.top = top + 'px';
    msMenuEl.style.width = mw + 'px';
  }

  function renderMultiStyleMenuItems(styleVal) {
    if (!msMenuEl) return;
    const raw = String(styleVal || '*').trim();
    const isAll = !raw || raw === '*';
    const picked = isAll ? [] : parseCurtainStylesList(raw);
    const curtainNames = Array.from(new Set((masterDB.curtains || []).map(c => String((c && c.name) || '').trim()).filter(Boolean)));
    picked.forEach(st => { if (!curtainNames.includes(st)) curtainNames.push(st); });
    msMenuEl.innerHTML = `
      <label class="db-ms-opt is-all">
        <input type="checkbox" data-ms-val="*" ${isAll ? 'checked' : ''}> ทั้งหมด (*)
      </label>
      ${curtainNames.map(name => `
        <label class="db-ms-opt">
          <input type="checkbox" data-ms-val="${escH(name)}" ${(!isAll && picked.includes(name)) ? 'checked' : ''}> ${escH(name)}
        </label>
      `).join('')}
    `;
  }

  function formatWidthGatherText(styleVal) {
    const raw = String(styleVal || '*').trim();
    if (!raw || raw === '*') return 'ตามรูปแบบม่าน';
    const list = parseCurtainStylesList(raw);
    if (!list.length) return 'ตามรูปแบบม่าน';
    if (list.length === 1) return `${getStdCurtainParams(list[0]).gatherRatio} เท่า`;
    const ratios = Array.from(new Set(list.map(st => String(getStdCurtainParams(st).gatherRatio))));
    return `${ratios.join(' / ')} เท่า`;
  }

  function render(opts = {}) {
    const body = document.getElementById('dbBody');
    if (!body) return;
    document.querySelectorAll('[data-dbtab]').forEach(b => b.classList.toggle('active', b.dataset.dbtab === activeTab));

    // เก็บตำแหน่งสโครลและช่องที่โฟกัสอยู่ เพื่อไม่ให้หน้าต่างกระตุกหรือเลื่อนกลับด้านบนเวลาเพิ่ม/ทำซ้ำ/ลบ/แก้ไขข้อมูล
    const modalBox = body.closest ? body.closest('.modal-box') : null;
    const prevBodyTop = body.scrollTop || 0;
    const prevBodyLeft = body.scrollLeft || 0;
    const prevModalTop = modalBox ? (modalBox.scrollTop || 0) : 0;
    const prevTblScrolls = Array.from(body.querySelectorAll('.db-tbl-scroll')).map(el => ({
      top: el.scrollTop || 0,
      left: el.scrollLeft || 0,
    }));
    const activeEl = document.activeElement;
    const activeEditKey = (activeEl && body.contains(activeEl) && activeEl.dataset && activeEl.dataset.dbEdit) ? activeEl.dataset.dbEdit : '';
    const activeSelStart = (activeEl && typeof activeEl.selectionStart === 'number') ? activeEl.selectionStart : null;
    const activeSelEnd = (activeEl && typeof activeEl.selectionEnd === 'number') ? activeEl.selectionEnd : null;

    let contentHtml = '';
    if (activeTab === 'staff') {
      const allBranches = getAllBranchesList();
      contentHtml = `
        <p class="hint" style="margin-bottom:8px">จัดการบัญชีผู้ใช้งาน รายชื่อพนักงาน และสาขาทั้งหมดในระบบ (เฉพาะแอดมินเท่านั้นที่สามารถเข้าถึงและแก้ไขฐานข้อมูลได้)</p>
        <div class="subcard" style="margin-bottom:8px;background:#f0f7ff;border:1px solid #bfdbfe;font-size:12px">
          <b>🏢 จัดการรายชื่อสาขาทั้งหมดในระบบ (${allBranches.length} สาขา):</b>
          <div class="inline" style="margin-top:5px;flex-wrap:wrap;gap:6px">
            <input id="dbNewBranchInput" placeholder="พิมพ์ชื่อสาขาใหม่ เช่น สาขาเมกาบางนา (กด Enter หรือคลิกเพิ่ม)" style="max-width:320px">
            <button type="button" class="primary" data-db-add-branch="1">➕ เพิ่มสาขา</button>
          </div>
          ${branchStatusMsg ? `<div style="margin-top:5px;padding:3px 8px;background:#dcfce7;border:1px solid #86efac;border-radius:4px;color:#166534;font-size:11.5px;font-weight:600">${escH(branchStatusMsg)}</div>` : ''}
          <div class="inline" style="margin-top:6px;flex-wrap:wrap;gap:5px">
            ${allBranches.length ? allBranches.map(br => `
              <span class="pill" style="background:#fff;border:1px solid #93c5fd;color:#1e3a8a;padding:2px 8px;display:inline-flex;align-items:center;gap:5px">
                ${escH(br)}
                <button type="button" data-db-del-branch="${escH(br)}" style="border:none;background:transparent;color:#b91c1c;padding:0 2px;font-size:11px" title="ลบสาขานี้">✕</button>
              </span>
            `).join('') : '<span style="color:#64748b">ยังไม่มีสาขา — พิมพ์ชื่อสาขาด้านบนแล้วกด ➕ เพิ่มสาขา</span>'}
          </div>
        </div>
        <div class="db-tbl-scroll">
          <table class="ed-tbl" style="min-width:920px">
            <thead>
              <tr>
                <th style="width:110px">ชื่อผู้ใช้</th>
                <th style="width:110px">รหัสผ่าน</th>
                <th style="width:115px">สิทธิ์การใช้งาน</th>
                <th style="min-width:160px">ชื่อพนักงาน</th>
                <th style="width:120px">แผนก</th>
                <th style="min-width:260px">สาขา (คลิกเลือกได้หลายสาขา หรือพิมพ์คั่นด้วย ,)</th>
                <th style="width:74px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${masterDB.staff.map((st, i) => {
                const stBranches = String(st.branch || '').split(/[,;\n/|]+/).map(s => s.trim()).filter(Boolean);
                return `
                <tr>
                  <td><input data-db-edit="staff.${i}.username" value="${escH(st.username || '')}" placeholder="ชื่อผู้ใช้"></td>
                  <td><input data-db-edit="staff.${i}.password" value="${escH(st.password || '')}" placeholder="รหัสผ่าน"></td>
                  <td>
                    <select data-db-edit="staff.${i}.role">
                      <option value="staff" ${st.role !== 'admin' ? 'selected' : ''}>พนักงาน</option>
                      <option value="admin" ${st.role === 'admin' ? 'selected' : ''}>แอดมิน</option>
                    </select>
                  </td>
                  <td><input data-db-edit="staff.${i}.name" value="${escH(st.name)}" placeholder="ชื่อพนักงาน"></td>
                  <td><input data-db-edit="staff.${i}.dept" value="${escH(st.dept)}" placeholder="แผนก"></td>
                  <td>
                    <input data-db-edit="staff.${i}.branch" value="${escH(st.branch)}" placeholder="เช่น สำนักงานใหญ่, พารากอน">
                    ${allBranches.length ? `
                      <div class="inline" style="margin-top:4px;flex-wrap:wrap;gap:3px">
                        ${allBranches.map(br => {
                          const on = stBranches.includes(br);
                          return `<button type="button" data-db-toggle-stbranch="${i}" data-br="${escH(br)}" style="padding:1px 6px;font-size:10.5px;border-radius:999px;${on ? 'background:#1d4ed8;color:#fff;border-color:#1d4ed8;font-weight:700' : 'background:#f8fafc;color:#475569;border-color:#cbd5e1'}">${on ? '✓ ' : '+ '}${escH(br)}</button>`;
                        }).join('')}
                      </div>
                    ` : ''}
                  </td>
                  <td class="c">${dupDelBtns('staff', i)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="staff">➕ เพิ่มพนักงาน / ผู้ใช้งาน</button>
      `;
    } else if (activeTab === 'fabrics') {
      contentHtml = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>🧵 ฐานข้อมูลผ้า (สำหรับดึงขนาดหน้าผ้า <code>FW_FAB</code> และระยะลายผ้า <code>YR</code> ไปคำนวณปริมาณผ้าอัตโนมัติ):</b><br>
          กำหนด ชื่อผ้า, ดีไซน์ผ้า, ขนาดหน้าผ้า (ซม.), Y-Repeat (ซม.) และเกรนที่ใช้คำนวณ<br>
          <span style="color:#b42318;font-weight:700">* เงื่อนไขสำคัญ: เฉพาะผ้าที่มีขนาดหน้าผ้าเกิน 270 ซม. ขึ้นไป (&gt; 270 ซม.) เท่านั้น ถึงสามารถเลือกใช้คำนวณได้ทั้งเกรนม่านทึบและเกรนม่านโปร่ง</span>
        </div>
        <div class="db-tbl-scroll">
          <table class="ed-tbl" style="min-width:930px">
            <thead>
              <tr>
                <th style="min-width:220px">ชื่อผ้า</th>
                <th style="width:150px">ดีไซน์ผ้า</th>
                <th style="width:130px">ขนาดหน้าผ้า FW_FAB (ซม.)</th>
                <th style="width:120px">Y-Repeat YR (ซม.)</th>
                <th style="width:280px">เกรนการคำนวณผ้า</th>
                <th style="width:74px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${(masterDB.fabrics || []).map((f, i) => {
                const allowSheer = canFabricUseSheerGrain(f.fabricWidth);
                const mode = allowSheer ? (f.calcMode || 'both') : 'opaque';
                return `
                <tr>
                  <td><input data-db-edit="fabrics.${i}.name" value="${escH(f.name)}" placeholder="ระบุชื่อผ้า"></td>
                  <td><input data-db-edit="fabrics.${i}.design" value="${escH(f.design)}" placeholder="ระบุดีไซน์"></td>
                  <td><input type="number" step="any" data-db-edit="fabrics.${i}.fabricWidth" value="${escH(f.fabricWidth)}" placeholder="140 หรือ 280"></td>
                  <td><input type="number" step="any" data-db-edit="fabrics.${i}.yRepeat" value="${escH(f.yRepeat ?? 0)}" placeholder="0"></td>
                  <td>
                    <select data-db-edit="fabrics.${i}.calcMode" ${allowSheer ? '' : 'disabled title="ขนาดหน้าผ้าต้องเกิน 270 ซม. จึงจะเลือกเกรนม่านโปร่งได้"'}>
                      <option value="opaque" ${mode === 'opaque' ? 'selected' : ''}>เกรนม่านทึบเท่านั้น ${allowSheer ? '' : '(หน้าผ้า ≤ 270 ซม.)'}</option>
                      <option value="both" ${mode === 'both' ? 'selected' : ''} ${allowSheer ? '' : 'disabled'}>ทั้งเกรนม่านทึบและเกรนม่านโปร่ง (หน้าผ้า &gt; 270 ซม.)</option>
                      <option value="sheer" ${mode === 'sheer' ? 'selected' : ''} ${allowSheer ? '' : 'disabled'}>เกรนม่านโปร่ง (หน้าผ้า &gt; 270 ซม.)</option>
                    </select>
                  </td>
                  <td class="c">${dupDelBtns('fabrics', i)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="fabrics">➕ เพิ่มรายการผ้า</button>
      `;
    } else if (activeTab === 'widthFormulas') {
      const wfAll = masterDB.widthFormulas || [];
      contentHtml = renderStdParamsBanner() + renderVariableReferenceCard('width') + `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:4px">
            <b>📐 ฐานข้อมูลขนาดความกว้างผ้าม่านต่อผืน (เลือกได้มากกว่า 1 รูปแบบผ้าม่านต่อสูตร • ดึงจำนวนผืน <code>P</code> จากบานนั้นๆ และดึงระยะย่น <code>G</code> จากฐานข้อมูลกลางอัตโนมัติ):</b>
            <div class="inline">
              <button type="button" data-db-goto="curtains">🎀 แก้ไขค่ามาตรฐานกลาง (ระยะย่น G)</button>
              <button type="button" class="${widthLayerFilter === 'all' ? 'primary' : ''}" data-db-wlayer-filter="all">ทั้งหมด (${wfAll.length})</button>
              <button type="button" class="${widthLayerFilter === 'opaque' ? 'primary' : ''}" data-db-wlayer-filter="opaque">เฉพาะม่านทึบ</button>
              <button type="button" class="${widthLayerFilter === 'sheer' ? 'primary' : ''}" data-db-wlayer-filter="sheer">เฉพาะม่านโปร่ง</button>
              <button type="button" class="${widthLayerFilter === 'both' ? 'primary' : ''}" data-db-wlayer-filter="both">ทั้งม่านทึบและม่านโปร่ง</button>
            </div>
          </div>
          • <b>รูปแบบผ้าม่าน</b>: กด Dropdown เพื่อติ๊กเลือกได้มากกว่า 1 รูปแบบพร้อมกัน (เช่น <code>ม่านจีบ, ม่านลอน</code>) หรือเลือก <code>ทั้งหมด (*)</code><br>
          • <b>แบบย่นสำเร็จ (ม่านจีบ / ม่านลอน)</b>: <code>((RW / P) + OV + SR)</code> | <b>แบบขึงตึง (รูปแบบม่านที่เหลือ)</b>: <code>((RW * G) / P)</code>
        </div>
        <div class="db-tbl-scroll">
          <table class="ed-tbl" style="min-width:1480px">
            <thead>
              <tr>
                <th style="width:175px">รูปแบบผ้าม่าน (เลือกได้หลายแบบ)</th>
                <th style="width:175px">การคิดย่อย</th>
                <th style="width:145px">ใช้คำนวณกับ</th>
                <th style="width:115px">ประเภทรางม่าน</th>
                <th style="width:95px">ชั้นราง (RT)</th>
                <th style="min-width:265px">ชื่อเงื่อนไขการคำนวณความกว้าง</th>
                <th style="width:115px">ระยะย่น G (ฐานกลาง)</th>
                <th style="width:76px">เผื่อเกย (OV)</th>
                <th style="width:80px">อ้อมข้าง (SR)</th>
                <th style="width:185px">สูตรความกว้างต่อผืน (WC)</th>
                <th style="width:150px">การปัดเศษ</th>
                <th style="width:74px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${wfAll.map((wf, i) => {
                const lt = wf.layerType || 'both';
                if (widthLayerFilter !== 'all' && lt !== widthLayerFilter) return '';
                const firstStyle = parseCurtainStylesList(wf.curtainStyle)[0] || wf.curtainStyle;
                const subCalc = wf.subCalcType || getDefaultSubCalcType(firstStyle);
                return `
                <tr data-db-row="widthFormulas.${i}">
                  <td class="db-ms-cell">${renderMultiStyleDropdown('widthFormulas', i, wf.curtainStyle)}</td>
                  <td><select data-db-edit="widthFormulas.${i}.subCalcType">${subCalcSelectOpts(subCalc)}</select></td>
                  <td><select data-db-edit="widthFormulas.${i}.layerType">${widthLayerSelectOpts(lt)}</select></td>
                  <td><select data-db-edit="widthFormulas.${i}.rodType">${rodSelectOpts(wf.rodType || '*')}</select></td>
                  <td><select data-db-edit="widthFormulas.${i}.railTracks">${railTrackSelectOpts(wf.railTracks || '*')}</select></td>
                  <td><input data-db-edit="widthFormulas.${i}.label" value="${escH(wf.label || '')}" placeholder="ชื่อเงื่อนไข"></td>
                  <td class="c wf-gather-cell" style="background:#f8fafc;font-weight:700;color:#0b3a8c" title="ดึงจากฐานข้อมูลกลาง (รูปแบบผ้าม่าน)">${escH(formatWidthGatherText(wf.curtainStyle))}</td>
                  <td><input type="number" step="any" data-db-edit="widthFormulas.${i}.overlap" value="${escH(wf.overlap ?? 8)}"></td>
                  <td><input type="number" step="any" data-db-edit="widthFormulas.${i}.sideReturn" value="${escH(wf.sideReturn ?? 8)}"></td>
                  <td><input data-db-edit="widthFormulas.${i}.widthExp" value="${escH(wf.widthExp || '((RW / P) + OV + SR)')}"></td>
                  <td><select data-db-edit="widthFormulas.${i}.roundMode">${roundModeSelectOpts(wf.roundMode || 'ceil_int')}</select></td>
                  <td class="c">${dupDelBtns('widthFormulas', i)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="inline" style="margin-top:8px;flex-wrap:wrap">
          <button type="button" class="primary" data-db-add="widthFormulas" data-wlayer="both">➕ เพิ่มเงื่อนไข (ทั้งม่านทึบและม่านโปร่ง)</button>
          <button type="button" class="primary" data-db-add="widthFormulas" data-wlayer="opaque">➕ เพิ่มเงื่อนไข (เฉพาะม่านทึบ)</button>
          <button type="button" class="primary" data-db-add="widthFormulas" data-wlayer="sheer">➕ เพิ่มเงื่อนไข (เฉพาะม่านโปร่ง)</button>
        </div>
      `;
    } else if (activeTab === 'heightFormulas') {
      contentHtml = renderVariableReferenceCard('height') + `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>📏 ฐานข้อมูลการคำนวณขนาดความสูงผ้าม่าน (เชื่อมโยงกับกลุ่มรางม่านและรายการรางม่าน • มาตรฐานลอยจากพื้น <code>FL_BASE = 1</code> ซม.):</b><br>
          • กำหนด <b>กลุ่มรางม่าน</b> (จับกลุ่มรางที่มีระยะลดความสูงเท่ากันในแท็บรางม่าน) หรือระบุ <b>รายการรางม่าน</b> เฉพาะรุ่นได้โดยไม่ต้องระบุจำนวนผืน<br>
          • <b>ความสูงราง (<code>RH</code>) = สูงเฟรม (<code>H</code>) + เผื่อบน (<code>ET</code>) + เผื่อล่าง (<code>EB</code>)</b>
        </div>
        <div class="db-tbl-scroll">
          <table class="ed-tbl" style="min-width:1510px">
            <thead>
              <tr>
                <th style="width:175px">รูปแบบผ้าม่าน (เลือกได้หลายแบบ)</th>
                <th style="width:115px">ประเภทรางม่าน</th>
                <th style="width:145px">กลุ่มรางม่าน (ขนาดเดียวกัน)</th>
                <th style="width:170px">รายการรางม่าน</th>
                <th style="width:95px">ชั้นราง (RT)</th>
                <th style="width:95px">ขนาดตะขอ</th>
                <th style="width:95px">ลอยพื้น (FL_BASE)</th>
                <th style="min-width:250px">ชื่อเงื่อนไขความสูง</th>
                <th style="width:155px">สูตรความสูงผ้า (HC)</th>
                <th style="width:150px">การปัดเศษ</th>
                <th style="width:74px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${(masterDB.heightFormulas || []).map((hf, i) => {
                const grp = String(hf.railGroup || '*').trim();
                const grpRails = (grp && grp !== '*')
                  ? (masterDB.rails || []).filter(r => String(r.railGroup || '').trim() === grp).map(r => r.name).filter(Boolean)
                  : [];
                return `
                <tr data-db-row="heightFormulas.${i}">
                  <td class="db-ms-cell">${renderMultiStyleDropdown('heightFormulas', i, hf.curtainStyle)}</td>
                  <td><select data-db-edit="heightFormulas.${i}.rodType">${rodSelectOpts(hf.rodType)}</select></td>
                  <td><select data-db-edit="heightFormulas.${i}.railGroup">${railGroupSelectOpts(grp)}</select></td>
                  <td>
                    <select data-db-edit="heightFormulas.${i}.railName">${railNameSelectOpts(hf.railName || '*', grp)}</select>
                    <div class="hf-grp-rails" style="font-size:10.5px;color:#0b5ed7;margin-top:2px;line-height:1.25${grpRails.length ? '' : ';display:none'}">${grpRails.length ? `ในกลุ่ม: ${escH(grpRails.join(', '))}` : ''}</div>
                  </td>
                  <td><select data-db-edit="heightFormulas.${i}.railTracks">${railTrackSelectOpts(hf.railTracks || '*')}</select></td>
                  <td><select data-db-edit="heightFormulas.${i}.hookSize">${hookSelectOpts(hf.hookSize)}</select></td>
                  <td><input type="number" step="any" min="0" data-db-edit="heightFormulas.${i}.floorFloat" value="${escH(hf.floorFloat ?? 1)}" title="ค่ามาตรฐานลอยจากพื้น (ซม.) เช่น 1"></td>
                  <td><input data-db-edit="heightFormulas.${i}.label" value="${escH(hf.label || '')}"></td>
                  <td><input data-db-edit="heightFormulas.${i}.heightExp" value="${escH(hf.heightExp || 'RH - FL_BASE')}"></td>
                  <td><select data-db-edit="heightFormulas.${i}.roundMode">${roundModeSelectOpts(hf.roundMode || 'none')}</select></td>
                  <td class="c">${dupDelBtns('heightFormulas', i)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="heightFormulas">➕ เพิ่มเงื่อนไขการคำนวณความสูงผ้าม่าน</button>
      `;
    } else if (activeTab === 'fabricCalcRules') {
      const rules = masterDB.fabricCalcRules || [];
      const opaqueCount = rules.filter(r => r.grainType !== 'sheer').length;
      const sheerCount = rules.filter(r => r.grainType === 'sheer').length;
      contentHtml = renderStdParamsBanner() + renderVariableReferenceCard('fabric') + `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:4px">
            <b>🧮 ฐานข้อมูลการคำนวณปริมาณผ้า (ดึง ระยะย่น, พับริม, พับบนล่างมาตรฐาน/ประหยัด จากฐานข้อมูลกลางแหล่งเดียว):</b>
            <div class="inline">
              <button type="button" data-db-goto="curtains">🎀 แก้ไขค่ามาตรฐานกลาง (ย่น/พับริม/พับบนล่าง)</button>
              <button type="button" class="${fabricGrainFilter === 'all' ? 'primary' : ''}" data-db-grain-filter="all">ทั้งหมด (${rules.length})</button>
              <button type="button" class="${fabricGrainFilter === 'opaque' ? 'primary' : ''}" data-db-grain-filter="opaque">⬛ เกรนม่านทึบ (${opaqueCount})</button>
              <button type="button" class="${fabricGrainFilter === 'sheer' ? 'primary' : ''}" data-db-grain-filter="sheer">⬜ เกรนม่านโปร่ง (${sheerCount})</button>
            </div>
          </div>
          • ค่า <b>ระยะย่น (<code>G</code>)</b>, <b>เผื่อพับริม (<code>HEM_SIDE</code>)</b>, <b>เผื่อพับบนล่างมาตรฐาน (<code>HEM_TB</code>)</b> และ <b>ประหยัด (<code>HEM_TB_ECON</code>)</b> ทุกสูตรดึงจากฐานข้อมูลกลาง <button type="button" data-db-goto="curtains" style="padding:1px 6px;font-size:11px">🎀 รูปแบบผ้าม่าน &amp; ค่ามาตรฐาน</button> เพียงแหล่งเดียวทั้งหมด!<br>
          • <b>หมายเหตุ</b>: หากบานใดยังไม่ได้เลือกผ้า ระบบจะยังไม่คำนวณจำนวนหน้าผ้าและปริมาณผ้าให้
        </div>
        <div class="db-tbl-scroll">
          <table class="ed-tbl" style="min-width:1760px">
            <thead>
              <tr>
                <th style="width:110px">รูปแบบม่าน</th>
                <th style="width:125px">เกรนหลัก</th>
                <th style="width:170px">การคิดย่อย</th>
                <th style="min-width:290px">ชื่อสูตรการคำนวณปริมาณผ้า</th>
                <th style="min-width:230px">ค่าตัดเย็บที่ใช้ (จากฐานข้อมูลกลาง)</th>
                <th style="width:205px">เงื่อนไขปัดจำนวนหน้าผ้า</th>
                <th style="width:66px">เศษ ≥</th>
                <th style="width:66px">+เพิ่มหน้า</th>
                <th style="width:255px">สูตรจำนวนหน้าผ้า (PANELS)</th>
                <th style="width:195px">สูตรจำนวน Repeat (YR_CNT)</th>
                <th style="width:280px">สูตรปริมาณผ้า (หลา)</th>
                <th style="width:145px">การปัดเศษหลา</th>
                <th style="width:74px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${rules.map((r, i) => {
                if (fabricGrainFilter === 'opaque' && r.grainType === 'sheer') return '';
                if (fabricGrainFilter === 'sheer' && r.grainType !== 'sheer') return '';
                const stdP = getStdCurtainParams(r.curtainStyle);
                const subCalc = stdP.subCalcType || r.subCalcType || getDefaultSubCalcType(r.curtainStyle);
                return `
                <tr>
                  <td><select data-db-edit="fabricCalcRules.${i}.curtainStyle">${curtainSelectOpts(r.curtainStyle)}</select></td>
                  <td>
                    <select data-db-edit="fabricCalcRules.${i}.grainType">
                      <option value="opaque" ${r.grainType !== 'sheer' ? 'selected' : ''}>1. เกรนม่านทึบ</option>
                      <option value="sheer" ${r.grainType === 'sheer' ? 'selected' : ''}>2. เกรนม่านโปร่ง</option>
                    </select>
                  </td>
                  <td><select data-db-edit="fabricCalcRules.${i}.subCalcType">${subCalcSelectOpts(subCalc)}</select></td>
                  <td><input data-db-edit="fabricCalcRules.${i}.label" value="${escH(r.label || '')}" title="${escH(r.label || '')}"></td>
                  <td style="background:#f8fafc;font-size:11.5px;color:#0b3a8c;font-weight:600;white-space:nowrap">
                    ย่น <b>${escH(stdP.gatherRatio)}</b> • ริม <b>${escH(stdP.sideHem)}</b> • มาตรฐาน <b>${escH(stdP.topBottomHem)}</b> • ประหยัด <b>${escH(stdP.econTopBottomHem || 0)}</b>
                  </td>
                  <td><select data-db-edit="fabricCalcRules.${i}.panelRoundMode">${panelRoundModeSelectOpts(r.panelRoundMode || (r.grainType === 'sheer' ? 'ceil' : 'ceil_plus1_if_frac_ge'))}</select></td>
                  <td><input type="number" step="0.05" min="0.05" max="0.99" data-db-edit="fabricCalcRules.${i}.panelFracThreshold" value="${escH(r.panelFracThreshold ?? 0.9)}"></td>
                  <td><input type="number" step="1" min="0" data-db-edit="fabricCalcRules.${i}.panelExtraAdd" value="${escH(r.panelExtraAdd ?? (r.grainType === 'sheer' ? 0 : 1))}"></td>
                  <td><input data-db-edit="fabricCalcRules.${i}.panelCountExp" value="${escH(r.panelCountExp || '')}" style="font-family:monospace;font-size:11.5px"></td>
                  <td><input data-db-edit="fabricCalcRules.${i}.yRepeatCountExp" value="${escH(r.yRepeatCountExp || '')}" style="font-family:monospace;font-size:11.5px"></td>
                  <td><input data-db-edit="fabricCalcRules.${i}.qtyExp" value="${escH(r.qtyExp || '')}" style="font-family:monospace;font-size:11.5px"></td>
                  <td><select data-db-edit="fabricCalcRules.${i}.roundMode">${roundModeSelectOpts(r.roundMode || 'ceil_1dec')}</select></td>
                  <td class="c">${dupDelBtns('fabricCalcRules', i)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="inline" style="margin-top:8px;flex-wrap:wrap">
          <button type="button" class="primary" data-db-add="fabricCalcRules" data-grain="opaque" data-subcalc="gathered">➕ เพิ่มสูตร เกรนม่านทึบ (แบบย่นสำเร็จ)</button>
          <button type="button" class="primary" data-db-add="fabricCalcRules" data-grain="opaque" data-subcalc="stretched">➕ เพิ่มสูตร เกรนม่านทึบ (แบบขึงตึง)</button>
          <button type="button" class="primary" data-db-add="fabricCalcRules" data-grain="sheer" data-subcalc="gathered">➕ เพิ่มสูตร เกรนม่านโปร่ง (แบบย่นสำเร็จ)</button>
          <button type="button" class="primary" data-db-add="fabricCalcRules" data-grain="sheer" data-subcalc="stretched">➕ เพิ่มสูตร เกรนม่านโปร่ง (แบบขึงตึง)</button>
        </div>
      `;
    } else if (activeTab === 'rails') {
      const railsAll = masterDB.rails || [];
      const railGroupsList = Array.from(new Set(railsAll.map(r => String(r.railGroup || '').trim()).filter(Boolean)));
      contentHtml = `
        <datalist id="dlRailGroups">${railGroupsList.map(g => `<option value="${escH(g)}"></option>`).join('')}</datalist>
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>🛤️ ฐานข้อมูลรางม่าน (แยกออกจากอุปกรณ์เสริม • กำหนดกลุ่มรางม่านที่มีขนาด/ระยะลดความสูงเดียวกัน + หน่วยขาย เมตร หรือ ชุด):</b><br>
          • <b>กลุ่มรางม่าน</b>: ตั้งชื่อกลุ่มเดียวกันให้รางที่มีขนาด/ระยะลดความสูงเท่ากัน เพื่อนำไปผูกในฐานข้อมูลขนาดความสูงผ้าม่าน<br>
          • กรณีขายเป็น <b>เมตร</b>: กำหนดขั้นต่ำต่อรางได้ เช่น <b>1.00 เมตร</b> | กรณีขายเป็น <b>ชุด</b>: เช่น <b>2.00</b> เมตร/ชุด
        </div>
        <div class="db-tbl-scroll">
          <table class="ed-tbl" style="min-width:1490px">
            <thead>
              <tr>
                <th style="min-width:210px">ชื่อรางม่าน</th>
                <th style="width:165px">กลุ่มรางม่าน (ขนาดเดียวกัน)</th>
                <th style="width:135px">ประเภทรางม่าน</th>
                <th style="width:125px">ใช้กับรูปแบบม่าน</th>
                <th style="width:145px">หน่วยขายราง</th>
                <th style="width:125px">ขั้นต่ำต่อชุด/ราง (เมตร)</th>
                <th style="min-width:230px">การแบ่งชุดตามความยาวราง (เมตร=ชุด)</th>
                <th style="width:95px">สีมาตรฐาน</th>
                <th style="width:160px">รายละเอียด / ขนาด</th>
                <th style="width:74px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${railsAll.map((rl, i) => `
                <tr>
                  <td><input data-db-edit="rails.${i}.name" value="${escH(rl.name || '')}" placeholder="เช่น รางม่านจีบ มาตรฐาน / รางโชว์"></td>
                  <td><input list="dlRailGroups" data-db-edit="rails.${i}.railGroup" value="${escH(rl.railGroup || '')}" placeholder="เช่น กลุ่มรางจีบ 1.5 ซม."></td>
                  <td><select data-db-edit="rails.${i}.rodCategory">${ROD_TYPES_LIST.map(rt => `<option value="${escH(rt)}" ${rl.rodCategory === rt ? 'selected' : ''}>${escH(rt)}</option>`).join('')}</select></td>
                  <td><select data-db-edit="rails.${i}.curtainStyle">${curtainSelectOpts(rl.curtainStyle)}</select></td>
                  <td><select data-db-edit="rails.${i}.sellUnit">${railSellUnitSelectOpts(rl.sellUnit || (rl.rodCategory === 'รางโชว์' ? 'ชุด' : 'เมตร'))}</select></td>
                  <td><input type="number" step="0.1" min="0.5" data-db-edit="rails.${i}.minLength" value="${escH(rl.minLength ?? (rl.sellUnit === 'ชุด' ? 2.0 : 1.0))}" placeholder="เช่น 2.00 หรือ 1.00"></td>
                  <td><input data-db-edit="rails.${i}.setRanges" value="${escH(rl.setRanges || '')}" placeholder="เช่น 0-2.00=1, 2.01-2.99=1, 3.00-4.00=2"></td>
                  <td><input data-db-edit="rails.${i}.defaultColor" value="${escH(rl.defaultColor || '')}" placeholder="เช่น ขาว, ดำ, เงิน"></td>
                  <td><input data-db-edit="rails.${i}.spec" value="${escH(rl.spec || '')}" placeholder="เช่น 28 มม."></td>
                  <td class="c">${dupDelBtns('rails', i)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="inline" style="margin-top:8px">
          <button type="button" class="primary" data-db-add="rails" data-cat="รางม่านจีบ">➕ เพิ่มรางม่าน</button>
          <button type="button" class="primary" data-db-add="rails" data-cat="รางโชว์">➕ เพิ่มรางโชว์ (ขายเป็นชุด)</button>
        </div>
      `;
    } else if (activeTab === 'accessories') {
      const accAll = masterDB.accessories || [];
      contentHtml = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>🪝 ฐานข้อมูลอุปกรณ์เสริม (แยกออกจากฐานข้อมูลรางม่าน • ขายเป็นชิ้น):</b><br>
          ประกอบด้วย ด้ามจูง, ตะขอเกี่ยวสายรวบ, ห่วงตาไก่, หัวปิดราง, ขาจับราง และอุปกรณ์เสริมอื่นๆ โดยกำหนดหน่วยขายเป็น <b>ชิ้น</b> ทั้งหมด
        </div>
        <div class="db-tbl-scroll">
          <table class="ed-tbl" style="min-width:1080px">
            <thead>
              <tr>
                <th style="min-width:240px">ชื่ออุปกรณ์เสริม</th>
                <th style="width:170px">หมวดหมู่อุปกรณ์เสริม</th>
                <th style="width:150px">ใช้กับรูปแบบม่าน</th>
                <th style="width:120px">หน่วยขาย</th>
                <th style="width:120px">สีมาตรฐาน</th>
                <th style="min-width:200px">รายละเอียด / ขนาด</th>
                <th style="width:74px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${accAll.map((ac, i) => `
                <tr>
                  <td><input data-db-edit="accessories.${i}.name" value="${escH(ac.name || '')}" placeholder="เช่น ด้ามจูงอะคริลิค 120 ซม. / ตะขอเกี่ยวสายรวบ"></td>
                  <td><select data-db-edit="accessories.${i}.category">${ACCESSORY_CATEGORIES_LIST.map(ct => `<option value="${escH(ct)}" ${(ac.category || 'ด้ามจูง') === ct ? 'selected' : ''}>${escH(ct)}</option>`).join('')}</select></td>
                  <td><select data-db-edit="accessories.${i}.curtainStyle">${curtainSelectOpts(ac.curtainStyle)}</select></td>
                  <td class="c"><span class="pill" style="background:#e6f4ea;color:#137333;font-weight:700">ชิ้น</span></td>
                  <td><input data-db-edit="accessories.${i}.defaultColor" value="${escH(ac.defaultColor || '')}" placeholder="เช่น เงิน, ขาว, ใส"></td>
                  <td><input data-db-edit="accessories.${i}.spec" value="${escH(ac.spec || '')}" placeholder="เช่น 120 ซม."></td>
                  <td class="c">${dupDelBtns('accessories', i)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="inline" style="margin-top:8px">
          <button type="button" class="primary" data-db-add="accessories">➕ เพิ่มอุปกรณ์เสริม (ขายเป็นชิ้น)</button>
        </div>
      `;
    } else if (activeTab === 'blinds') {
      contentHtml = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:6px">
            <b>🪟 ฐานข้อมูลมู่ลี่ ม่านม้วน ม่านปรับแสง (แยกช่องชื่อรุ่น และช่องรหัสสินค้า 1 รุ่นใส่ได้หลายรหัส):</b>
            <button type="button" data-db-goto="blindCords">🎨 จัดการชุดสีเชือกเทป / สีเชือกสลิง &amp; กล่องบังราง (แยกชุดข้อมูล)</button>
          </div>
          • กรอก <b>ชื่อรุ่น</b> (เช่น <code>P100</code>) และ <b>รหัสสินค้า</b> หลายรหัสในช่องเดียวคั่นด้วย <code>,</code> (เช่น <code>P101, P102, P103</code>) — ที่หน้าแปลนงานจะให้เลือกรุ่นก่อนแล้วค่อยเลือกรหัสของรุ่นนั้นอัตโนมัติ • ขายขั้นต่ำ <b>1.5 ตร.ม./ผืน</b> (คิดแยกแต่ละชุด ปัดขึ้นทศนิยม 1 ตำแหน่งทุกชุด)
        </div>
        <div class="db-tbl-scroll">
          <table class="ed-tbl" style="min-width:1110px">
            <thead>
              <tr>
                <th style="width:145px">รูปแบบม่าน</th>
                <th style="min-width:200px">ชื่อรุ่น (เช่น P100)</th>
                <th style="min-width:340px">รหัสสินค้า (ใส่หลายรหัสคั่นด้วย , เช่น P101, P102, P103)</th>
                <th style="width:125px">ขั้นต่ำ (ตร.ม./ผืน)</th>
                <th style="width:170px">การปัดเศษ</th>
                <th style="width:74px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${(masterDB.blinds || []).map((bl, i) => `
                <tr>
                  <td><select data-db-edit="blinds.${i}.curtainStyle">${curtainSelectOpts(bl.curtainStyle)}</select></td>
                  <td><input data-db-edit="blinds.${i}.model" value="${escH(bl.model || bl.group || bl.name || '')}" placeholder="เช่น P100 / Basswood 50mm"></td>
                  <td><input data-db-edit="blinds.${i}.codes" value="${escH(bl.codes || '')}" placeholder="เช่น P101, P102, P103"></td>
                  <td><input type="number" step="0.1" min="1.5" data-db-edit="blinds.${i}.minSqm" value="${escH(bl.minSqm ?? 1.5)}"></td>
                  <td><select data-db-edit="blinds.${i}.roundMode">${roundModeSelectOpts(bl.roundMode || 'ceil_1dec')}</select></td>
                  <td class="c">${dupDelBtns('blinds', i)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="blinds">➕ เพิ่มรุ่นมู่ลี่ / ม่านม้วน / ม่านปรับแสง</button>
      `;
    } else if (activeTab === 'blindCords') {
      const cordsAll = masterDB.blindCords || [];
      const tapeRows = cordsAll.map((c, i) => ({ c, i })).filter(({ c }) => c.cordType !== 'เชือกสลิง');
      const slingRows = cordsAll.map((c, i) => ({ c, i })).filter(({ c }) => c.cordType === 'เชือกสลิง');
      const valRows = masterDB.blindValances || [];
      contentHtml = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>🎨 ฐานข้อมูลสีเชือกเทป, สีเชือกสลิง และสีกล่องบังรางมู่ลี่ (แยกชุดข้อมูลอิสระจากรุ่นมู่ลี่):</b><br>
          • แยกชุดข้อมูล <b>สีเชือกเทป</b> และ <b>สีเชือกสลิง</b> ออกจากกันชัดเจน เมื่อเลือกประเภทเชือกที่หน้าแปลนงาน ระบบจะแสดงเฉพาะสีของประเภทเชือกนั้นให้เลือกทันที
        </div>
        <div class="grid3" style="gap:10px;align-items:start">
          <div class="subcard" style="background:#fff">
            <div class="inline" style="justify-content:space-between;margin-bottom:6px">
              <b style="color:#0b5ed7">🧵 ชุดข้อมูลสีเชือกเทป (${tapeRows.length})</b>
              <button type="button" class="primary" data-db-add="blindCords" data-cordtype="เชือกเทป" style="padding:2px 8px;font-size:11.5px">➕ เพิ่มสีเชือกเทป</button>
            </div>
            <table class="ed-tbl">
              <thead><tr><th>ชื่อสีเชือกเทป</th><th style="width:85px">รหัส</th><th style="width:68px">จัดการ</th></tr></thead>
              <tbody>
                ${tapeRows.map(({ c, i }) => `
                  <tr>
                    <td><input data-db-edit="blindCords.${i}.name" value="${escH(c.name || '')}" placeholder="เช่น สีครีม"></td>
                    <td><input data-db-edit="blindCords.${i}.code" value="${escH(c.code || '')}" placeholder="TP-01"></td>
                    <td class="c">${dupDelBtns('blindCords', i)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="subcard" style="background:#fff">
            <div class="inline" style="justify-content:space-between;margin-bottom:6px">
              <b style="color:#0f766e">🪢 ชุดข้อมูลสีเชือกสลิง (${slingRows.length})</b>
              <button type="button" class="primary" data-db-add="blindCords" data-cordtype="เชือกสลิง" style="padding:2px 8px;font-size:11.5px">➕ เพิ่มสีเชือกสลิง</button>
            </div>
            <table class="ed-tbl">
              <thead><tr><th>ชื่อสีเชือกสลิง</th><th style="width:85px">รหัส</th><th style="width:68px">จัดการ</th></tr></thead>
              <tbody>
                ${slingRows.map(({ c, i }) => `
                  <tr>
                    <td><input data-db-edit="blindCords.${i}.name" value="${escH(c.name || '')}" placeholder="เช่น สีเทา"></td>
                    <td><input data-db-edit="blindCords.${i}.code" value="${escH(c.code || '')}" placeholder="SL-01"></td>
                    <td class="c">${dupDelBtns('blindCords', i)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="subcard" style="background:#fff">
            <div class="inline" style="justify-content:space-between;margin-bottom:6px">
              <b style="color:#7c2d12">📦 ชุดข้อมูลสีกล่องบังรางมู่ลี่ (${valRows.length})</b>
              <button type="button" class="primary" data-db-add="blindValances" style="padding:2px 8px;font-size:11.5px">➕ เพิ่มสีกล่อง</button>
            </div>
            <table class="ed-tbl">
              <thead><tr><th>ชื่อสีกล่องบังราง</th><th style="width:85px">รหัส</th><th style="width:68px">จัดการ</th></tr></thead>
              <tbody>
                ${valRows.map((v, i) => `
                  <tr>
                    <td><input data-db-edit="blindValances.${i}.name" value="${escH(v.name || '')}" placeholder="เช่น สีเดียวกับใบ"></td>
                    <td><input data-db-edit="blindValances.${i}.code" value="${escH(v.code || '')}" placeholder="VL-01"></td>
                    <td class="c">${dupDelBtns('blindValances', i)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeTab === 'curtains') {
      const calcBehaviorOpts = sel => CALC_BEHAVIOR_MODES.map(([v, t]) => `<option value="${escH(v)}" ${(sel || 'curtain') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
      contentHtml = renderStdParamsBanner() + `
        <div class="subcard" style="margin-bottom:8px;font-size:12px;background:#eef6ff;border:1px solid #93c5fd">
          <b>🎀 ฐานข้อมูลกลาง (แหล่งเดียวที่ใช้คำนวณทั้งระบบ): โหมดการคิดขนาด • ระยะย่น • เผื่อพับริม • เผื่อพับขอบบนล่างมาตรฐาน/ประหยัด</b><br>
          • <b>โหมดการคิดขนาด/จำนวนผืน</b>: กำหนดได้แต่ละรูปแบบว่าจะให้ <b>คำนวณตามสูตรผ้าม่าน (หลา)</b> หรือ <b>กำหนดขนาดต่อผืนเองแบบม่านม้วน/มู่ลี่ (ตร.ม.)</b><br>
          • <b>การคิดย่อยแบบย่นสำเร็จ (<code>gathered</code>)</b>: ม่านจีบ / ม่านลอน | ที่เหลือใช้ <b>แบบขึงตึง (<code>stretched</code>)</b>
        </div>
        <div class="db-tbl-scroll">
          <table class="ed-tbl" style="min-width:1390px">
            <thead>
              <tr>
                <th style="min-width:140px">ชื่อรูปแบบผ้าม่าน</th>
                <th style="width:235px">โหมดการคิดขนาด / กำหนดต่อผืน</th>
                <th style="width:170px">การคิดย่อย (ย่นสำเร็จ/ขึงตึง)</th>
                <th style="width:75px">ใช้ตะขอ</th>
                <th style="width:95px">ระยะย่น G</th>
                <th style="width:115px">พับบนล่าง HEM_TB</th>
                <th style="width:125px">พับประหยัด HEM_ECON</th>
                <th style="width:100px">พับริม HEM_SIDE</th>
                <th style="width:90px">เกย OV</th>
                <th style="width:95px">อ้อมข้าง SR</th>
                <th style="width:74px">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${masterDB.curtains.map((c, i) => `
                <tr>
                  <td><input data-db-edit="curtains.${i}.name" value="${escH(c.name)}" placeholder="เช่น ม่านจีบ"></td>
                  <td><select data-db-edit="curtains.${i}.calcBehavior">${calcBehaviorOpts(c.calcBehavior || getDefaultCalcBehavior(c.name))}</select></td>
                  <td><select data-db-edit="curtains.${i}.subCalcType">${subCalcSelectOpts(c.subCalcType || getDefaultSubCalcType(c.name))}</select></td>
                  <td class="c"><input type="checkbox" data-db-edit="curtains.${i}.useHook" ${c.useHook ? 'checked' : ''}></td>
                  <td><input type="number" step="any" data-db-edit="curtains.${i}.stdGatherRatio" value="${escH(c.stdGatherRatio ?? 2.5)}"></td>
                  <td><input type="number" step="any" data-db-edit="curtains.${i}.stdTopBottomHem" value="${escH(c.stdTopBottomHem ?? 35)}"></td>
                  <td><input type="number" step="any" data-db-edit="curtains.${i}.econTopBottomHem" value="${escH(c.econTopBottomHem ?? 0)}" title="ใช้เฉพาะหาจำนวนหน้าผ้าของเกรนม่านโปร่ง (0 = ใช้ค่ามาตรฐาน)"></td>
                  <td><input type="number" step="any" data-db-edit="curtains.${i}.stdSideHem" value="${escH(c.stdSideHem ?? 10)}"></td>
                  <td><input type="number" step="any" data-db-edit="curtains.${i}.stdOverlap" value="${escH(c.stdOverlap ?? 8)}"></td>
                  <td><input type="number" step="any" data-db-edit="curtains.${i}.stdSideReturn" value="${escH(c.stdSideReturn ?? 8)}"></td>
                  <td class="c">${dupDelBtns('curtains', i)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="curtains">➕ เพิ่มรูปแบบผ้าม่าน</button>
      `;
    } else if (activeTab === 'hooks') {
      contentHtml = `
        <p class="hint" style="margin-bottom:8px">กำหนดรายการขนาดตะขอ (แสดงให้เลือกเมื่อรูปแบบม่านเป็นม่านจีบ หรือ ม่านลอน)</p>
        <table class="ed-tbl">
          <thead><tr><th>ขนาดตะขอ</th><th style="width:82px">จัดการ</th></tr></thead>
          <tbody>
            ${masterDB.hooks.map((h, i) => `
              <tr>
                <td><input data-db-edit="hooks.${i}.name" value="${escH(h.name)}" placeholder="เช่น No.5"></td>
                <td class="c">${dupDelBtns('hooks', i)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="hooks">➕ เพิ่มขนาดตะขอ</button>
      `;
    } else if (activeTab === 'remarks') {
      contentHtml = `
        <p class="hint" style="margin-bottom:8px">กำหนดข้อความหมายเหตุสำหรับเลือกแสดงกำกับตามตำแหน่งรอบบานหน้าต่าง/ประตู (เช่น ชนแอร์, ปลั๊กไฟ, บิ้วอิน, ตู้, เตียง)</p>
        <table class="ed-tbl">
          <thead><tr><th>ข้อความหมายเหตุ</th><th style="width:82px">จัดการ</th></tr></thead>
          <tbody>
            ${masterDB.remarks.map((r, i) => `
              <tr>
                <td><input data-db-edit="remarks.${i}.name" value="${escH(r.name)}" placeholder="เช่น ชนแอร์"></td>
                <td class="c">${dupDelBtns('remarks', i)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="remarks">➕ เพิ่มข้อความหมายเหตุ</button>
      `;
    }
    body.innerHTML = renderImportBox(activeTab) + contentHtml;

    if (opts.resetScroll) {
      body.scrollTop = 0;
      body.scrollLeft = 0;
      if (modalBox) modalBox.scrollTop = 0;
    } else {
      body.scrollTop = prevBodyTop;
      body.scrollLeft = prevBodyLeft;
      if (modalBox) modalBox.scrollTop = prevModalTop;
      const newTbls = Array.from(body.querySelectorAll('.db-tbl-scroll'));
      newTbls.forEach((el, ti) => {
        if (prevTblScrolls[ti]) {
          el.scrollTop = prevTblScrolls[ti].top;
          el.scrollLeft = prevTblScrolls[ti].left;
        }
      });
      if (activeEditKey) {
        const nextInp = body.querySelector(`[data-db-edit="${activeEditKey}"]`);
        if (nextInp && typeof nextInp.focus === 'function') {
          try {
            nextInp.focus({ preventScroll: true });
            if (activeSelStart !== null && typeof nextInp.setSelectionRange === 'function') {
              nextInp.setSelectionRange(activeSelStart, activeSelEnd ?? activeSelStart);
            }
          } catch (err) {}
        }
      }
    }
  }

  function onEditChange(e) {
    if (e.target && e.target.id === 'dbImportModeSel') {
      importMode = e.target.value;
      return;
    }
    if (e.target && e.target.dataset && e.target.dataset.dbStd) {
      const stdField = e.target.dataset.dbStd;
      if (!masterDB.stdParams) masterDB.stdParams = { stdSideHem: 10, stdOverlap: 8, stdSideReturn: 8 };
      masterDB.stdParams[stdField] = parseFloat(e.target.value) || 0;
      saveMasterDB();
      return;
    }
    const k = e.target.dataset.dbEdit;
    if (!k) return;
    const [list, idx, field] = k.split('.');
    if (masterDB[list] && masterDB[list][+idx]) {
      let val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      masterDB[list][+idx][field] = val;
      if (list === 'fabrics' && field === 'fabricWidth') {
        const allowSheer = canFabricUseSheerGrain(val);
        if (!allowSheer) {
          masterDB.fabrics[+idx].calcMode = 'opaque';
        }
        // อัปเดตเฉพาะช่อง select เกรนในแถวเดียวกัน (ไม่ re-render ทั้งหน้าต่าง เพื่อไม่ให้หน้ากระตุก/หลุดโฟกัส)
        const tr = e.target.closest('tr');
        const modeSel = tr && tr.querySelector(`select[data-db-edit="fabrics.${idx}.calcMode"]`);
        if (modeSel) {
          const curMode = allowSheer ? (masterDB.fabrics[+idx].calcMode || 'both') : 'opaque';
          modeSel.disabled = !allowSheer;
          modeSel.title = allowSheer ? '' : 'ขนาดหน้าผ้าต้องเกิน 270 ซม. จึงจะเลือกเกรนม่านโปร่งได้';
          modeSel.innerHTML = `
            <option value="opaque" ${curMode === 'opaque' ? 'selected' : ''}>เกรนม่านทึบเท่านั้น ${allowSheer ? '' : '(หน้าผ้า ≤ 270 ซม.)'}</option>
            <option value="both" ${curMode === 'both' ? 'selected' : ''} ${allowSheer ? '' : 'disabled'}>ทั้งเกรนม่านทึบและเกรนม่านโปร่ง (หน้าผ้า &gt; 270 ซม.)</option>
            <option value="sheer" ${curMode === 'sheer' ? 'selected' : ''} ${allowSheer ? '' : 'disabled'}>เกรนม่านโปร่ง (หน้าผ้า &gt; 270 ซม.)</option>
          `;
        }
        saveMasterDB();
        return;
      }
      if (list === 'blinds' && field === 'model') {
        masterDB.blinds[+idx].group = val;
        masterDB.blinds[+idx].name = val;
      }
      if (list === 'heightFormulas' && field === 'railGroup') {
        const grp = String(val || '*').trim();
        const curRail = masterDB.heightFormulas[+idx].railName;
        if (grp !== '*' && curRail && curRail !== '*') {
          const inGrp = (masterDB.rails || []).some(r => String(r.railGroup || '').trim() === grp && String(r.name || '').trim() === curRail);
          if (!inGrp) masterDB.heightFormulas[+idx].railName = '*';
        }
        // อัปเดตเฉพาะช่องรายการรางและข้อความในกลุ่มในแถวเดียวกัน (ไม่ re-render ทั้งหน้าต่าง เพื่อไม่ให้สโครลเด้งขึ้นบน)
        const tr = e.target.closest('tr');
        const railSel = tr && tr.querySelector(`select[data-db-edit="heightFormulas.${idx}.railName"]`);
        if (railSel) {
          railSel.innerHTML = railNameSelectOpts(masterDB.heightFormulas[+idx].railName || '*', grp);
        }
        const hintEl = tr && tr.querySelector('.hf-grp-rails');
        if (hintEl) {
          const grpRails = (grp && grp !== '*')
            ? (masterDB.rails || []).filter(r => String(r.railGroup || '').trim() === grp).map(r => r.name).filter(Boolean)
            : [];
          hintEl.textContent = grpRails.length ? `ในกลุ่ม: ${grpRails.join(', ')}` : '';
          hintEl.style.display = grpRails.length ? '' : 'none';
        }
        saveMasterDB();
        return;
      }
      saveMasterDB();
    }
  }

  function init(cb) {
    onUpdate = cb;
    refreshRemarksDatalist();
    const modal = document.getElementById('dbModal');
    let fileInput = document.getElementById('dbImportFileInput');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'dbImportFileInput';
      fileInput.accept = '.txt,.csv,text/plain,text/csv';
      fileInput.hidden = true;
      document.body.appendChild(fileInput);
      fileInput.addEventListener('change', e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const targetTab = fileInput.dataset.targetTab || activeTab;
        const rd = new FileReader();
        rd.onload = () => {
          importTextIntoTab(targetTab, rd.result, importMode);
          fileInput.value = '';
        };
        rd.readAsText(f, 'UTF-8');
      });
    }
    document.querySelectorAll('[data-dbtab]').forEach(b => {
      b.addEventListener('click', () => {
        activeTab = b.dataset.dbtab;
        importStatusMsg = '';
        branchStatusMsg = '';
        showPasteBox = false;
        render({ resetScroll: true });
      });
    });
    const commitNewBranchesFromInput = (shouldRender = true) => {
      const inp = document.getElementById('dbNewBranchInput');
      const val = String((inp && inp.value) || '').trim();
      if (!val) return false;
      if (!Array.isArray(masterDB.branches)) masterDB.branches = [];
      const added = [];
      val.split(/[,;\n/|]+/).map(s => s.trim()).filter(Boolean).forEach(b => {
        if (!masterDB.branches.includes(b)) {
          masterDB.branches.push(b);
          added.push(b);
        }
      });
      if (inp) inp.value = '';
      if (added.length) {
        branchStatusMsg = `✔ เพิ่มสาขา "${added.join(', ')}" และบันทึกเรียบร้อยแล้ว`;
      } else {
        branchStatusMsg = `ℹ️ สาขา "${val}" มีอยู่ในระบบแล้ว`;
      }
      saveMasterDB();
      if (typeof RealtimeSync !== 'undefined' && typeof RealtimeSync.flushNow === 'function') {
        RealtimeSync.flushNow();
      }
      if (shouldRender) render();
      if (onUpdate) onUpdate();
      return true;
    };
    document.getElementById('dbClose').addEventListener('click', () => {
      closeMultiStyleMenu();
      // หากมีชื่อสาขาค้างอยู่ในช่องเพิ่มสาขาก่อนกดปิด ให้บันทึกให้อัตโนมัติด้วย
      commitNewBranchesFromInput(false);
      if (typeof RealtimeSync !== 'undefined' && typeof RealtimeSync.flushNow === 'function') {
        RealtimeSync.flushNow();
      }
      modal.hidden = true;
      if (onUpdate) onUpdate();
    });
    modal.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target && e.target.id === 'dbNewBranchInput') {
        e.preventDefault();
        commitNewBranchesFromInput(true);
      }
    });
    modal.addEventListener('input', onEditChange);
    modal.addEventListener('change', onEditChange);
    modal.addEventListener('click', e => {
      const gotoBtn = e.target.closest('[data-db-goto]');
      if (gotoBtn) {
        activeTab = gotoBtn.dataset.dbGoto || 'curtains';
        importStatusMsg = '';
        showPasteBox = false;
        render({ resetScroll: true });
        return;
      }
      const sortBtn = e.target.closest('[data-db-sort]');
      if (sortBtn) {
        sortTabByName(activeTab, sortBtn.dataset.dbSort || 'asc');
        return;
      }
      const wLayerBtn = e.target.closest('[data-db-wlayer-filter]');
      if (wLayerBtn) {
        widthLayerFilter = wLayerBtn.dataset.dbWlayerFilter || 'all';
        render();
        return;
      }
      const grainBtn = e.target.closest('[data-db-grain-filter]');
      if (grainBtn) {
        fabricGrainFilter = grainBtn.dataset.dbGrainFilter || 'all';
        render();
        return;
      }
      const railFilterBtn = e.target.closest('[data-db-rail-filter]');
      if (railFilterBtn) {
        railCatFilter = railFilterBtn.dataset.dbRailFilter || 'all';
        render();
        return;
      }
      if (e.target.closest('[data-db-apply-std]')) {
        const sp = masterDB.stdParams || { stdSideHem: 10, stdOverlap: 8, stdSideReturn: 8 };
        (masterDB.curtains || []).forEach(c => {
          if (!isBlindOrRollerStyle(c.name) && c.name !== 'ม่านพับ') {
            c.stdSideHem = sp.stdSideHem ?? 10;
            c.stdOverlap = sp.stdOverlap ?? 8;
            c.stdSideReturn = sp.stdSideReturn ?? 8;
          }
        });
        (masterDB.widthFormulas || []).forEach(wf => {
          const st = getStdCurtainParams(wf.curtainStyle);
          wf.gatherRatio = st.gatherRatio;
          if (wf.subCalcType === 'gathered' || isGatheredCurtainStyle(wf.curtainStyle)) {
            if (+wf.pieces > 1) wf.overlap = sp.stdOverlap ?? 8;
            wf.sideReturn = sp.stdSideReturn ?? 8;
          }
        });
        (masterDB.fabricCalcRules || []).forEach(r => {
          const st = getStdCurtainParams(r.curtainStyle);
          r.sideHem = sp.stdSideHem ?? 10;
          r.gatherRatio = st.gatherRatio;
          r.topBottomHem = st.topBottomHem;
          r.econTopBottomHem = st.econTopBottomHem;
        });
        saveMasterDB();
        importStatusMsg = `✔ อัปเดตค่ามาตรฐาน (เผื่อเย็บริม=${sp.stdSideHem ?? 10}, อ้อมข้าง=${sp.stdSideReturn ?? 8}, เกย=${sp.stdOverlap ?? 8}) ลงในฐานข้อมูลเรียบร้อยแล้ว`;
        render();
        if (onUpdate) onUpdate();
        return;
      }
      const impFileBtn = e.target.closest('[data-db-import-file]');
      if (impFileBtn) {
        fileInput.dataset.targetTab = impFileBtn.dataset.dbImportFile || activeTab;
        fileInput.click();
        return;
      }
      const togglePasteBtn = e.target.closest('[data-db-toggle-paste]');
      if (togglePasteBtn) {
        showPasteBox = !showPasteBox;
        importStatusMsg = '';
        render();
        return;
      }
      if (e.target.closest('[data-db-cancel-paste]')) {
        showPasteBox = false;
        render();
        return;
      }
      const runPasteBtn = e.target.closest('[data-db-run-paste]');
      if (runPasteBtn) {
        const ta = document.getElementById('dbPasteTextarea');
        if (ta && ta.value.trim()) {
          importTextIntoTab(runPasteBtn.dataset.dbRunPaste || activeTab, ta.value, importMode);
        } else {
          alert('กรุณาวางข้อความตามรูปแบบที่กำหนดก่อนกดนำเข้า');
        }
        return;
      }
      const dlSampleBtn = e.target.closest('[data-db-dl-sample]');
      if (dlSampleBtn) {
        downloadSampleForTab(dlSampleBtn.dataset.dbDlSample || activeTab);
        return;
      }
      const addBranchBtn = e.target.closest('[data-db-add-branch]');
      if (addBranchBtn) {
        commitNewBranchesFromInput(true);
        return;
      }
      const delBranchBtn = e.target.closest('[data-db-del-branch]');
      if (delBranchBtn) {
        const br = delBranchBtn.dataset.dbDelBranch;
        masterDB.branches = (masterDB.branches || []).filter(b => b !== br);
        (masterDB.staff || []).forEach(st => {
          const list = String(st.branch || '').split(/[,;\n/|]+/).map(s => s.trim()).filter(b => b && b !== br);
          st.branch = list.join(', ');
        });
        branchStatusMsg = `✔ ลบสาขา "${br}" และบันทึกเรียบร้อยแล้ว`;
        saveMasterDB();
        if (typeof RealtimeSync !== 'undefined' && typeof RealtimeSync.flushNow === 'function') {
          RealtimeSync.flushNow();
        }
        render();
        if (onUpdate) onUpdate();
        return;
      }
      const togStBr = e.target.closest('[data-db-toggle-stbranch]');
      if (togStBr) {
        const si = +togStBr.dataset.dbToggleStbranch;
        const br = togStBr.dataset.br;
        const st = masterDB.staff && masterDB.staff[si];
        if (st && br) {
          const cur = String(st.branch || '').split(/[,;\n/|]+/).map(s => s.trim()).filter(Boolean);
          const idx = cur.indexOf(br);
          const isNowOn = idx < 0;
          if (idx >= 0) cur.splice(idx, 1);
          else cur.push(br);
          st.branch = cur.join(', ');
          // อัปเดตเฉพาะช่องสาขาและปุ่มในแถวเดิมโดยไม่ re-render ทั้งหน้าต่าง (ไม่กระตุกสโครล)
          const td = togStBr.closest('td');
          const inp = td && td.querySelector(`input[data-db-edit="staff.${si}.branch"]`);
          if (inp) inp.value = st.branch;
          togStBr.textContent = (isNowOn ? '✓ ' : '+ ') + br;
          togStBr.style.cssText = `padding:1px 6px;font-size:10.5px;border-radius:999px;${isNowOn ? 'background:#1d4ed8;color:#fff;border-color:#1d4ed8;font-weight:700' : 'background:#f8fafc;color:#475569;border-color:#cbd5e1'}`;
          saveMasterDB();
          if (typeof RealtimeSync !== 'undefined' && typeof RealtimeSync.flushNow === 'function') {
            RealtimeSync.flushNow();
          }
          if (onUpdate) onUpdate();
        }
        return;
      }
      const msOpenBtn = e.target.closest('[data-db-ms-open]');
      if (msOpenBtn) {
        e.stopPropagation();
        const [lk, idxStr] = msOpenBtn.dataset.dbMsOpen.split('.');
        openMultiStyleMenu(lk, +idxStr, msOpenBtn);
        return;
      }
      const dupBtn = e.target.closest('[data-db-dup]');
      if (dupBtn) {
        const [list, idxStr] = dupBtn.dataset.dbDup.split('.');
        const idx = +idxStr;
        if (Array.isArray(masterDB[list]) && masterDB[list][idx]) {
          const clone = JSON.parse(JSON.stringify(masterDB[list][idx]));
          clone.id = 'dup_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
          if (list === 'staff') {
            clone.username = '';
            clone.password = '';
            clone.role = 'staff';
            if (clone.name && !String(clone.name).includes('(สำเนา)')) clone.name = `${clone.name} (สำเนา)`;
          } else if (clone.label && !String(clone.label).includes('(สำเนา)')) {
            clone.label = `${clone.label} (สำเนา)`;
          } else if (clone.name && !clone.label && !String(clone.name).includes('(สำเนา)')) {
            clone.name = `${clone.name} (สำเนา)`;
          } else if (clone.model && !clone.label && !String(clone.model).includes('(สำเนา)')) {
            clone.model = `${clone.model} (สำเนา)`;
            clone.group = clone.model;
            clone.name = clone.model;
          }
          masterDB[list].splice(idx + 1, 0, clone);
          saveMasterDB();
          render();
        }
        return;
      }
      const add = e.target.closest('[data-db-add]');
      if (add) {
        const t = add.dataset.dbAdd;
        const id = 'id_' + Date.now();
        const sp = masterDB.stdParams || { stdSideHem: 10, stdOverlap: 8, stdSideReturn: 8 };
        if (t === 'staff') {
          masterDB.staff.push({ id, username: '', password: '', role: 'staff', name: '', dept: '', branch: '' });
        } else if (t === 'fabrics') {
          masterDB.fabrics.push({ id, name: '', design: '', fabricWidth: 140, yRepeat: 0, calcMode: 'opaque' });
        } else if (t === 'rails') {
          const cat = add.dataset.cat || 'รางม่านจีบ';
          masterDB.rails.push({
            id, name: '', rodCategory: cat, curtainStyle: '*',
            sellUnit: cat === 'รางโชว์' ? 'ชุด' : 'เมตร',
            minLength: cat === 'รางโชว์' ? 2.0 : 1.0,
            setRanges: cat === 'รางโชว์' ? '0-2.00=1, 2.01-2.99=1, 3.00-4.00=2' : '',
            defaultColor: '', spec: '',
          });
        } else if (t === 'accessories') {
          masterDB.accessories.push({
            id, name: '', category: 'ด้ามจูง', curtainStyle: '*',
            sellUnit: 'ชิ้น', defaultColor: '', spec: '',
          });
        } else if (t === 'blinds') {
          masterDB.blinds.push({ id, model: '', group: '', name: '', codes: '', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' });
        } else if (t === 'blindCords') {
          if (!Array.isArray(masterDB.blindCords)) masterDB.blindCords = [];
          masterDB.blindCords.push({ id, cordType: add.dataset.cordtype === 'เชือกสลิง' ? 'เชือกสลิง' : 'เชือกเทป', name: '', code: '' });
        } else if (t === 'blindValances') {
          if (!Array.isArray(masterDB.blindValances)) masterDB.blindValances = [];
          masterDB.blindValances.push({ id, name: '', code: '' });
        } else if (t === 'curtains') {
          masterDB.curtains.push({
            id, name: '', calcBehavior: 'curtain', subCalcType: 'stretched', useHook: false,
            stdGatherRatio: 2.0, stdTopBottomHem: 35, econTopBottomHem: 25,
            stdSideHem: sp.stdSideHem ?? 10, stdOverlap: 0, stdSideReturn: 0,
          });
        } else if (t === 'hooks') {
          masterDB.hooks.push({ id, name: '' });
        } else if (t === 'remarks') {
          masterDB.remarks.push({ id, name: '' });
        } else if (t === 'widthFormulas') {
          const wLayer = add.dataset.wlayer || (widthLayerFilter !== 'all' ? widthLayerFilter : 'both');
          masterDB.widthFormulas.push({
            id, curtainStyle: 'ม่านจีบ', subCalcType: 'gathered', layerType: wLayer, rodType: '*', railTracks: '*', pieces: '*',
            label: wLayer === 'opaque' ? 'เงื่อนไขความกว้างม่านทึบใหม่' : (wLayer === 'sheer' ? 'เงื่อนไขความกว้างม่านโปร่งใหม่' : 'เงื่อนไขความกว้างใหม่'),
            railWidth: 'RW',
            overlap: sp.stdOverlap ?? 8, sideReturn: sp.stdSideReturn ?? 8,
            widthExp: '((RW / P) + OV + SR)', roundMode: 'ceil_int',
          });
        } else if (t === 'heightFormulas') {
          masterDB.heightFormulas.push({
            id, curtainStyle: 'ม่านจีบ', rodType: 'รางม่านจีบ', railGroup: '*', railName: '*', railTracks: '*', pieces: '*', hookSize: '*', floorFloat: 1,
            label: 'เงื่อนไขความสูงใหม่ (ลอยพื้น 1 ซม.)', heightExp: 'RH - FL_BASE', roundMode: 'none',
          });
        } else if (t === 'fabricCalcRules') {
          const gType = add.dataset.grain || (fabricGrainFilter === 'sheer' ? 'sheer' : 'opaque');
          const subCalc = add.dataset.subcalc || 'gathered';
          const isSheer = gType === 'sheer';
          const isGathered = subCalc === 'gathered';
          masterDB.fabricCalcRules.push({
            id,
            curtainStyle: isGathered ? 'ม่านจีบ' : 'ม่านตาไก่',
            grainType: gType,
            subCalcType: subCalc,
            label: `${isSheer ? 'เกรนม่านโปร่ง' : 'เกรนม่านทึบ'} (${isGathered ? 'แบบย่นสำเร็จ' : 'แบบขึงตึง'}) ใหม่`,
            gatherRatio: isGathered ? 2.5 : 2.2,
            sideHem: sp.stdSideHem ?? 10,
            topBottomHem: 35,
            econTopBottomHem: 25,
            panelRoundMode: isSheer ? 'ceil' : 'ceil_plus1_if_frac_ge',
            panelFracThreshold: 0.9,
            panelExtraAdd: isSheer ? 0 : 1,
            panelCountExp: isSheer
              ? 'CEIL((HC + HEM_TB_SHEER_PANEL) / FW_FAB)'
              : (isGathered ? 'PANEL_ROUND((((WC * G) + HEM_SIDE) * P) / FW_FAB)' : 'PANEL_ROUND(((WC + HEM_SIDE) * P) / FW_FAB)'),
            yRepeatCountExp: isSheer ? '0' : 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
            qtyExp: isSheer
              ? (isGathered ? '(((WC * G) + HEM_SIDE) * P * 1.05) / 91.44' : '((WC + HEM_SIDE) * P * 1.05) / 91.44')
              : '((YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB)) * PANELS * 1.05) / 91.44',
            roundMode: 'ceil_1dec',
          });
        }
        saveMasterDB(); render(); return;
      }
      const del = e.target.closest('[data-db-del]');
      if (del) {
        const [list, idx] = del.dataset.dbDel.split('.');
        if (list === 'staff' && masterDB.staff[+idx] && String(masterDB.staff[+idx].username).toUpperCase() === 'T58121') {
          alert('ไม่สามารถลบบัญชีแอดมินตั้งต้น (T58121) ได้');
          return;
        }
        masterDB[list].splice(+idx, 1);
        saveMasterDB();
        if (typeof RealtimeSync !== 'undefined' && typeof RealtimeSync.flushNow === 'function') {
          RealtimeSync.flushNow();
        }
        render();
      }
    });
  }

  function open(tab = 'staff') {
    if (typeof isAdminUser === 'function' && !isAdminUser()) {
      alert('เฉพาะแอดมินเท่านั้นที่สามารถเข้าใช้เมนูฐานข้อมูลได้');
      return;
    }
    activeTab = tab;
    render({ resetScroll: true });
    document.getElementById('dbModal').hidden = false;
  }

  return { init, open };
})();
