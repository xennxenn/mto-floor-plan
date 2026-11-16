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
const DB_KEY = 'mto-master-db-v7';

const ROD_TYPES_LIST = [
  'รางม่านจีบ',
  'รางโชว์',
  'รางม่านลอน',
  'รางม่านพับ',
  'ด้ามจูง',
  'ตะขอเกี่ยวสายรวบ',
  'ห่วงตาไก่',
  'อุปกรณ์เสริม',
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
  ['ceil', 'ปัดเศษขึ้นเป็นจำนวนเต็มเสมอ (CEIL)'],
  ['round', 'ปัดเศษตามเกณฑ์ปกติ (≥ 0.5 ปัดขึ้น)'],
  ['floor', 'ปัดเศษลงเป็นจำนวนเต็ม (FLOOR)'],
];

const ROUND_MODES = [
  ['ceil_1dec', 'ปัดเศษขึ้นเป็นทศนิยม 1 ตำแหน่ง (CEIL1)'],
  ['ceil_int', 'ปัดเศษขึ้นเป็นจำนวนเต็ม (CEIL)'],
  ['floor_int', 'ปัดเศษลงเป็นจำนวนเต็ม (FLOOR)'],
  ['none', 'ทศนิยมตามจริง (ไม่ปัดเศษ)'],
];

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
    stdParams: {
      stdSideHem: 10,     // เผื่อเย็บริมผ้ามาตรฐาน = 10 ซม.
      stdOverlap: 8,      // เกยมาตรฐาน = 8 ซม.
      stdSideReturn: 8,   // อ้อมข้างมาตรฐาน = 8 ซม.
    },
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
    // รูปแบบผ้าม่าน พร้อมค่ามาตรฐานประจำแต่ละรูปแบบ (ระยะย่น, เผื่อเย็บบนล่าง, เผื่อเย็บริม=10, เกย=8, อ้อมข้าง=8)
    curtains: [
      { id: 'c1', name: 'ม่านจีบ', useHook: true, stdGatherRatio: 2.5, stdTopBottomHem: 35, stdSideHem: 10, stdOverlap: 8, stdSideReturn: 8 },
      { id: 'c2', name: 'ม่านลอน', useHook: true, stdGatherRatio: 2.2, stdTopBottomHem: 30, stdSideHem: 10, stdOverlap: 8, stdSideReturn: 8 },
      { id: 'c3', name: 'ม่านตาไก่', useHook: false, stdGatherRatio: 2.2, stdTopBottomHem: 35, stdSideHem: 10, stdOverlap: 8, stdSideReturn: 8 },
      { id: 'c4', name: 'ม่านพับ', useHook: false, stdGatherRatio: 1.0, stdTopBottomHem: 40, stdSideHem: 10, stdOverlap: 0, stdSideReturn: 0 },
      { id: 'c5', name: 'ม่านม้วน', useHook: false, stdGatherRatio: 1.0, stdTopBottomHem: 0, stdSideHem: 0, stdOverlap: 0, stdSideReturn: 0 },
      { id: 'c6', name: 'มู่ลี่ไม้', useHook: false, stdGatherRatio: 1.0, stdTopBottomHem: 0, stdSideHem: 0, stdOverlap: 0, stdSideReturn: 0 },
      { id: 'c7', name: 'มู่ลี่อลูมิเนียม', useHook: false, stdGatherRatio: 1.0, stdTopBottomHem: 0, stdSideHem: 0, stdOverlap: 0, stdSideReturn: 0 },
      { id: 'c8', name: 'ม่านปรับแสง', useHook: false, stdGatherRatio: 1.0, stdTopBottomHem: 0, stdSideHem: 0, stdOverlap: 0, stdSideReturn: 0 },
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
        calcMode: 'opaque', // <= 270: เกรนม่านทึบเท่านั้น
      },
      {
        id: 'fab2',
        name: 'PASAYA Jacquard Pattern',
        design: 'JQ-145',
        fabricWidth: 145,
        yRepeat: 32,
        calcMode: 'opaque', // <= 270: เกรนม่านทึบเท่านั้น
      },
      {
        id: 'fab3',
        name: 'PASAYA Wide Blackout 280',
        design: 'WBO-280',
        fabricWidth: 280,
        yRepeat: 0,
        calcMode: 'both', // > 270: คำนวณได้ทั้งเกรนม่านทึบและเกรนม่านโปร่ง
      },
      {
        id: 'fab4',
        name: 'PASAYA Sheer Voile 300',
        design: 'SH-300',
        fabricWidth: 300,
        yRepeat: 0,
        calcMode: 'both', // > 270: คำนวณได้ทั้งเกรนม่านทึบและเกรนม่านโปร่ง
      },
    ],
    // ฐานข้อมูลรางม่านและอุปกรณ์เสริม
    rails: [
      { id: 'rl1', name: 'รางม่านจีบ มาตรฐาน (M)', rodCategory: 'รางม่านจีบ', curtainStyle: 'ม่านจีบ', defaultColor: 'ขาว', spec: 'รางอลูมิเนียมลื่นพิเศษ' },
      { id: 'rl2', name: 'รางโชว์ 28 มม.', rodCategory: 'รางโชว์', curtainStyle: 'ม่านตาไก่', defaultColor: 'ดำ', spec: 'เส้นผ่านศูนย์กลาง 28 มม. พร้อมหัวปิดราง' },
      { id: 'rl3', name: 'รางโชว์ใช้กับม่านจีบ (พร้อมห่วง)', rodCategory: 'รางโชว์', curtainStyle: 'ม่านจีบ', defaultColor: 'เงิน', spec: 'รางโชว์พร้อมห่วงตาไก่คล้องตะขอ' },
      { id: 'rl4', name: 'รางม่านลอน S-Curve', rodCategory: 'รางม่านลอน', curtainStyle: 'ม่านลอน', defaultColor: 'ขาว', spec: 'โซ่เว้นระยะลอนมาตรฐาน' },
      { id: 'rl5', name: 'รางม่านพับ Roman', rodCategory: 'รางม่านพับ', curtainStyle: 'ม่านพับ', defaultColor: 'ขาว', spec: 'ชุดรางโซ่ดึงม่านพับ' },
      { id: 'rl6', name: 'ด้ามจูงอะคริลิค 120 ซม.', rodCategory: 'ด้ามจูง', curtainStyle: '*', defaultColor: 'ใส', spec: 'ขนาดมาตรฐาน 120 ซม.' },
      { id: 'rl7', name: 'ด้ามจูงอลูมิเนียม 120 ซม.', rodCategory: 'ด้ามจูง', curtainStyle: '*', defaultColor: 'ขาว', spec: 'ขนาดมาตรฐาน 120 ซม.' },
      { id: 'rl8', name: 'ด้ามจูงลายไม้ 120 ซม.', rodCategory: 'ด้ามจูง', curtainStyle: '*', defaultColor: 'ลายไม้', spec: 'ขนาดมาตรฐาน 120 ซม.' },
      { id: 'rl9', name: 'ตะขอเกี่ยวสายรวบมาตรฐาน', rodCategory: 'ตะขอเกี่ยวสายรวบ', curtainStyle: '*', defaultColor: 'เงิน', spec: 'มีสี เงิน / ดำ / ทองเหลือง / ทองแดง' },
      { id: 'rl10', name: 'ตะขอเกี่ยวสายรวบคริสตัล', rodCategory: 'ตะขอเกี่ยวสายรวบ', curtainStyle: '*', defaultColor: 'เงิน', spec: 'หัวคริสตัล' },
      { id: 'rl11', name: 'ห่วงตาไก่ แบบเรียบ', rodCategory: 'ห่วงตาไก่', curtainStyle: 'ม่านตาไก่', defaultColor: 'สีเงิน', spec: 'สีเงิน / ทองเหลือง / ทองแดง' },
      { id: 'rl12', name: 'ห่วงตาไก่ แบบลอน / แบบคลื่น', rodCategory: 'ห่วงตาไก่', curtainStyle: 'ม่านตาไก่', defaultColor: 'ทองเหลือง', spec: 'ทองเหลือง / ทองแดง' },
    ],
    // ฐานข้อมูลมู่ลี่และม่านม้วน (คำนวณเป็นตารางเมตร ขายขั้นต่ำ 1.5 ตร.ม./ผืน)
    blinds: [
      { id: 'bl1', name: 'ม่านม้วน Blackout', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl2', name: 'ม่านม้วน Sunscreen', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl3', name: 'ม่านม้วน Dimout', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl4', name: 'มู่ลี่ไม้ Basswood 50 มม.', curtainStyle: 'มู่ลี่ไม้', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl5', name: 'มู่ลี่อลูมิเนียม 25 มม.', curtainStyle: 'มู่ลี่อลูมิเนียม', minSqm: 1.5, roundMode: 'ceil_1dec' },
    ],
    // ฐานข้อมูลขนาดความกว้างผ้าม่าน แยกตามเงื่อนไข: รูปแบบผ้าม่าน, จำนวนผืน (P), จำนวนรางม่าน(ชั้น), ประเภทรางม่าน
    // มาตรฐาน: อ้อมข้าง = 8, เกย = 8
    widthFormulas: [
      {
        id: 'wf1',
        curtainStyle: 'ม่านจีบ',
        rodType: '*',
        railTracks: '*',
        pieces: 2,
        label: 'ม่านจีบ 2 ผืน แยกกลาง มาตรฐาน (ย่น 2.5, เกย 8, อ้อมข้าง 8)',
        railWidth: 'RW',
        gatherRatio: 2.5,
        overlap: 8,
        sideReturn: 8,
        widthExp: '((RW + OV + SR) / P)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf2',
        curtainStyle: 'ม่านจีบ',
        rodType: '*',
        railTracks: '*',
        pieces: 1,
        label: 'ม่านจีบ 1 ผืน รวบข้างเดียว (ย่น 2.5, เกย 0, อ้อมข้าง 8)',
        railWidth: 'RW',
        gatherRatio: 2.5,
        overlap: 0,
        sideReturn: 8,
        widthExp: '(RW + OV + SR)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf3',
        curtainStyle: 'ม่านลอน',
        rodType: '*',
        railTracks: '*',
        pieces: 2,
        label: 'ม่านลอน 2 ผืน แยกกลาง (ย่น 2.2, เกย 8, อ้อมข้าง 8)',
        railWidth: 'RW',
        gatherRatio: 2.2,
        overlap: 8,
        sideReturn: 8,
        widthExp: '((RW + OV + SR) / P)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf4',
        curtainStyle: 'ม่านลอน',
        rodType: '*',
        railTracks: '*',
        pieces: 1,
        label: 'ม่านลอน 1 ผืน รวบข้างเดียว (ย่น 2.2, เกย 0, อ้อมข้าง 8)',
        railWidth: 'RW',
        gatherRatio: 2.2,
        overlap: 0,
        sideReturn: 8,
        widthExp: '(RW + OV + SR)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf5',
        curtainStyle: 'ม่านตาไก่',
        rodType: 'รางโชว์',
        railTracks: '*',
        pieces: 2,
        label: 'ม่านตาไก่ 2 ผืน แยกกลาง (ย่น 2.2, เกย 8, อ้อมข้าง 8)',
        railWidth: 'RW',
        gatherRatio: 2.2,
        overlap: 8,
        sideReturn: 8,
        widthExp: '((RW + OV + SR) / P)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf6',
        curtainStyle: 'ม่านพับ',
        rodType: 'รางม่านพับ',
        railTracks: '*',
        pieces: 1,
        label: 'ม่านพับ 1 ผืน (กว้างเท่ากับราง RW)',
        railWidth: 'RW',
        gatherRatio: 1.0,
        overlap: 0,
        sideReturn: 0,
        widthExp: 'RW',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf7',
        curtainStyle: 'ม่านม้วน',
        rodType: '*',
        railTracks: '*',
        pieces: 1,
        label: 'ม่านม้วน 1 ผืน (กว้างเท่ากับราง RW)',
        railWidth: 'RW',
        gatherRatio: 1.0,
        overlap: 0,
        sideReturn: 0,
        widthExp: 'RW',
        roundMode: 'none',
      },
    ],
    // ฐานข้อมูลขนาดความสูงผ้าม่านตามเงื่อนไข: รูปแบบผ้าม่าน + ประเภทรางม่าน + จำนวนราง(ชั้น) + จำนวนผืน + ขนาดตะขอ
    heightFormulas: [
      {
        id: 'hf1',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        railTracks: '*',
        pieces: '*',
        hookSize: 'No.5',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.5 (หัก 1.5 ซม.)',
        heightExp: 'RH - 1.5',
        roundMode: 'none',
      },
      {
        id: 'hf2',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        railTracks: '*',
        pieces: '*',
        hookSize: 'No.6',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.6 (หัก 2 ซม.)',
        heightExp: 'RH - 2',
        roundMode: 'none',
      },
      {
        id: 'hf3',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        railTracks: '*',
        pieces: '*',
        hookSize: 'No.8',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.8 (หัก 1 ซม.)',
        heightExp: 'RH - 1',
        roundMode: 'none',
      },
      {
        id: 'hf4',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        railTracks: '*',
        pieces: '*',
        hookSize: 'No.9',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.9 (เท่าความสูงราง RH)',
        heightExp: 'RH',
        roundMode: 'none',
      },
      {
        id: 'hf5',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางโชว์',
        railTracks: '*',
        pieces: '*',
        hookSize: '*',
        label: 'ม่านจีบ + รางโชว์ (หักหัวรางโชว์ 4 ซม.)',
        heightExp: 'RH - 4',
        roundMode: 'none',
      },
      {
        id: 'hf6',
        curtainStyle: 'ม่านลอน',
        rodType: 'รางม่านลอน',
        railTracks: '*',
        pieces: '*',
        hookSize: '*',
        label: 'ม่านลอน + รางม่านลอน (หักราง 2.5 ซม.)',
        heightExp: 'RH - 2.5',
        roundMode: 'none',
      },
      {
        id: 'hf7',
        curtainStyle: 'ม่านตาไก่',
        rodType: 'รางโชว์',
        railTracks: '*',
        pieces: '*',
        hookSize: '*',
        label: 'ม่านตาไก่ + รางโชว์ (บวกหัวม่านเหนือราง +3 ซม.)',
        heightExp: 'RH + 3',
        roundMode: 'none',
      },
      {
        id: 'hf8',
        curtainStyle: 'ม่านพับ',
        rodType: 'รางม่านพับ',
        railTracks: '*',
        pieces: '*',
        hookSize: '*',
        label: 'ม่านพับ + รางม่านพับ (เท่าความสูงราง RH)',
        heightExp: 'RH',
        roundMode: 'none',
      },
      {
        id: 'hf9',
        curtainStyle: '*',
        rodType: '*',
        railTracks: '*',
        pieces: '*',
        hookSize: '*',
        label: 'ทั่วไป: เท่ากับความสูงราง (RH = สูงเฟรม + เผื่อบน + เผื่อล่าง)',
        heightExp: 'RH',
        roundMode: 'none',
      },
    ],
    // ฐานข้อมูลคำนวณปริมาณผ้า แยกเกรนม่านทึบ (opaque) และเกรนม่านโปร่ง (sheer)
    // เผื่อเย็บริมผ้ามาตรฐาน = 10, เผื่อเย็บบนล่างตามแต่ละรูปแบบผ้าม่าน, ระยะย่นตามแต่ละรูปแบบผ้าม่าน
    // เกรนม่านทึบ: หากคำนวณหน้าผ้าแล้วได้เศษทศนิยม >= 0.9 ขึ้นไป ให้ปัดเศษขึ้นเป็นจำนวนเต็มและ +1
    fabricCalcRules: [
      {
        id: 'fcr1',
        curtainStyle: 'ม่านจีบ',
        grainType: 'opaque',
        label: 'เกรนม่านทึบ - ม่านจีบ (ย่น 2.5 • เย็บริม 10 • เย็บบนล่าง 35 • เศษหน้า ≥0.9 ปัดขึ้น+1)',
        fabricWidth: 140,
        yRepeat: 0,
        gatherRatio: 2.5,
        sideHem: 10,
        topBottomHem: 35,
        pieces: 2,
        panelRoundMode: 'ceil_plus1_if_frac_ge',
        panelFracThreshold: 0.9,
        panelExtraAdd: 1,
        panelCountExp: 'PANEL_ROUND(((WC * G) + HEM_SIDE) / FW_FAB) * P',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr2',
        curtainStyle: 'ม่านจีบ',
        grainType: 'sheer',
        label: 'เกรนม่านโปร่ง - ม่านจีบ (กลับหน้าผ้า >270 • ย่น 2.5 • เย็บริม 10 • เย็บบนล่าง 35)',
        fabricWidth: 300,
        yRepeat: 0,
        gatherRatio: 2.5,
        sideHem: 10,
        topBottomHem: 35,
        pieces: 2,
        panelRoundMode: 'ceil',
        panelFracThreshold: 0.9,
        panelExtraAdd: 0,
        panelCountExp: 'P',
        yRepeatCountExp: '0',
        qtyExp: '(((WC * G) + HEM_SIDE) * P) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr3',
        curtainStyle: 'ม่านลอน',
        grainType: 'opaque',
        label: 'เกรนม่านทึบ - ม่านลอน (ย่น 2.2 • เย็บริม 10 • เย็บบนล่าง 30 • เศษหน้า ≥0.9 ปัดขึ้น+1)',
        fabricWidth: 140,
        yRepeat: 0,
        gatherRatio: 2.2,
        sideHem: 10,
        topBottomHem: 30,
        pieces: 2,
        panelRoundMode: 'ceil_plus1_if_frac_ge',
        panelFracThreshold: 0.9,
        panelExtraAdd: 1,
        panelCountExp: 'PANEL_ROUND(((WC * G) + HEM_SIDE) / FW_FAB) * P',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr4',
        curtainStyle: 'ม่านลอน',
        grainType: 'sheer',
        label: 'เกรนม่านโปร่ง - ม่านลอน (กลับหน้าผ้า >270 • ย่น 2.2 • เย็บริม 10 • เย็บบนล่าง 30)',
        fabricWidth: 300,
        yRepeat: 0,
        gatherRatio: 2.2,
        sideHem: 10,
        topBottomHem: 30,
        pieces: 2,
        panelRoundMode: 'ceil',
        panelFracThreshold: 0.9,
        panelExtraAdd: 0,
        panelCountExp: 'P',
        yRepeatCountExp: '0',
        qtyExp: '(((WC * G) + HEM_SIDE) * P) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr5',
        curtainStyle: 'ม่านตาไก่',
        grainType: 'opaque',
        label: 'เกรนม่านทึบ - ม่านตาไก่ (ย่น 2.2 • เย็บริม 10 • เย็บบนล่าง 35 • เศษหน้า ≥0.9 ปัดขึ้น+1)',
        fabricWidth: 140,
        yRepeat: 0,
        gatherRatio: 2.2,
        sideHem: 10,
        topBottomHem: 35,
        pieces: 2,
        panelRoundMode: 'ceil_plus1_if_frac_ge',
        panelFracThreshold: 0.9,
        panelExtraAdd: 1,
        panelCountExp: 'PANEL_ROUND(((WC * G) + HEM_SIDE) / FW_FAB) * P',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr6',
        curtainStyle: 'ม่านตาไก่',
        grainType: 'sheer',
        label: 'เกรนม่านโปร่ง - ม่านตาไก่ (กลับหน้าผ้า >270 • ย่น 2.2 • เย็บริม 10 • เย็บบนล่าง 35)',
        fabricWidth: 300,
        yRepeat: 0,
        gatherRatio: 2.2,
        sideHem: 10,
        topBottomHem: 35,
        pieces: 2,
        panelRoundMode: 'ceil',
        panelFracThreshold: 0.9,
        panelExtraAdd: 0,
        panelCountExp: 'P',
        yRepeatCountExp: '0',
        qtyExp: '(((WC * G) + HEM_SIDE) * P) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr7',
        curtainStyle: 'ม่านพับ',
        grainType: 'opaque',
        label: 'เกรนม่านทึบ - ม่านพับ (ย่น 1.0 • เย็บริม 10 • เย็บบนล่าง 40 • เศษหน้า ≥0.9 ปัดขึ้น+1)',
        fabricWidth: 140,
        yRepeat: 0,
        gatherRatio: 1.0,
        sideHem: 10,
        topBottomHem: 40,
        pieces: 1,
        panelRoundMode: 'ceil_plus1_if_frac_ge',
        panelFracThreshold: 0.9,
        panelExtraAdd: 1,
        panelCountExp: 'PANEL_ROUND(((WC * G) + HEM_SIDE) / FW_FAB) * P',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr8',
        curtainStyle: 'ม่านพับ',
        grainType: 'sheer',
        label: 'เกรนม่านโปร่ง - ม่านพับ (กลับหน้าผ้า >270 • ย่น 1.0 • เย็บริม 10 • เย็บบนล่าง 40)',
        fabricWidth: 300,
        yRepeat: 0,
        gatherRatio: 1.0,
        sideHem: 10,
        topBottomHem: 40,
        pieces: 1,
        panelRoundMode: 'ceil',
        panelFracThreshold: 0.9,
        panelExtraAdd: 0,
        panelCountExp: 'P',
        yRepeatCountExp: '0',
        qtyExp: '(((WC * G) + HEM_SIDE) * P) / 90',
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
    gatherRatio: found && found.stdGatherRatio !== undefined ? parseFloat(found.stdGatherRatio) : 2.5,
    topBottomHem: found && found.stdTopBottomHem !== undefined ? parseFloat(found.stdTopBottomHem) : 35,
    sideHem: found && found.stdSideHem !== undefined ? parseFloat(found.stdSideHem) : (parseFloat(std.stdSideHem) || 10),
    overlap: found && found.stdOverlap !== undefined ? parseFloat(found.stdOverlap) : (parseFloat(std.stdOverlap) || 8),
    sideReturn: found && found.stdSideReturn !== undefined ? parseFloat(found.stdSideReturn) : (parseFloat(std.stdSideReturn) || 8),
  };
}

function normalizeCurtainItem(c, idx) {
  const defList = defaultMasterDB().curtains;
  const defMatch = defList.find(d => d.name === (c && c.name)) || defList[0];
  return Object.assign({
    id: 'c_' + (idx + 1),
    name: '',
    useHook: false,
    stdGatherRatio: defMatch.stdGatherRatio ?? 2.5,
    stdTopBottomHem: defMatch.stdTopBottomHem ?? 35,
    stdSideHem: defMatch.stdSideHem ?? 10,
    stdOverlap: defMatch.stdOverlap ?? 8,
    stdSideReturn: defMatch.stdSideReturn ?? 8,
  }, c || {});
}

function normalizeWidthFormulaItem(wf, idx) {
  const def = defaultMasterDB().widthFormulas[0];
  const item = Object.assign({
    id: 'wf_' + (idx + 1),
    curtainStyle: 'ม่านจีบ',
    rodType: '*',
    railTracks: '*',
    pieces: 2,
    label: '',
    railWidth: 'RW',
    gatherRatio: 2.5,
    overlap: 8,
    sideReturn: 8,
    widthExp: '((RW + OV + SR) / P)',
    roundMode: 'ceil_int',
  }, def, wf || {});
  if (!item.rodType) item.rodType = '*';
  if (!item.railTracks) item.railTracks = '*';
  return item;
}

function normalizeHeightFormulaItem(hf, idx) {
  return Object.assign({
    id: 'hf_' + (idx + 1),
    curtainStyle: '*',
    rodType: '*',
    railTracks: '*',
    pieces: '*',
    hookSize: '*',
    label: '',
    heightExp: 'RH',
    roundMode: 'none',
  }, hf || {});
}

function normalizeFabricCalcRuleItem(r, idx) {
  const isSheer = (r && r.grainType === 'sheer');
  const item = Object.assign({
    id: 'fcr_' + (idx + 1),
    curtainStyle: 'ม่านจีบ',
    grainType: isSheer ? 'sheer' : 'opaque',
    label: '',
    fabricWidth: isSheer ? 300 : 140,
    yRepeat: 0,
    gatherRatio: 2.5,
    sideHem: 10,
    topBottomHem: 35,
    pieces: 2,
    panelRoundMode: isSheer ? 'ceil' : 'ceil_plus1_if_frac_ge',
    panelFracThreshold: 0.9,
    panelExtraAdd: isSheer ? 0 : 1,
    panelCountExp: isSheer ? 'P' : 'PANEL_ROUND(((WC * G) + HEM_SIDE) / FW_FAB) * P',
    yRepeatCountExp: isSheer ? '0' : 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
    qtyExp: isSheer ? '(((WC * G) + HEM_SIDE) * P) / 90' : '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
    roundMode: 'ceil_1dec',
  }, r || {});
  // อัปเกรดสูตรเดิมที่ใช้ CEIL(((WC * G) + HEM_SIDE) / FW_FAB) * P ให้ใช้ PANEL_ROUND ตามเงื่อนไขหน้าผ้า
  if (item.grainType !== 'sheer' && item.panelCountExp === 'CEIL(((WC * G) + HEM_SIDE) / FW_FAB) * P') {
    item.panelCountExp = 'PANEL_ROUND(((WC * G) + HEM_SIDE) / FW_FAB) * P';
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

function normalizeMasterDBObject(raw) {
  const def = defaultMasterDB();
  if (!raw || typeof raw !== 'object') return def;
  return {
    stdParams: Object.assign({}, def.stdParams, raw.stdParams || {}),
    staff: ensureDefaultAdmin(Array.isArray(raw.staff) ? raw.staff : def.staff),
    curtains: Array.isArray(raw.curtains) && raw.curtains.length
      ? raw.curtains.map((c, i) => normalizeCurtainItem(c, i))
      : def.curtains,
    hooks: Array.isArray(raw.hooks) && raw.hooks.length ? raw.hooks : def.hooks,
    remarks: Array.isArray(raw.remarks) && raw.remarks.length ? raw.remarks : def.remarks,
    fabrics: Array.isArray(raw.fabrics) && raw.fabrics.length
      ? raw.fabrics.map((f, i) => normalizeFabricItem(f, i))
      : def.fabrics,
    rails: Array.isArray(raw.rails) && raw.rails.length
      ? raw.rails.map((rl, i) => Object.assign({ id: 'rl_' + (i + 1), spec: '' }, rl))
      : def.rails,
    blinds: Array.isArray(raw.blinds) && raw.blinds.length ? raw.blinds : def.blinds,
    widthFormulas: Array.isArray(raw.widthFormulas) && raw.widthFormulas.length
      ? raw.widthFormulas.map((w, i) => normalizeWidthFormulaItem(w, i))
      : def.widthFormulas,
    heightFormulas: Array.isArray(raw.heightFormulas) && raw.heightFormulas.length
      ? raw.heightFormulas.map((h, i) => normalizeHeightFormulaItem(h, i))
      : def.heightFormulas,
    fabricCalcRules: Array.isArray(raw.fabricCalcRules) && raw.fabricCalcRules.length
      ? raw.fabricCalcRules.map((r, i) => normalizeFabricCalcRuleItem(r, i))
      : def.fabricCalcRules,
  };
}

let masterDB = (() => {
  try {
    const raw = JSON.parse(
      localStorage.getItem(DB_KEY) ||
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
  masterDB.fabrics = (masterDB.fabrics || []).map((f, i) => normalizeFabricItem(f, i));
  try { localStorage.setItem(DB_KEY, JSON.stringify(masterDB)); } catch (e) { console.warn(e); }
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
 *   W, H, EL, ER, ET, EB, RW, RH, FW, FH,
 *   WC (ความกว้างผ้าม่าน), HC (ความสูงผ้าม่าน), P (จำนวนผืน), RT (จำนวนชั้นรางม่าน),
 *   G (ระยะย่นผ้าม่าน), OV (ระยะเผื่อเกย), SR (ระยะเผื่ออ้อมข้าง),
 *   FW_FAB (ขนาดหน้าผ้า), YR (Y-Repeat), HEM_SIDE (ระยะเผื่อเย็บริมผ้า), HEM_TB (ระยะเผื่อเย็บบนล่าง),
 *   PANELS (จำนวนหน้าผ้า), YR_CNT (จำนวน Y-Repeat)
 * Functions:
 *   FLOOR(x) / floor(x) = ปัดเศษลงเป็นจำนวนเต็ม
 *   CEIL(x)  / ceil(x)  = ปัดเศษขึ้นเป็นจำนวนเต็ม
 *   CEIL1(x) / ceil1(x) = ปัดเศษขึ้นเป็นทศนิยม 1 ตำแหน่ง
 *   ROUND(x) / round(x) = ปัดเศษทั่วไป
 *   PANEL_ROUND(x, th, add) = ปัดเศษจำนวนหน้าผ้าตามเงื่อนไข (เช่น ถ้าเศษทศนิยม >= 0.9 ปัดขึ้นเป็นจำนวนเต็มแล้ว +1)
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
      'WC', 'HC', 'P', 'RT', 'G', 'OV', 'SR',
      'FW_FAB', 'YR', 'HEM_SIDE', 'HEM_TB', 'PANELS', 'YR_CNT',
      'ceil', 'floor', 'round', 'ceil1', 'CEIL', 'FLOOR', 'ROUND', 'CEIL1', 'PANEL_ROUND', 'panel_round', 'max', 'min',
      `"use strict"; return (${expr});`
    );
    const res = fn(
      vars.W || 0, vars.H || 0, vars.EL || 0, vars.ER || 0, vars.ET || 0, vars.EB || 0,
      vars.RW || 0, vars.RH || 0, vars.FW || 0, vars.FH || 0,
      vars.WC || 0, vars.HC || 0, vars.P || 1, vars.RT || 1, vars.G || 1, vars.OV || 0, vars.SR || 0,
      vars.FW_FAB || 140, vars.YR || 0, vars.HEM_SIDE || 0, vars.HEM_TB || 0,
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
 * ค้นหาสูตรความกว้างผ้าม่านตามเงื่อนไข: รูปแบบผ้าม่าน, จำนวนผืน (pieces), จำนวนรางม่าน(ชั้น) (railTracks), ประเภทรางม่าน (rodType)
 */
function getWidthFormulasForStyle(curtainStyle, pieces = '', railTracks = '', rodType = '') {
  const all = masterDB.widthFormulas || [];
  if (!curtainStyle && !pieces && !railTracks && !rodType) return all;
  const matched = all.filter(f => {
    const matchStyle = !curtainStyle || !f.curtainStyle || f.curtainStyle === '*' || f.curtainStyle === curtainStyle || curtainStyle.includes(f.curtainStyle);
    const matchPieces = !pieces || !f.pieces || String(f.pieces) === '*' || String(f.pieces) === String(pieces);
    const matchTracks = !railTracks || !f.railTracks || String(f.railTracks) === '*' || String(f.railTracks) === String(railTracks);
    const matchRod = !rodType || !f.rodType || f.rodType === '*' || f.rodType === rodType;
    return matchStyle && matchPieces && matchTracks && matchRod;
  });
  if (matched.length) return matched;
  // Fallback: match by curtainStyle + pieces first, then by curtainStyle
  const byStylePieces = all.filter(f => {
    const matchStyle = !curtainStyle || !f.curtainStyle || f.curtainStyle === '*' || f.curtainStyle === curtainStyle || curtainStyle.includes(f.curtainStyle);
    const matchPieces = !pieces || !f.pieces || String(f.pieces) === '*' || String(f.pieces) === String(pieces);
    return matchStyle && matchPieces;
  });
  if (byStylePieces.length) return byStylePieces;
  const byStyle = all.filter(f => !curtainStyle || !f.curtainStyle || f.curtainStyle === '*' || f.curtainStyle === curtainStyle || curtainStyle.includes(f.curtainStyle));
  return byStyle.length ? byStyle : all;
}

/**
 * ค้นหาสูตรความสูงผ้าม่านตามเงื่อนไข: รูปแบบผ้าม่าน, ประเภทรางม่าน, ขนาดตะขอ, จำนวนชั้นรางม่าน, จำนวนผืน
 */
function getHeightFormulasForWindow(curtainStyle, rodType, hookSize, railTracks = '', pieces = '') {
  const all = masterDB.heightFormulas || [];
  const matched = all.filter(f => {
    const matchStyle = !curtainStyle || !f.curtainStyle || f.curtainStyle === '*' || f.curtainStyle === curtainStyle || curtainStyle.includes(f.curtainStyle);
    const matchRod = !rodType || !f.rodType || f.rodType === '*' || f.rodType === rodType;
    const matchHook = !hookSize || !f.hookSize || f.hookSize === '*' || f.hookSize === hookSize;
    const matchTracks = !railTracks || !f.railTracks || String(f.railTracks) === '*' || String(f.railTracks) === String(railTracks);
    const matchPieces = !pieces || !f.pieces || String(f.pieces) === '*' || String(f.pieces) === String(pieces);
    return matchStyle && matchRod && matchHook && matchTracks && matchPieces;
  });
  return matched.length ? matched : all;
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
  const matched = all.filter(r => {
    const matchStyle = !curtainStyle || !r.curtainStyle || r.curtainStyle === '*' || r.curtainStyle === curtainStyle || curtainStyle.includes(r.curtainStyle);
    const matchRod = !rodType || !r.rodCategory || r.rodCategory === '*' || r.rodCategory === rodType;
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
  return /ม่านม้วน|มู่ลี่|ม่านปรับแสง/.test(s);
}

/**
 * คำนวณขนาดความกว้างผ้าม่าน, ความสูงผ้าม่าน, จำนวนผืน, จำนวนหน้าผ้า และจำนวนหลา
 * - ความสูงราง RH = สูงเฟรม (H) + เผื่อบน (ET) + เผื่อล่าง (EB)
 * - หากไม่รับรางม่าน (w.noRail) ลดความสูงผ้าม่านตามตัวเลือก (getNoRailHeightDeduction)
 * - แสดง "จำนวนหน้า / จำนวนหลา" ในช่องหลา (เช่น "7 หน้า / 25.2") โดยหากแบ่งผืนซ้าย/ขวาไม่เท่ากัน จะคิดแยกผืนซ้าย+ผืนขวาแล้วนำมารวมกัน
 * - รองรับโหมดจำนวนผ้า: คำนวณจริง (exact), ปัดเศษขึ้นเป็นเต็มหลา (ceil_yard), ปัดเศษขึ้นเป็นเต็มหลา+จำนวนหลาที่ต้องการเพิ่ม (ceil_plus), คำนวณจริง+จำนวนหลาที่ต้องการเพิ่ม (exact_plus)
 * - รองรับเงื่อนไขปัดจำนวนหน้าผ้า เช่น เกรนม่านทึบ ถ้าเศษทศนิยม >= 0.9 ปัดเศษขึ้นเป็นจำนวนเต็มและ +1
 */
function computeCurtainLayerByWidthHeight(w, wf, hf, opts = {}) {
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const W = num(w.width), H = num(w.height);
  const EL = num(w.extL), ER = num(w.extR), ET = num(w.extT), EB = num(w.extB);
  const RW = ((w.calcMode === 'manual' || (w.manualFields && w.manualFields.railW)) && w.customRailW !== undefined && String(w.customRailW).trim() !== '')
    ? num(w.customRailW)
    : (W + EL + ER);
  const RH = ((w.calcMode === 'manual' || (w.manualFields && w.manualFields.railH)) && w.customRailH !== undefined && String(w.customRailH).trim() !== '')
    ? num(w.customRailH)
    : (H + ET + EB);
  const FW = num(w.fullW), FH = num(w.fullH);

  const styleName = opts.curtainStyle || (wf && wf.curtainStyle) || '';
  const stdP = getStdCurtainParams(styleName);

  const P = num(opts.pieces) || num(wf && wf.pieces) || (isBlindOrRollerStyle(styleName) ? 1 : 2);
  const RT = num(opts.railTracks) || num(w.railTracks) || ((w.curtainStyle1 && w.curtainStyle2) ? 2 : 1);
  const G = num(opts.gatherRatio) || num(wf && wf.gatherRatio) || stdP.gatherRatio || 2.5;
  const OV = (wf && wf.overlap !== undefined && wf.overlap !== '') ? num(wf.overlap) : stdP.overlap;
  const SR = (wf && wf.sideReturn !== undefined && wf.sideReturn !== '') ? num(wf.sideReturn) : stdP.sideReturn;

  const vars = {
    W, H, EL, ER, ET, EB, RW, RH, FW, FH,
    WC: RW, HC: RH, P, RT, G, OV, SR,
    FW_FAB: 140, YR: 0, HEM_SIDE: stdP.sideHem, HEM_TB: stdP.topBottomHem, PANELS: P, YR_CNT: 0,
    PANEL_ROUND_MODE: 'ceil_plus1_if_frac_ge', PANEL_FRAC_TH: 0.9, PANEL_EXTRA_ADD: 1,
  };

  // 1) คำนวณขนาดความกว้างผ้าม่าน (a) — รองรับกรณีแบ่งผืนซ้าย/ผืนขวาไม่เท่ากันบนรางเดียวกัน (เช่น 150/250 แต่รางม่านเป็น 400)
  const hasUnequalSplit = !!(w.unequalSplit && (num(w.splitLeft) > 0 || num(w.splitRight) > 0));
  let splitL = num(w.splitLeft);
  let splitR = num(w.splitRight);
  if (hasUnequalSplit) {
    if (splitL > 0 && splitR <= 0 && RW > splitL) splitR = Math.round((RW - splitL) * 100) / 100;
    if (splitR > 0 && splitL <= 0 && RW > splitR) splitL = Math.round((RW - splitR) * 100) / 100;
  }

  let a = '';
  if (hasUnequalSplit && (splitL > 0 || splitR > 0)) {
    a = `${splitL || 0}/${splitR || 0}`;
    vars.P = 2;
    vars.WC = (splitL + splitR) / 2;
  } else if (wf && wf.widthExp) {
    a = evalFormulaExpr(wf.widthExp, vars, wf.roundMode || 'none');
    vars.WC = num(a) || RW;
  } else if (RW) {
    a = String(RW);
    vars.WC = RW;
  }

  // 2) คำนวณขนาดความสูงผ้าม่าน (b) พร้อมหักลดความสูงกรณีไม่รับรางม่าน (w.noRail)
  let b = '';
  if (hf && hf.heightExp) {
    b = evalFormulaExpr(hf.heightExp, vars, hf.roundMode || 'none');
  } else if (RH) {
    b = String(RH);
  }
  const noRailDeduct = getNoRailHeightDeduction(w);
  let hcNum = num(b) || RH;
  if (noRailDeduct > 0 && hcNum > 0) {
    hcNum = Math.max(0, Math.round((hcNum - noRailDeduct) * 100) / 100);
    b = String(hcNum);
  }
  vars.HC = hcNum;

  const effPieces = hasUnequalSplit ? 2 : P;

  // 3) กรณีเป็นม่านม้วน / มู่ลี่ -> คำนวณเป็นตารางเมตร ขั้นต่ำ 1.5 ตร.ม./ผืน
  const passedBlind = opts.blindItem || opts.blindRule || null;
  if (isBlindOrRollerStyle(styleName) || passedBlind) {
    const blindRule = passedBlind || (masterDB.blinds || []).find(bl => bl.curtainStyle === styleName) || { minSqm: 1.5, roundMode: 'ceil_1dec' };
    const minSqm = Math.max(1.5, num(blindRule.minSqm) || 1.5);
    let totalSqm = 0;
    if (hasUnequalSplit && (splitL > 0 || splitR > 0)) {
      const sqmL = (splitL > 0 && vars.HC > 0) ? Math.max(minSqm, (splitL / 100) * (vars.HC / 100)) : 0;
      const sqmR = (splitR > 0 && vars.HC > 0) ? Math.max(minSqm, (splitR / 100) * (vars.HC / 100)) : 0;
      totalSqm = sqmL + sqmR;
    } else {
      const rawSqmPerPiece = (vars.WC / 100) * (vars.HC / 100);
      const sqmPerPiece = (vars.WC > 0 && vars.HC > 0) ? Math.max(minSqm, rawSqmPerPiece) : 0;
      totalSqm = sqmPerPiece * effPieces;
    }
    const t = totalSqm > 0 ? applyRoundMode(totalSqm, blindRule.roundMode || 'ceil_1dec') : '';
    return {
      a, b, n: (RW || RH || hasUnequalSplit) ? String(effPieces) : '', t,
      RW, RH, unit1: 'ผืน', unit2: 'ตร.ม.',
      details: { mode: 'blind_sqm', minSqm },
    };
  }

  // 4) คำนวณปริมาณผ้า แยกเกรนม่านทึบ ('opaque') และเกรนม่านโปร่ง ('sheer')
  const fabricItem = opts.fabric || opts.fabricItem || null;
  let grainType = opts.grainType || 'opaque';
  const fabW = num(fabricItem && fabricItem.fabricWidth) || num(opts.fabricRule && opts.fabricRule.fabricWidth) || (grainType === 'sheer' ? 300 : 140);
  // บังคับกฎ: เฉพาะผ้าที่มีขนาดหน้าผ้าเกิน 270 ซม. ขึ้นไปถึงใช้เกรนม่านโปร่งได้
  if (grainType === 'sheer' && !canFabricUseSheerGrain(fabW)) {
    grainType = 'opaque';
  }

  const fRule = opts.fabricRule
    || getFabricCalcRulesForWindow(styleName, grainType)[0]
    || defaultMasterDB().fabricCalcRules[0];

  vars.FW_FAB = fabW || num(fRule && fRule.fabricWidth) || 140;
  vars.YR = (fabricItem && fabricItem.yRepeat !== undefined && fabricItem.yRepeat !== '')
    ? num(fabricItem.yRepeat)
    : num(fRule && fRule.yRepeat);
  vars.G = num(fRule && fRule.gatherRatio) || G;
  vars.HEM_SIDE = (fRule && fRule.sideHem !== undefined && fRule.sideHem !== '') ? num(fRule.sideHem) : stdP.sideHem;
  vars.HEM_TB = (fRule && fRule.topBottomHem !== undefined && fRule.topBottomHem !== '') ? num(fRule.topBottomHem) : stdP.topBottomHem;

  const pRoundMode = (fRule && fRule.panelRoundMode) || (grainType === 'sheer' ? 'ceil' : 'ceil_plus1_if_frac_ge');
  const pFracTh = (fRule && fRule.panelFracThreshold !== undefined && fRule.panelFracThreshold !== '') ? num(fRule.panelFracThreshold) : 0.9;
  const pExtraAdd = (fRule && fRule.panelExtraAdd !== undefined && fRule.panelExtraAdd !== '') ? parseInt(fRule.panelExtraAdd, 10) : (grainType === 'sheer' ? 0 : 1);

  vars.PANEL_ROUND_MODE = pRoundMode;
  vars.PANEL_FRAC_TH = pFracTh;
  vars.PANEL_EXTRA_ADD = pExtraAdd;

  const yrCntStr = (fRule && fRule.yRepeatCountExp)
    ? evalFormulaExpr(fRule.yRepeatCountExp, vars, 'ceil_int')
    : (vars.YR > 0 ? String(Math.ceil((vars.HC + vars.HEM_TB) / vars.YR)) : '0');
  vars.YR_CNT = num(yrCntStr);

  // ฟังก์ชันย่อยคำนวณจำนวนหน้าและจำนวนหลาดิบของแต่ละส่วน (รองรับการคิดแยกผืนซ้าย/ขวาแล้วนำมารวมกัน)
  const calcPartPanelsAndYards = (partWC, partPieces) => {
    if (partWC <= 0 && vars.HC <= 0) return { panels: 0, rawYards: 0 };
    const partVars = Object.assign({}, vars, { WC: partWC, P: partPieces });
    let partPanels = 0;
    if (fRule && fRule.panelCountExp) {
      partPanels = num(evalFormulaExpr(fRule.panelCountExp, partVars, 'ceil_int'));
    } else if (grainType === 'sheer') {
      partPanels = partPieces;
    } else {
      const rawPerPiece = ((partWC * vars.G) + vars.HEM_SIDE) / Math.max(1, vars.FW_FAB);
      partPanels = applyPanelRounding(rawPerPiece, pRoundMode, pFracTh, pExtraAdd) * partPieces;
    }
    partVars.PANELS = partPanels || partPieces;
    let rawYards = 0;
    if (fRule && fRule.qtyExp) {
      rawYards = num(evalFormulaExpr(fRule.qtyExp, partVars, 'none'));
    }
    return { panels: partVars.PANELS, rawYards };
  };

  let totalPanels = 0;
  let totalRawYards = 0;

  if (hasUnequalSplit && (splitL > 0 || splitR > 0)) {
    // คิดแยกผืนซ้าย และ ผืนขวา แล้วนำจำนวนหน้าและจำนวนหลามารวมกัน
    const leftRes = splitL > 0 ? calcPartPanelsAndYards(splitL, 1) : { panels: 0, rawYards: 0 };
    const rightRes = splitR > 0 ? calcPartPanelsAndYards(splitR, 1) : { panels: 0, rawYards: 0 };
    totalPanels = leftRes.panels + rightRes.panels;
    totalRawYards = leftRes.rawYards + rightRes.rawYards;
    vars.PANELS = totalPanels;
  } else {
    const res = calcPartPanelsAndYards(vars.WC, effPieces);
    totalPanels = res.panels;
    totalRawYards = res.rawYards;
    vars.PANELS = totalPanels;
  }

  const yardMode = opts.yardMode || 'exact';
  const extraYards = num(opts.extraYards);
  const yardsStr = (vars.WC > 0 || vars.HC > 0)
    ? applyYardDisplayMode(totalRawYards, yardMode, extraYards, (fRule && fRule.roundMode) || 'ceil_1dec')
    : '';

  // แสดงทั้งจำนวนหน้า / จำนวนหลาในช่องหลา เช่น "7 หน้า / 25.2" (เมื่อต่อท้ายหน่วย "หลา" บนใบงานจะแสดงเป็น "7 หน้า / 25.2 หลา")
  let t = '';
  if (yardsStr) {
    t = totalPanels > 0 ? `${totalPanels} หน้า / ${yardsStr}` : yardsStr;
  }

  return {
    a, b, n: (RW || RH || hasUnequalSplit) ? String(effPieces) : '', t,
    RW, RH, unit1: 'ผืน', unit2: 'หลา',
    details: {
      mode: grainType,
      fabricWidth: vars.FW_FAB,
      panelCount: totalPanels,
      yardsOnly: yardsStr,
      rawYards: Math.round(totalRawYards * 100) / 100,
      yRepeat: vars.YR,
      yRepeatCount: vars.YR_CNT,
      sideHem: vars.HEM_SIDE,
      topBottomHem: vars.HEM_TB,
      gatherRatio: vars.G,
      noRailDeduct,
    },
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

/** Combine opaque and sheer curtain style names with " / " when different */
function formatCurtainType(w) {
  const s1 = (w.curtainStyle1 || '').trim();
  const s2 = (w.curtainStyle2 || '').trim();
  if (s1 && s2 && s1 !== s2) return `${s1} / ${s2}`;
  if (s1) return s1;
  if (s2) return s2;
  return (w.curtainType || '').trim();
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
    title: 'ฐานข้อมูลขนาดความกว้างผ้าม่าน (ตามรูปแบบม่าน / จำนวนผืน / จำนวนชั้นราง / ประเภทราง)',
    pattern: 'curtainStyle, rodType, railTracks, pieces, label, railWidth, gatherRatio, overlap, sideReturn, widthExp, roundMode',
    desc: 'คอลัมน์: รูปแบบผ้าม่าน, ประเภทรางม่าน(*), จำนวนชั้นราง(* หรือ 1/2), จำนวนผืน(P), ชื่อเงื่อนไข, ขนาดราง(RW), ระยะย่น(G), เผื่อเกยมาตรฐาน(OV=8), เผื่ออ้อมข้างมาตรฐาน(SR=8), สูตรความกว้างผ้า, การปัดเศษ',
    example: [
      'curtainStyle, rodType, railTracks, pieces, label, railWidth, gatherRatio, overlap, sideReturn, widthExp, roundMode',
      'ม่านจีบ, *, *, 2, ม่านจีบ 2 ผืน แยกกลาง มาตรฐาน (เกย 8 อ้อมข้าง 8), RW, 2.5, 8, 8, ((RW + OV + SR) / P), ceil_int',
      'ม่านลอน, รางม่านลอน, *, 2, ม่านลอน 2 ผืน แยกกลาง (เกย 8 อ้อมข้าง 8), RW, 2.2, 8, 8, ((RW + OV + SR) / P), ceil_int',
    ].join('\n'),
    headers: ['curtainstyle', 'รูปแบบผ้าม่าน', 'รูปแบบม่าน'],
    parseRow(cols, idx) {
      if (!cols[0] && !cols[1]) return null;
      // รองรับทั้งไฟล์รูปแบบ 11 คอลัมน์ใหม่ และ 9 คอลัมน์เดิม
      if (cols.length >= 11) {
        return {
          id: 'wf_imp_' + Date.now() + '_' + idx,
          curtainStyle: cols[0] || '*',
          rodType: cols[1] || '*',
          railTracks: cols[2] || '*',
          pieces: parseInt(cols[3], 10) || 2,
          label: cols[4] || cols[0] || 'เงื่อนไขความกว้าง',
          railWidth: cols[5] || 'RW',
          gatherRatio: parseFloat(cols[6]) || 2.5,
          overlap: cols[7] !== undefined && cols[7] !== '' ? parseFloat(cols[7]) : 8,
          sideReturn: cols[8] !== undefined && cols[8] !== '' ? parseFloat(cols[8]) : 8,
          widthExp: cols[9] || '((RW + OV + SR) / P)',
          roundMode: cols[10] || 'ceil_int',
        };
      }
      return {
        id: 'wf_imp_' + Date.now() + '_' + idx,
        curtainStyle: cols[0] || '*',
        rodType: '*',
        railTracks: '*',
        label: cols[1] || cols[0] || 'เงื่อนไขความกว้าง',
        railWidth: cols[2] || 'RW',
        pieces: parseInt(cols[3], 10) || 2,
        gatherRatio: parseFloat(cols[4]) || 2.5,
        overlap: cols[5] !== undefined && cols[5] !== '' ? parseFloat(cols[5]) : 8,
        sideReturn: cols[6] !== undefined && cols[6] !== '' ? parseFloat(cols[6]) : 8,
        widthExp: cols[7] || '((RW + OV + SR) / P)',
        roundMode: cols[8] || 'ceil_int',
      };
    },
  },
  heightFormulas: {
    title: 'ฐานข้อมูลขนาดความสูงผ้าม่าน (ตามรูปแบบม่าน / ประเภทราง / ชั้นราง / จำนวนผืน / ตะขอ)',
    pattern: 'curtainStyle, rodType, railTracks, pieces, hookSize, label, heightExp, roundMode',
    desc: 'คอลัมน์: รูปแบบผ้าม่าน, ประเภทรางม่าน, จำนวนชั้นราง(* หรือ 1/2), จำนวนผืน(* หรือ 1/2), ขนาดตะขอ(หรือ *), ชื่อเงื่อนไขความสูง, สูตรความสูงผ้า (RH = สูงเฟรม+เผื่อบน+เผื่อล่าง), การปัดเศษ',
    example: [
      'curtainStyle, rodType, railTracks, pieces, hookSize, label, heightExp, roundMode',
      'ม่านจีบ, รางม่านจีบ, *, *, No.5, ม่านจีบ + รางม่านจีบ + ตะขอ No.5 (หัก 1.5 ซม.), RH - 1.5, none',
      'ม่านลอน, รางม่านลอน, *, *, *, ม่านลอน + รางม่านลอน (หัก 2.5 ซม.), RH - 2.5, none',
    ].join('\n'),
    headers: ['curtainstyle', 'รูปแบบผ้าม่าน', 'รูปแบบม่าน'],
    parseRow(cols, idx) {
      if (!cols[0] && !cols[3]) return null;
      if (cols.length >= 8) {
        return {
          id: 'hf_imp_' + Date.now() + '_' + idx,
          curtainStyle: cols[0] || '*',
          rodType: cols[1] || '*',
          railTracks: cols[2] || '*',
          pieces: cols[3] || '*',
          hookSize: cols[4] || '*',
          label: cols[5] || 'เงื่อนไขความสูง',
          heightExp: cols[6] || 'RH',
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
        label: cols[3] || 'เงื่อนไขความสูง',
        heightExp: cols[4] || 'RH',
        roundMode: cols[5] || 'none',
      };
    },
  },
  fabricCalcRules: {
    title: 'ฐานข้อมูลคำนวณปริมาณผ้า (แยกเกรนม่านทึบ / เกรนม่านโปร่ง + เงื่อนไขปัดจำนวนหน้าผ้า)',
    pattern: 'curtainStyle, grainType, label, fabricWidth, yRepeat, gatherRatio, sideHem, topBottomHem, pieces, panelRoundMode, panelFracThreshold, panelExtraAdd, panelCountExp, yRepeatCountExp, qtyExp, roundMode',
    desc: 'คอลัมน์: รูปแบบม่าน, เกรน(opaque/sheer), ชื่อสูตร, หน้าผ้า(FW_FAB), Y-Repeat(YR), ระยะย่น(G), เผื่อเย็บริม(HEM_SIDE=10), เผื่อเย็บบนล่าง(HEM_TB), จำนวนผืน(P), โหมดปัดหน้าผ้า, เกณฑ์เศษทศนิยม(0.9), บวกเพิ่มหน้า(+1), สูตรจำนวนหน้า(PANELS), สูตรY-Repeat(YR_CNT), สูตรหลา, การปัดเศษ',
    example: [
      'curtainStyle, grainType, label, fabricWidth, yRepeat, gatherRatio, sideHem, topBottomHem, pieces, panelRoundMode, panelFracThreshold, panelExtraAdd, panelCountExp, yRepeatCountExp, qtyExp, roundMode',
      'ม่านจีบ, opaque, เกรนม่านทึบ - ม่านจีบ, 140, 0, 2.5, 10, 35, 2, ceil_plus1_if_frac_ge, 0.9, 1, PANEL_ROUND(((WC * G) + HEM_SIDE) / FW_FAB) * P, YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0, (PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90, ceil_1dec',
      'ม่านจีบ, sheer, เกรนม่านโปร่ง - ม่านจีบ, 300, 0, 2.5, 10, 35, 2, ceil, 0.9, 0, P, 0, (((WC * G) + HEM_SIDE) * P) / 90, ceil_1dec',
    ].join('\n'),
    headers: ['curtainstyle', 'รูปแบบผ้าม่าน', 'รูปแบบม่าน'],
    parseRow(cols, idx) {
      if (!cols[0] && !cols[2]) return null;
      const isSheer = String(cols[1] || '').toLowerCase() === 'sheer';
      if (cols.length >= 16) {
        return {
          id: 'fcr_imp_' + Date.now() + '_' + idx,
          curtainStyle: cols[0] || '*',
          grainType: isSheer ? 'sheer' : 'opaque',
          label: cols[2] || 'สูตรคำนวณปริมาณผ้า',
          fabricWidth: parseFloat(cols[3]) || (isSheer ? 300 : 140),
          yRepeat: parseFloat(cols[4]) || 0,
          gatherRatio: parseFloat(cols[5]) || 2.5,
          sideHem: cols[6] !== undefined && cols[6] !== '' ? parseFloat(cols[6]) : 10,
          topBottomHem: parseFloat(cols[7]) || 35,
          pieces: parseInt(cols[8], 10) || 2,
          panelRoundMode: cols[9] || (isSheer ? 'ceil' : 'ceil_plus1_if_frac_ge'),
          panelFracThreshold: cols[10] !== undefined && cols[10] !== '' ? parseFloat(cols[10]) : 0.9,
          panelExtraAdd: cols[11] !== undefined && cols[11] !== '' ? parseInt(cols[11], 10) : (isSheer ? 0 : 1),
          panelCountExp: cols[12] || (isSheer ? 'P' : 'PANEL_ROUND(((WC * G) + HEM_SIDE) / FW_FAB) * P'),
          yRepeatCountExp: cols[13] || 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
          qtyExp: cols[14] || '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
          roundMode: cols[15] || 'ceil_1dec',
        };
      }
      return {
        id: 'fcr_imp_' + Date.now() + '_' + idx,
        curtainStyle: cols[0] || '*',
        grainType: isSheer ? 'sheer' : 'opaque',
        label: cols[2] || 'สูตรคำนวณปริมาณผ้า',
        fabricWidth: parseFloat(cols[3]) || 140,
        yRepeat: parseFloat(cols[4]) || 0,
        gatherRatio: parseFloat(cols[5]) || 2.5,
        sideHem: cols[6] !== undefined && cols[6] !== '' ? parseFloat(cols[6]) : 10,
        topBottomHem: parseFloat(cols[7]) || 35,
        pieces: parseInt(cols[8], 10) || 2,
        panelRoundMode: isSheer ? 'ceil' : 'ceil_plus1_if_frac_ge',
        panelFracThreshold: 0.9,
        panelExtraAdd: isSheer ? 0 : 1,
        panelCountExp: cols[9] || (isSheer ? 'P' : 'PANEL_ROUND(((WC * G) + HEM_SIDE) / FW_FAB) * P'),
        yRepeatCountExp: cols[10] || 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: cols[11] || '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
        roundMode: cols[12] || 'ceil_1dec',
      };
    },
  },
  rails: {
    title: 'ฐานข้อมูลรางม่านและอุปกรณ์เสริม',
    pattern: 'name, rodCategory, curtainStyle, defaultColor, spec',
    desc: 'คอลัมน์: ชื่อราง/อุปกรณ์เสริม, หมวดหมู่ (รางม่านจีบ/รางโชว์/รางม่านลอน/รางม่านพับ/ด้ามจูง/ตะขอเกี่ยวสายรวบ/ห่วงตาไก่/อุปกรณ์เสริม), ใช้กับรูปแบบม่านอะไร, สีมาตรฐาน, รายละเอียด/ขนาด',
    example: [
      'name, rodCategory, curtainStyle, defaultColor, spec',
      'รางม่านจีบ มาตรฐาน (M), รางม่านจีบ, ม่านจีบ, ขาว, รางอลูมิเนียมลื่นพิเศษ',
      'รางโชว์ ลายไม้สัก 28 มม., รางโชว์, ม่านตาไก่, ลายไม้สัก, เส้นผ่านศูนย์กลาง 28 มม.',
      'ด้ามจูงอะคริลิค 120 ซม., ด้ามจูง, *, ใส, ขนาดมาตรฐาน 120 ซม.',
    ].join('\n'),
    headers: ['name', 'ชื่อราง', 'ชื่ออุปกรณ์'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      return {
        id: 'rl_imp_' + Date.now() + '_' + idx,
        name: cols[0],
        rodCategory: cols[1] || 'รางม่านจีบ',
        curtainStyle: cols[2] || '*',
        defaultColor: cols[3] || '',
        spec: cols[4] || '',
      };
    },
  },
  blinds: {
    title: 'ฐานข้อมูลมู่ลี่และม่านม้วน (ตร.ม.)',
    pattern: 'name, curtainStyle, minSqm, roundMode',
    desc: 'คอลัมน์: ชื่อมู่ลี่/ม่านม้วน, รูปแบบม่าน (ม่านม้วน/มู่ลี่ไม้/มู่ลี่อลูมิเนียม), ขายขั้นต่ำ(ตร.ม./ผืน อย่างน้อย 1.5), การปัดเศษ (ceil_1dec / ceil_int / floor_int / none)',
    example: [
      'name, curtainStyle, minSqm, roundMode',
      'ม่านม้วน Blackout, ม่านม้วน, 1.5, ceil_1dec',
      'มู่ลี่ไม้ Basswood 50mm, มู่ลี่ไม้, 1.5, ceil_1dec',
    ].join('\n'),
    headers: ['name', 'ชื่อมู่ลี่', 'ชื่อม่านม้วน'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      return {
        id: 'bl_imp_' + Date.now() + '_' + idx,
        name: cols[0],
        curtainStyle: cols[1] || 'ม่านม้วน',
        minSqm: Math.max(1.5, parseFloat(cols[2]) || 1.5),
        roundMode: cols[3] || 'ceil_1dec',
      };
    },
  },
  curtains: {
    title: 'ฐานข้อมูลรูปแบบผ้าม่าน & ค่ามาตรฐานประจำรูปแบบ (ระยะย่น, เผื่อเย็บบนล่าง, เผื่อริม=10, เกย=8, อ้อมข้าง=8)',
    pattern: 'name, useHook, stdGatherRatio, stdTopBottomHem, stdSideHem, stdOverlap, stdSideReturn',
    desc: 'คอลัมน์: ชื่อรูปแบบผ้าม่าน, ใช้ตะขอ(true/false), ระยะย่นมาตรฐาน, เผื่อเย็บบนล่าง(ซม.), เผื่อเย็บริมผ้ามาตรฐาน(10), เผื่อเกยมาตรฐาน(8), เผื่ออ้อมข้างมาตรฐาน(8)',
    example: [
      'name, useHook, stdGatherRatio, stdTopBottomHem, stdSideHem, stdOverlap, stdSideReturn',
      'ม่านจีบ, true, 2.5, 35, 10, 8, 8',
      'ม่านลอน, true, 2.2, 30, 10, 8, 8',
      'ม่านตาไก่, false, 2.2, 35, 10, 8, 8',
      'ม่านพับ, false, 1.0, 40, 10, 0, 0',
    ].join('\n'),
    headers: ['name', 'ชื่อรูปแบบผ้าม่าน', 'รูปแบบผ้าม่าน'],
    parseRow(cols, idx) {
      if (!cols[0]) return null;
      const h = String(cols[1] || '').toLowerCase();
      return {
        id: 'ct_imp_' + Date.now() + '_' + idx,
        name: cols[0],
        useHook: h === 'true' || h === '1' || h === 'yes' || h === 'ใช่',
        stdGatherRatio: parseFloat(cols[2]) || 2.5,
        stdTopBottomHem: cols[3] !== undefined && cols[3] !== '' ? parseFloat(cols[3]) : 35,
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
  let showPasteBox = false;
  let importMode = 'append'; // 'append' | 'replace'
  let fabricGrainFilter = 'all'; // 'all' | 'opaque' | 'sheer'
  let railCatFilter = 'all';

  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderImportBox(tab) {
    const schema = DB_IMPORT_SCHEMAS[tab];
    if (!schema) return '';
    return `
      <div class="subcard" style="margin-bottom:10px;background:#f4f8ff;border:1px solid #bfd6ff">
        <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div>
            <b style="color:#0b3a8c;font-size:12.5px">📥 นำเข้าข้อมูล "${escH(schema.title)}" จากไฟล์ .txt หรือ .csv (แยกเฉพาะฐานข้อมูลหน้านี้)</b>
            <div style="font-size:11.5px;color:#333;margin-top:2px">
              <b>Pattern ข้อมูลที่ต้องนำเข้า:</b> <code style="background:#fff;padding:2px 6px;border:1px solid #ccd8ee;border-radius:4px;color:#b42318;font-weight:700">${escH(schema.pattern)}</code>
            </div>
            <div style="font-size:11px;color:#555;margin-top:2px">${escH(schema.desc)}</div>
          </div>
          <div class="inline" style="flex-wrap:wrap">
            <select id="dbImportModeSel" style="width:auto;font-size:12px" title="เลือกรูปแบบการนำเข้า">
              <option value="append" ${importMode === 'append' ? 'selected' : ''}>➕ เพิ่มต่อท้ายข้อมูลเดิม</option>
              <option value="replace" ${importMode === 'replace' ? 'selected' : ''}>🔄 แทนที่ข้อมูลเดิมในหมวดนี้</option>
            </select>
            <button type="button" class="primary" data-db-import-file="${escH(tab)}">📂 เลือกไฟล์ .txt / .csv นำเข้า</button>
            <button type="button" data-db-toggle-paste="${escH(tab)}">📋 วางข้อความนำเข้า</button>
            <button type="button" data-db-dl-sample="${escH(tab)}" title="ดาวน์โหลดไฟล์ตัวอย่างตาม Pattern ของฐานข้อมูลหน้านี้">⬇ ไฟล์ตัวอย่าง (.csv/.txt)</button>
          </div>
        </div>
        <details style="margin-top:6px;font-size:11.5px">
          <summary style="cursor:pointer;color:#1f6feb;font-weight:600">👁️ ดูตัวอย่างข้อมูล (Pattern Example สำหรับไฟล์ .txt และ .csv ของหมวดนี้)</summary>
          <pre style="margin:4px 0 0;padding:6px 8px;background:#fff;border:1px solid #d5e0f2;border-radius:4px;font-size:11px;overflow-x:auto;line-height:1.4">${escH(schema.example)}</pre>
        </details>
        ${showPasteBox ? `
          <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #bfd6ff">
            <textarea id="dbPasteTextarea" rows="4" placeholder="วางข้อมูลตาม Pattern (${escH(schema.pattern)}) บรรทัดละ 1 รายการ..." style="font-family:monospace;font-size:12px"></textarea>
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
      alert('ไม่พบข้อมูลที่ตรงตาม Pattern สำหรับนำเข้า กรุณาตรวจสอบรูปแบบข้อมูล');
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

  function render() {
    const body = document.getElementById('dbBody');
    document.querySelectorAll('[data-dbtab]').forEach(b => b.classList.toggle('active', b.dataset.dbtab === activeTab));

    if (activeTab === 'staff') {
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">จัดการบัญชีผู้ใช้งานและรายชื่อพนักงาน (เฉพาะแอดมินเท่านั้นที่สามารถเข้าถึงและแก้ไขฐานข้อมูลได้)</p>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th style="width:110px">Username</th>
              <th style="width:110px">Password</th>
              <th style="width:125px">สิทธิ์ (Role)</th>
              <th>ชื่อพนักงาน (S.R.)</th>
              <th>แผนก (DEPT.)</th>
              <th>สาขา (Branch)</th>
              <th style="width:50px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${masterDB.staff.map((st, i) => `
              <tr>
                <td><input data-db-edit="staff.${i}.username" value="${escH(st.username || '')}" placeholder="Username"></td>
                <td><input data-db-edit="staff.${i}.password" value="${escH(st.password || '')}" placeholder="Password"></td>
                <td>
                  <select data-db-edit="staff.${i}.role">
                    <option value="staff" ${st.role !== 'admin' ? 'selected' : ''}>พนักงาน (Staff)</option>
                    <option value="admin" ${st.role === 'admin' ? 'selected' : ''}>แอดมิน (Admin)</option>
                  </select>
                </td>
                <td><input data-db-edit="staff.${i}.name" value="${escH(st.name)}" placeholder="ชื่อพนักงาน"></td>
                <td><input data-db-edit="staff.${i}.dept" value="${escH(st.dept)}" placeholder="แผนก"></td>
                <td><input data-db-edit="staff.${i}.branch" value="${escH(st.branch)}" placeholder="สาขา"></td>
                <td class="c"><button type="button" class="danger" data-db-del="staff.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="staff">➕ เพิ่มพนักงาน / ผู้ใช้งาน</button>
      `;
    } else if (activeTab === 'fabrics') {
      body.innerHTML = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>🧵 ฐานข้อมูลผ้า (แยกเกรนการคำนวณไว้ชัดเจน):</b><br>
          กำหนด ชื่อผ้า, ดีไซน์ผ้า, ขนาดหน้าผ้า (ซม.), Y-Repeat (ซม.) และเกรนที่ใช้คำนวณ<br>
          <span style="color:#b42318;font-weight:700">* เงื่อนไขสำคัญ: เฉพาะผ้าที่มีขนาดหน้าผ้าเกิน 270 ซม. ขึ้นไป (&gt; 270 ซม.) เท่านั้น ถึงสามารถเลือกใช้คำนวณได้ทั้งเกรนม่านทึบและเกรนม่านโปร่ง</span>
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th>ชื่อผ้า (CS DES.)</th>
              <th style="width:130px">ดีไซน์ผ้า (DES.NO.)</th>
              <th style="width:115px">ขนาดหน้าผ้า (ซม.)</th>
              <th style="width:105px">Y-Repeat (ซม.)</th>
              <th style="width:270px">เกรนการคำนวณผ้า</th>
              <th style="width:45px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${(masterDB.fabrics || []).map((f, i) => {
              const allowSheer = canFabricUseSheerGrain(f.fabricWidth);
              const mode = allowSheer ? (f.calcMode || 'both') : 'opaque';
              return `
              <tr>
                <td><input data-db-edit="fabrics.${i}.name" value="${escH(f.name)}" placeholder="เช่น PASAYA Blackout"></td>
                <td><input data-db-edit="fabrics.${i}.design" value="${escH(f.design)}" placeholder="เช่น BO-140"></td>
                <td><input type="number" step="any" data-db-edit="fabrics.${i}.fabricWidth" value="${escH(f.fabricWidth)}" placeholder="140 หรือ 280"></td>
                <td><input type="number" step="any" data-db-edit="fabrics.${i}.yRepeat" value="${escH(f.yRepeat ?? 0)}" placeholder="0"></td>
                <td>
                  <select data-db-edit="fabrics.${i}.calcMode" ${allowSheer ? '' : 'disabled title="ขนาดหน้าผ้าต้องเกิน 270 ซม. จึงจะเลือกเกรนม่านโปร่งได้"'}>
                    <option value="opaque" ${mode === 'opaque' ? 'selected' : ''}>เกรนม่านทึบเท่านั้น ${allowSheer ? '' : '(หน้าผ้า ≤ 270 ซม.)'}</option>
                    <option value="both" ${mode === 'both' ? 'selected' : ''} ${allowSheer ? '' : 'disabled'}>ทั้งเกรนม่านทึบและเกรนม่านโปร่ง (หน้าผ้า &gt; 270 ซม.)</option>
                    <option value="sheer" ${mode === 'sheer' ? 'selected' : ''} ${allowSheer ? '' : 'disabled'}>เกรนม่านโปร่ง (หน้าผ้า &gt; 270 ซม.)</option>
                  </select>
                </td>
                <td class="c"><button type="button" class="danger" data-db-del="fabrics.${i}">✕</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="fabrics">➕ เพิ่มรายการผ้า</button>
      `;
    } else if (activeTab === 'widthFormulas') {
      body.innerHTML = renderStdParamsBanner() + `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>📐 ฐานข้อมูลขนาดความกว้างผ้าม่าน (แยกการคำนวณตาม รูปแบบผ้าม่าน / จำนวนผืน / จำนวนรางม่าน(ชั้น) / ประเภทรางม่าน):</b><br>
          ค่ามาตรฐาน: <b>อ้อมข้างมาตรฐาน (<code>SR</code>) = 8 ซม.</b>, <b>เกยมาตรฐาน (<code>OV</code>) = 8 ซม.</b>, <b>ระยะย่นตามแต่ละรูปแบบผ้าม่าน (<code>G</code>)</b><br>
          ตัวแปรในสูตร: <code>RW</code> = ขนาดรางม่าน (กว้างเฟรม+เผื่อซ้าย+เผื่อขวา), <code>P</code> = จำนวนผืน, <code>RT</code> = จำนวนชั้นราง, <code>OV</code> = เผื่อเกย, <code>SR</code> = เผื่ออ้อมข้าง
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th style="width:100px">รูปแบบผ้าม่าน</th>
              <th style="width:105px">ประเภทรางม่าน</th>
              <th style="width:90px">จำนวนชั้นราง</th>
              <th style="width:60px">จำนวนผืน (P)</th>
              <th>ชื่อเงื่อนไข</th>
              <th style="width:65px">ระยะย่น (G)</th>
              <th style="width:68px">เผื่อเกย (OV)</th>
              <th style="width:74px">อ้อมข้าง (SR)</th>
              <th style="width:135px">สูตรความกว้างผ้า</th>
              <th style="width:155px">การปัดเศษ</th>
              <th style="width:38px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${(masterDB.widthFormulas || []).map((wf, i) => `
              <tr>
                <td><select data-db-edit="widthFormulas.${i}.curtainStyle">${curtainSelectOpts(wf.curtainStyle)}</select></td>
                <td><select data-db-edit="widthFormulas.${i}.rodType">${rodSelectOpts(wf.rodType || '*')}</select></td>
                <td><select data-db-edit="widthFormulas.${i}.railTracks">${railTrackSelectOpts(wf.railTracks || '*')}</select></td>
                <td><input type="number" step="1" min="1" data-db-edit="widthFormulas.${i}.pieces" value="${escH(wf.pieces ?? 2)}"></td>
                <td><input data-db-edit="widthFormulas.${i}.label" value="${escH(wf.label || '')}" placeholder="ชื่อเงื่อนไข"></td>
                <td><input type="number" step="any" data-db-edit="widthFormulas.${i}.gatherRatio" value="${escH(wf.gatherRatio ?? 2.5)}"></td>
                <td><input type="number" step="any" data-db-edit="widthFormulas.${i}.overlap" value="${escH(wf.overlap ?? 8)}"></td>
                <td><input type="number" step="any" data-db-edit="widthFormulas.${i}.sideReturn" value="${escH(wf.sideReturn ?? 8)}"></td>
                <td><input data-db-edit="widthFormulas.${i}.widthExp" value="${escH(wf.widthExp || '((RW + OV + SR) / P)')}"></td>
                <td><select data-db-edit="widthFormulas.${i}.roundMode">${roundModeSelectOpts(wf.roundMode || 'ceil_int')}</select></td>
                <td class="c"><button type="button" class="danger" data-db-del="widthFormulas.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="widthFormulas">➕ เพิ่มเงื่อนไขขนาดความกว้างผ้าม่าน</button>
      `;
    } else if (activeTab === 'heightFormulas') {
      body.innerHTML = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>📏 ฐานข้อมูลการคำนวณขนาดความสูงผ้าม่าน (ตามรูปแบบผ้าม่าน + ประเภทรางม่าน + จำนวนชั้นราง + จำนวนผืน + ขนาดตะขอ):</b><br>
          <b>การคำนวณความสูงราง (<code>RH</code>) = สูงเฟรม (<code>H</code>) + เผื่อบน (<code>ET</code>) + เผื่อล่าง (<code>EB</code>)</b><br>
          * กรณีลูกค้าไม่รับรางม่าน สามารถเลือกตัวเลือกลดขนาดความสูงผ้าม่านเพิ่มเติมได้ในแต่ละจุดหน้าต่าง/ประตู
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th style="width:105px">รูปแบบผ้าม่าน</th>
              <th style="width:110px">ประเภทรางม่าน</th>
              <th style="width:95px">จำนวนชั้นราง</th>
              <th style="width:85px">จำนวนผืน</th>
              <th style="width:95px">ขนาดตะขอ</th>
              <th>ชื่อเงื่อนไขความสูง</th>
              <th style="width:110px">สูตรความสูงผ้า</th>
              <th style="width:165px">การปัดเศษ</th>
              <th style="width:40px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${(masterDB.heightFormulas || []).map((hf, i) => `
              <tr>
                <td><select data-db-edit="heightFormulas.${i}.curtainStyle">${curtainSelectOpts(hf.curtainStyle)}</select></td>
                <td><select data-db-edit="heightFormulas.${i}.rodType">${rodSelectOpts(hf.rodType)}</select></td>
                <td><select data-db-edit="heightFormulas.${i}.railTracks">${railTrackSelectOpts(hf.railTracks || '*')}</select></td>
                <td><select data-db-edit="heightFormulas.${i}.pieces">${piecesSelectOpts(hf.pieces || '*')}</select></td>
                <td><select data-db-edit="heightFormulas.${i}.hookSize">${hookSelectOpts(hf.hookSize)}</select></td>
                <td><input data-db-edit="heightFormulas.${i}.label" value="${escH(hf.label || '')}"></td>
                <td><input data-db-edit="heightFormulas.${i}.heightExp" value="${escH(hf.heightExp || 'RH')}"></td>
                <td><select data-db-edit="heightFormulas.${i}.roundMode">${roundModeSelectOpts(hf.roundMode || 'none')}</select></td>
                <td class="c"><button type="button" class="danger" data-db-del="heightFormulas.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="heightFormulas">➕ เพิ่มเงื่อนไขการคำนวณความสูงผ้าม่าน</button>
      `;
    } else if (activeTab === 'fabricCalcRules') {
      const rules = masterDB.fabricCalcRules || [];
      const opaqueCount = rules.filter(r => r.grainType !== 'sheer').length;
      const sheerCount = rules.filter(r => r.grainType === 'sheer').length;
      body.innerHTML = renderStdParamsBanner() + `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:4px">
            <b>🧮 ฐานข้อมูลการคำนวณปริมาณผ้า (แยกเกรนม่านทึบ / เกรนม่านโปร่ง พร้อมเงื่อนไขปัดจำนวนหน้าผ้า):</b>
            <div class="inline">
              <button type="button" class="${fabricGrainFilter === 'all' ? 'primary' : ''}" data-db-grain-filter="all">ทั้งหมด (${rules.length})</button>
              <button type="button" class="${fabricGrainFilter === 'opaque' ? 'primary' : ''}" data-db-grain-filter="opaque">⬛ เกรนม่านทึบ (${opaqueCount})</button>
              <button type="button" class="${fabricGrainFilter === 'sheer' ? 'primary' : ''}" data-db-grain-filter="sheer">⬜ เกรนม่านโปร่ง (${sheerCount})</button>
            </div>
          </div>
          • ค่ามาตรฐาน: <b>เผื่อเย็บริมผ้ามาตรฐาน (<code>HEM_SIDE</code>) = 10 ซม.</b>, <b>เผื่อเย็บบนล่างตามรูปแบบผ้าม่าน (<code>HEM_TB</code>)</b>, <b>ระยะย่นตามรูปแบบผ้าม่าน (<code>G</code>)</b><br>
          • <b>เงื่อนไขการคำนวณหน้าผ้า (<code>PANEL_ROUND</code>)</b>: เช่น เกรนม่านทึบ หากคำนวณหน้าผ้าต่อผืนแล้วได้เศษทศนิยม <b>≥ 0.9</b> ขึ้นไป ให้ปัดเศษขึ้นเป็นจำนวนเต็มและ <b>+1 หน้า</b>
        </div>
        <div style="overflow-x:auto">
          <table class="ed-tbl" style="min-width:1280px">
            <thead>
              <tr>
                <th style="width:92px">รูปแบบม่าน</th>
                <th style="width:105px">เกรนคำนวณ</th>
                <th>ชื่อสูตร</th>
                <th style="width:58px">หน้าผ้า (FW_FAB)</th>
                <th style="width:54px">Y-Repeat (YR)</th>
                <th style="width:52px">ระยะย่น (G)</th>
                <th style="width:56px">เย็บริม (HEM_SIDE)</th>
                <th style="width:60px">เย็บบนล่าง (HEM_TB)</th>
                <th style="width:48px">ผืน (P)</th>
                <th style="width:185px">เงื่อนไขปัดจำนวนหน้าผ้า</th>
                <th style="width:56px">เศษ ≥</th>
                <th style="width:52px">+เพิ่มหน้า</th>
                <th style="width:150px">สูตรจำนวนหน้าผ้า (PANELS)</th>
                <th style="width:135px">สูตรปริมาณผ้า (หลา)</th>
                <th style="width:130px">การปัดเศษหลา</th>
                <th style="width:36px">ลบ</th>
              </tr>
            </thead>
            <tbody>
              ${rules.map((r, i) => {
                if (fabricGrainFilter === 'opaque' && r.grainType === 'sheer') return '';
                if (fabricGrainFilter === 'sheer' && r.grainType !== 'sheer') return '';
                return `
                <tr>
                  <td><select data-db-edit="fabricCalcRules.${i}.curtainStyle">${curtainSelectOpts(r.curtainStyle)}</select></td>
                  <td>
                    <select data-db-edit="fabricCalcRules.${i}.grainType">
                      <option value="opaque" ${r.grainType !== 'sheer' ? 'selected' : ''}>เกรนม่านทึบ</option>
                      <option value="sheer" ${r.grainType === 'sheer' ? 'selected' : ''}>เกรนม่านโปร่ง</option>
                    </select>
                  </td>
                  <td><input data-db-edit="fabricCalcRules.${i}.label" value="${escH(r.label || '')}"></td>
                  <td><input type="number" step="any" data-db-edit="fabricCalcRules.${i}.fabricWidth" value="${escH(r.fabricWidth ?? 140)}"></td>
                  <td><input type="number" step="any" data-db-edit="fabricCalcRules.${i}.yRepeat" value="${escH(r.yRepeat ?? 0)}"></td>
                  <td><input type="number" step="any" data-db-edit="fabricCalcRules.${i}.gatherRatio" value="${escH(r.gatherRatio ?? 2.5)}"></td>
                  <td><input type="number" step="any" data-db-edit="fabricCalcRules.${i}.sideHem" value="${escH(r.sideHem ?? 10)}"></td>
                  <td><input type="number" step="any" data-db-edit="fabricCalcRules.${i}.topBottomHem" value="${escH(r.topBottomHem ?? 35)}"></td>
                  <td><input type="number" step="1" data-db-edit="fabricCalcRules.${i}.pieces" value="${escH(r.pieces ?? 2)}"></td>
                  <td><select data-db-edit="fabricCalcRules.${i}.panelRoundMode">${panelRoundModeSelectOpts(r.panelRoundMode || (r.grainType === 'sheer' ? 'ceil' : 'ceil_plus1_if_frac_ge'))}</select></td>
                  <td><input type="number" step="0.05" min="0.05" max="0.99" data-db-edit="fabricCalcRules.${i}.panelFracThreshold" value="${escH(r.panelFracThreshold ?? 0.9)}"></td>
                  <td><input type="number" step="1" min="0" data-db-edit="fabricCalcRules.${i}.panelExtraAdd" value="${escH(r.panelExtraAdd ?? (r.grainType === 'sheer' ? 0 : 1))}"></td>
                  <td><input data-db-edit="fabricCalcRules.${i}.panelCountExp" value="${escH(r.panelCountExp || '')}"></td>
                  <td><input data-db-edit="fabricCalcRules.${i}.qtyExp" value="${escH(r.qtyExp || '')}"></td>
                  <td><select data-db-edit="fabricCalcRules.${i}.roundMode">${roundModeSelectOpts(r.roundMode || 'ceil_1dec')}</select></td>
                  <td class="c"><button type="button" class="danger" data-db-del="fabricCalcRules.${i}">✕</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="inline" style="margin-top:8px">
          <button type="button" class="primary" data-db-add="fabricCalcRules" data-grain="opaque">➕ เพิ่มสูตรเกรนม่านทึบ</button>
          <button type="button" class="primary" data-db-add="fabricCalcRules" data-grain="sheer">➕ เพิ่มสูตรเกรนม่านโปร่ง</button>
        </div>
      `;
    } else if (activeTab === 'rails') {
      const railsAll = masterDB.rails || [];
      body.innerHTML = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <div class="inline" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div>
              <b>🛤️ ฐานข้อมูลรางม่านและอุปกรณ์เสริม:</b><br>
              แยกหมวดหมู่ได้ทั้ง <b>รางม่าน (รางม่านจีบ, รางโชว์, รางม่านลอน, รางม่านพับ)</b> และ <b>อุปกรณ์เสริม (ด้ามจูง, ตะขอเกี่ยวสายรวบ, ห่วงตาไก่, อุปกรณ์เสริมอื่นๆ)</b>
            </div>
            <div class="inline">
              <button type="button" class="${railCatFilter === 'all' ? 'primary' : ''}" data-db-rail-filter="all">ทั้งหมด (${railsAll.length})</button>
              <button type="button" class="${railCatFilter === 'rails_only' ? 'primary' : ''}" data-db-rail-filter="rails_only">เฉพาะรางม่าน</button>
              <button type="button" class="${railCatFilter === 'acc_only' ? 'primary' : ''}" data-db-rail-filter="acc_only">เฉพาะอุปกรณ์เสริม</button>
            </div>
          </div>
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th>ชื่อรางม่าน / อุปกรณ์เสริม</th>
              <th style="width:155px">หมวดหมู่ราง/อุปกรณ์</th>
              <th style="width:140px">ใช้กับรูปแบบม่าน</th>
              <th style="width:115px">สีมาตรฐาน</th>
              <th style="width:200px">รายละเอียด / ขนาด</th>
              <th style="width:45px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${railsAll.map((rl, i) => {
              const isAcc = /ด้ามจูง|ตะขอ|ห่วง|อุปกรณ์/.test(String(rl.rodCategory || ''));
              if (railCatFilter === 'rails_only' && isAcc) return '';
              if (railCatFilter === 'acc_only' && !isAcc) return '';
              return `
              <tr>
                <td><input data-db-edit="rails.${i}.name" value="${escH(rl.name || '')}" placeholder="เช่น รางม่านจีบ มาตรฐาน / ด้ามจูงอะคริลิค"></td>
                <td><select data-db-edit="rails.${i}.rodCategory">${rodSelectOpts(rl.rodCategory)}</select></td>
                <td><select data-db-edit="rails.${i}.curtainStyle">${curtainSelectOpts(rl.curtainStyle)}</select></td>
                <td><input data-db-edit="rails.${i}.defaultColor" value="${escH(rl.defaultColor || '')}" placeholder="เช่น ขาว, ดำ, เงิน"></td>
                <td><input data-db-edit="rails.${i}.spec" value="${escH(rl.spec || '')}" placeholder="เช่น 120 ซม., 28 มม."></td>
                <td class="c"><button type="button" class="danger" data-db-del="rails.${i}">✕</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div class="inline" style="margin-top:8px">
          <button type="button" class="primary" data-db-add="rails" data-cat="รางม่านจีบ">➕ เพิ่มรางม่าน</button>
          <button type="button" class="primary" data-db-add="rails" data-cat="อุปกรณ์เสริม">➕ เพิ่มอุปกรณ์เสริม</button>
        </div>
      `;
    } else if (activeTab === 'blinds') {
      body.innerHTML = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>🪟 ฐานข้อมูลมู่ลี่และม่านม้วน:</b><br>
          คำนวณพื้นที่เป็น <b>ตารางเมตร (ตร.ม.)</b> โดยกำหนดขายขั้นต่ำ <b>1.5 ตารางเมตรต่อผืน</b> (หากขนาดกว้าง×สูงต่อผืนน้อยกว่าขั้นต่ำ ระบบจะคิดเป็น 1.5 ตร.ม./ผืน อัตโนมัติ)
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th>ชื่อมู่ลี่ / ม่านม้วน</th>
              <th style="width:160px">รูปแบบม่าน</th>
              <th style="width:155px">ขายขั้นต่ำ (ตร.ม. / ผืน)</th>
              <th style="width:210px">การปัดเศษ</th>
              <th style="width:50px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${(masterDB.blinds || []).map((bl, i) => `
              <tr>
                <td><input data-db-edit="blinds.${i}.name" value="${escH(bl.name || '')}" placeholder="เช่น ม่านม้วน Blackout"></td>
                <td><select data-db-edit="blinds.${i}.curtainStyle">${curtainSelectOpts(bl.curtainStyle)}</select></td>
                <td><input type="number" step="0.1" min="1.5" data-db-edit="blinds.${i}.minSqm" value="${escH(bl.minSqm ?? 1.5)}"></td>
                <td><select data-db-edit="blinds.${i}.roundMode">${roundModeSelectOpts(bl.roundMode || 'ceil_1dec')}</select></td>
                <td class="c"><button type="button" class="danger" data-db-del="blinds.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="blinds">➕ เพิ่มรายการมู่ลี่ / ม่านม้วน</button>
      `;
    } else if (activeTab === 'curtains') {
      body.innerHTML = renderStdParamsBanner() + `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>🎀 ฐานข้อมูลรูปแบบผ้าม่าน & ค่ามาตรฐานประจำแต่ละรูปแบบผ้าม่าน:</b><br>
          กำหนด <b>ระยะย่นตามแต่ละรูปแบบผ้าม่าน</b>, <b>เผื่อเย็บบนล่างตามแต่ละรูปแบบผ้าม่าน</b>, <b>เผื่อเย็บริมผ้ามาตรฐาน (= 10)</b>, <b>เผื่อเกยมาตรฐาน (= 8)</b> และ <b>เผื่ออ้อมข้างมาตรฐาน (= 8)</b>
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th>ชื่อรูปแบบผ้าม่าน</th>
              <th style="width:95px">ใช้ตะขอ (จีบ/ลอน)</th>
              <th style="width:120px">ระยะย่นมาตรฐาน (เท่า)</th>
              <th style="width:135px">เผื่อเย็บบนล่าง (ซม.)</th>
              <th style="width:125px">เผื่อเย็บริมผ้า (ซม.)</th>
              <th style="width:115px">เกยมาตรฐาน (ซม.)</th>
              <th style="width:120px">อ้อมข้างมาตรฐาน (ซม.)</th>
              <th style="width:50px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${masterDB.curtains.map((c, i) => `
              <tr>
                <td><input data-db-edit="curtains.${i}.name" value="${escH(c.name)}" placeholder="เช่น ม่านจีบ"></td>
                <td class="c"><input type="checkbox" data-db-edit="curtains.${i}.useHook" ${c.useHook ? 'checked' : ''}></td>
                <td><input type="number" step="any" data-db-edit="curtains.${i}.stdGatherRatio" value="${escH(c.stdGatherRatio ?? 2.5)}"></td>
                <td><input type="number" step="any" data-db-edit="curtains.${i}.stdTopBottomHem" value="${escH(c.stdTopBottomHem ?? 35)}"></td>
                <td><input type="number" step="any" data-db-edit="curtains.${i}.stdSideHem" value="${escH(c.stdSideHem ?? 10)}"></td>
                <td><input type="number" step="any" data-db-edit="curtains.${i}.stdOverlap" value="${escH(c.stdOverlap ?? 8)}"></td>
                <td><input type="number" step="any" data-db-edit="curtains.${i}.stdSideReturn" value="${escH(c.stdSideReturn ?? 8)}"></td>
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
    }
    body.innerHTML = renderImportBox(activeTab) + body.innerHTML;
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
        if (!canFabricUseSheerGrain(val)) {
          masterDB.fabrics[+idx].calcMode = 'opaque';
        }
        saveMasterDB();
        render();
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
        showPasteBox = false;
        render();
      });
    });
    document.getElementById('dbClose').addEventListener('click', () => {
      modal.hidden = true;
      if (onUpdate) onUpdate();
    });
    modal.addEventListener('input', onEditChange);
    modal.addEventListener('change', onEditChange);
    modal.addEventListener('click', e => {
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
          if (+wf.pieces > 1) wf.overlap = sp.stdOverlap ?? 8;
          if (!isBlindOrRollerStyle(wf.curtainStyle) && wf.curtainStyle !== 'ม่านพับ') {
            wf.sideReturn = sp.stdSideReturn ?? 8;
          }
        });
        (masterDB.fabricCalcRules || []).forEach(r => {
          const st = getStdCurtainParams(r.curtainStyle);
          r.sideHem = sp.stdSideHem ?? 10;
          r.gatherRatio = st.gatherRatio;
          r.topBottomHem = st.topBottomHem;
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
          alert('กรุณาวางข้อความตาม Pattern ก่อนกดนำเข้า');
        }
        return;
      }
      const dlSampleBtn = e.target.closest('[data-db-dl-sample]');
      if (dlSampleBtn) {
        downloadSampleForTab(dlSampleBtn.dataset.dbDlSample || activeTab);
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
          masterDB.rails.push({ id, name: '', rodCategory: cat, curtainStyle: '*', defaultColor: '', spec: '' });
        } else if (t === 'blinds') {
          masterDB.blinds.push({ id, name: '', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' });
        } else if (t === 'curtains') {
          masterDB.curtains.push({
            id, name: '', useHook: false,
            stdGatherRatio: 2.5, stdTopBottomHem: 35,
            stdSideHem: sp.stdSideHem ?? 10, stdOverlap: sp.stdOverlap ?? 8, stdSideReturn: sp.stdSideReturn ?? 8,
          });
        } else if (t === 'hooks') {
          masterDB.hooks.push({ id, name: '' });
        } else if (t === 'remarks') {
          masterDB.remarks.push({ id, name: '' });
        } else if (t === 'widthFormulas') {
          masterDB.widthFormulas.push({
            id, curtainStyle: 'ม่านจีบ', rodType: '*', railTracks: '*', pieces: 2,
            label: 'เงื่อนไขความกว้างใหม่', railWidth: 'RW',
            gatherRatio: 2.5, overlap: sp.stdOverlap ?? 8, sideReturn: sp.stdSideReturn ?? 8,
            widthExp: '((RW + OV + SR) / P)', roundMode: 'ceil_int',
          });
        } else if (t === 'heightFormulas') {
          masterDB.heightFormulas.push({
            id, curtainStyle: 'ม่านจีบ', rodType: 'รางม่านจีบ', railTracks: '*', pieces: '*', hookSize: '*',
            label: 'เงื่อนไขความสูงใหม่', heightExp: 'RH - 2', roundMode: 'none',
          });
        } else if (t === 'fabricCalcRules') {
          const gType = add.dataset.grain || (fabricGrainFilter === 'sheer' ? 'sheer' : 'opaque');
          const isSheer = gType === 'sheer';
          masterDB.fabricCalcRules.push({
            id, curtainStyle: 'ม่านจีบ', grainType: gType,
            label: isSheer ? 'สูตรเกรนม่านโปร่งใหม่' : 'สูตรเกรนม่านทึบใหม่',
            fabricWidth: isSheer ? 300 : 140, yRepeat: 0,
            gatherRatio: 2.5, sideHem: sp.stdSideHem ?? 10, topBottomHem: 35, pieces: 2,
            panelRoundMode: isSheer ? 'ceil' : 'ceil_plus1_if_frac_ge',
            panelFracThreshold: 0.9,
            panelExtraAdd: isSheer ? 0 : 1,
            panelCountExp: isSheer ? 'P' : 'PANEL_ROUND(((WC * G) + HEM_SIDE) / FW_FAB) * P',
            yRepeatCountExp: isSheer ? '0' : 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
            qtyExp: isSheer ? '(((WC * G) + HEM_SIDE) * P) / 90' : '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
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
        saveMasterDB(); render();
      }
    });
  }

  function open(tab = 'staff') {
    if (typeof isAdminUser === 'function' && !isAdminUser()) {
      alert('เฉพาะแอดมินเท่านั้นที่สามารถเข้าใช้เมนูฐานข้อมูลได้');
      return;
    }
    activeTab = tab;
    render();
    document.getElementById('dbModal').hidden = false;
  }

  return { init, open };
})();
