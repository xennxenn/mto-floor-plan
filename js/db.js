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
const DB_KEY = 'mto-master-db-v6';

const ROD_TYPES_LIST = [
  'รางม่านจีบ',
  'รางโชว์',
  'รางม่านลอน',
  'รางม่านพับ',
  'อุปกรณ์เสริม',
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
 * ตรวจสอบว่าขนาดหน้าผ้าสามารถใช้คำนวณแบบเกรนม่านโปร่งได้หรือไม่
 * (เฉพาะผ้าที่มีขนาดหน้าผ้าเกิน 270 ซม. ขึ้นไปถึงสามารถใช้คำนวณได้ทั้งเกรนม่านทึบและเกรนม่านโปร่ง)
 */
function canFabricUseSheerGrain(fabricWidth) {
  const fw = parseFloat(fabricWidth);
  return !isNaN(fw) && fw > 270;
}

function defaultMasterDB() {
  return {
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
    // ฐานข้อมูลรางและอุปกรณ์
    rails: [
      { id: 'rl1', name: 'รางม่านจีบ มาตรฐาน', rodCategory: 'รางม่านจีบ', curtainStyle: 'ม่านจีบ', defaultColor: 'ขาว' },
      { id: 'rl2', name: 'รางโชว์ 28 มม.', rodCategory: 'รางโชว์', curtainStyle: 'ม่านตาไก่', defaultColor: 'ดำ' },
      { id: 'rl3', name: 'รางโชว์ใช้กับม่านจีบ', rodCategory: 'รางโชว์', curtainStyle: 'ม่านจีบ', defaultColor: 'เงิน' },
      { id: 'rl4', name: 'รางม่านลอน S-Curve', rodCategory: 'รางม่านลอน', curtainStyle: 'ม่านลอน', defaultColor: 'ขาว' },
      { id: 'rl5', name: 'รางม่านพับ Roman', rodCategory: 'รางม่านพับ', curtainStyle: 'ม่านพับ', defaultColor: 'ขาว' },
      { id: 'rl6', name: 'ด้ามจูงอะคริลิค 120 ซม.', rodCategory: 'อุปกรณ์เสริม', curtainStyle: '*', defaultColor: 'ใส' },
      { id: 'rl7', name: 'ตะขอรวบม่านมาตรฐาน', rodCategory: 'อุปกรณ์เสริม', curtainStyle: '*', defaultColor: 'เงิน' },
    ],
    // ฐานข้อมูลมู่ลี่และม่านม้วน (คำนวณเป็นตารางเมตร ขายขั้นต่ำ 1.5 ตร.ม./ผืน)
    blinds: [
      { id: 'bl1', name: 'ม่านม้วน Blackout', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl2', name: 'ม่านม้วน Sunscreen', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl3', name: 'ม่านม้วน Dimout', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl4', name: 'มู่ลี่ไม้ Basswood 50 มม.', curtainStyle: 'มู่ลี่ไม้', minSqm: 1.5, roundMode: 'ceil_1dec' },
      { id: 'bl5', name: 'มู่ลี่อลูมิเนียม 25 มม.', curtainStyle: 'มู่ลี่อลูมิเนียม', minSqm: 1.5, roundMode: 'ceil_1dec' },
    ],
    // ฐานข้อมูลขนาดความกว้างผ้าม่าน (มีขนาดรางม่าน, จำนวนผืน, ระยะย่นผ้าม่านแต่ละแบบ, ระยะเผื่อเกย, ระยะเผื่ออ้อมข้าง)
    widthFormulas: [
      {
        id: 'wf1',
        curtainStyle: 'ม่านจีบ',
        label: 'ม่านจีบ 2 ผืน แยกกลาง มาตรฐาน (เกย 10, อ้อมข้าง 15)',
        railWidth: 'RW',
        pieces: 2,
        gatherRatio: 2.5,
        overlap: 10,
        sideReturn: 15,
        widthExp: '((RW + OV + SR) / P)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf2',
        curtainStyle: 'ม่านจีบ',
        label: 'ม่านจีบ 1 ผืน รวบข้างเดียว (เกย 0, อ้อมข้าง 15)',
        railWidth: 'RW',
        pieces: 1,
        gatherRatio: 2.5,
        overlap: 0,
        sideReturn: 15,
        widthExp: '(RW + OV + SR)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf3',
        curtainStyle: 'ม่านลอน',
        label: 'ม่านลอน 2 ผืน แยกกลาง (ลอน 2.2 เท่า, เกย 10, อ้อมข้าง 10)',
        railWidth: 'RW',
        pieces: 2,
        gatherRatio: 2.2,
        overlap: 10,
        sideReturn: 10,
        widthExp: '((RW + OV + SR) / P)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf4',
        curtainStyle: 'ม่านตาไก่',
        label: 'ม่านตาไก่ 2 ผืน แยกกลาง (ลอน 2.2 เท่า, เกย 0, อ้อมข้าง 10)',
        railWidth: 'RW',
        pieces: 2,
        gatherRatio: 2.2,
        overlap: 0,
        sideReturn: 10,
        widthExp: '((RW + OV + SR) / P)',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf5',
        curtainStyle: 'ม่านพับ',
        label: 'ม่านพับ 1 ผืน (กว้างเท่ากับราง RW)',
        railWidth: 'RW',
        pieces: 1,
        gatherRatio: 1.0,
        overlap: 0,
        sideReturn: 0,
        widthExp: 'RW',
        roundMode: 'ceil_int',
      },
      {
        id: 'wf6',
        curtainStyle: 'ม่านม้วน',
        label: 'ม่านม้วน 1 ผืน (กว้างเท่ากับราง RW)',
        railWidth: 'RW',
        pieces: 1,
        gatherRatio: 1.0,
        overlap: 0,
        sideReturn: 0,
        widthExp: 'RW',
        roundMode: 'none',
      },
    ],
    // ฐานข้อมูลขนาดความสูงผ้าม่านตามรูปแบบผ้าม่าน + ประเภทรางม่าน + ขนาดตะขอ
    heightFormulas: [
      {
        id: 'hf1',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        hookSize: 'No.5',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.5 (หัก 1.5 ซม.)',
        heightExp: 'RH - 1.5',
        roundMode: 'none',
      },
      {
        id: 'hf2',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        hookSize: 'No.6',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.6 (หัก 2 ซม.)',
        heightExp: 'RH - 2',
        roundMode: 'none',
      },
      {
        id: 'hf3',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        hookSize: 'No.8',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.8 (หัก 1 ซม.)',
        heightExp: 'RH - 1',
        roundMode: 'none',
      },
      {
        id: 'hf4',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางม่านจีบ',
        hookSize: 'No.9',
        label: 'ม่านจีบ + รางม่านจีบ + ตะขอ No.9 (เท่าความสูงราง RH)',
        heightExp: 'RH',
        roundMode: 'none',
      },
      {
        id: 'hf5',
        curtainStyle: 'ม่านจีบ',
        rodType: 'รางโชว์',
        hookSize: '*',
        label: 'ม่านจีบ + รางโชว์ (หักหัวรางโชว์ 4 ซม.)',
        heightExp: 'RH - 4',
        roundMode: 'none',
      },
      {
        id: 'hf6',
        curtainStyle: 'ม่านลอน',
        rodType: 'รางม่านลอน',
        hookSize: '*',
        label: 'ม่านลอน + รางม่านลอน (หักราง 2.5 ซม.)',
        heightExp: 'RH - 2.5',
        roundMode: 'none',
      },
      {
        id: 'hf7',
        curtainStyle: 'ม่านตาไก่',
        rodType: 'รางโชว์',
        hookSize: '*',
        label: 'ม่านตาไก่ + รางโชว์ (บวกหัวม่านเหนือราง +3 ซม.)',
        heightExp: 'RH + 3',
        roundMode: 'none',
      },
      {
        id: 'hf8',
        curtainStyle: 'ม่านพับ',
        rodType: 'รางม่านพับ',
        hookSize: '*',
        label: 'ม่านพับ + รางม่านพับ (เท่าความสูงราง RH)',
        heightExp: 'RH',
        roundMode: 'none',
      },
      {
        id: 'hf9',
        curtainStyle: '*',
        rodType: '*',
        hookSize: '*',
        label: 'ทั่วไป: เท่ากับความสูงราง (RH)',
        heightExp: 'RH',
        roundMode: 'none',
      },
    ],
    // ฐานข้อมูลคำนวณปริมาณผ้า แยกเกรนม่านทึบ (opaque) และเกรนม่านโปร่ง (sheer)
    // มีครบ: ขนาดความกว้างผ้าม่าน (WC), จำนวนหน้าผ้า (PANELS), ขนาดหน้าผ้า (FW_FAB), Y-Repeat (YR),
    // จำนวน Y-Repeat (YR_CNT), ระยะเผื่อพับริมผ้า (HEM_SIDE), ระยะย่นผ้าม่านแต่ละแบบ (G),
    // ระยะพับขอบบนล่างผ้าม่านแต่ละแบบ (HEM_TB), จำนวนผืน (P)
    fabricCalcRules: [
      {
        id: 'fcr1',
        curtainStyle: 'ม่านจีบ',
        grainType: 'opaque',
        label: 'เกรนม่านทึบ - ม่านจีบ (ต่อหน้าผ้าแนวตั้ง • ลอน 2.5 • พับริม 15 • พับบนล่าง 35)',
        fabricWidth: 140,
        yRepeat: 0,
        gatherRatio: 2.5,
        sideHem: 15,
        topBottomHem: 35,
        pieces: 2,
        panelCountExp: 'CEIL(((WC * G) + HEM_SIDE) / FW_FAB) * P',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr2',
        curtainStyle: 'ม่านจีบ',
        grainType: 'sheer',
        label: 'เกรนม่านโปร่ง - ม่านจีบ (กลับหน้าผ้า >270 • ลอน 2.5 • พับริม 15 • พับบนล่าง 35)',
        fabricWidth: 300,
        yRepeat: 0,
        gatherRatio: 2.5,
        sideHem: 15,
        topBottomHem: 35,
        pieces: 2,
        panelCountExp: 'P',
        yRepeatCountExp: '0',
        qtyExp: '(((WC * G) + HEM_SIDE) * P) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr3',
        curtainStyle: 'ม่านลอน',
        grainType: 'opaque',
        label: 'เกรนม่านทึบ - ม่านลอน (ต่อหน้าผ้าแนวตั้ง • ลอน 2.2 • พับริม 15 • พับบนล่าง 30)',
        fabricWidth: 140,
        yRepeat: 0,
        gatherRatio: 2.2,
        sideHem: 15,
        topBottomHem: 30,
        pieces: 2,
        panelCountExp: 'CEIL(((WC * G) + HEM_SIDE) / FW_FAB) * P',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr4',
        curtainStyle: 'ม่านลอน',
        grainType: 'sheer',
        label: 'เกรนม่านโปร่ง - ม่านลอน (กลับหน้าผ้า >270 • ลอน 2.2 • พับริม 15 • พับบนล่าง 30)',
        fabricWidth: 300,
        yRepeat: 0,
        gatherRatio: 2.2,
        sideHem: 15,
        topBottomHem: 30,
        pieces: 2,
        panelCountExp: 'P',
        yRepeatCountExp: '0',
        qtyExp: '(((WC * G) + HEM_SIDE) * P) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr5',
        curtainStyle: 'ม่านตาไก่',
        grainType: 'opaque',
        label: 'เกรนม่านทึบ - ม่านตาไก่ (ต่อหน้าผ้าแนวตั้ง • ลอน 2.2 • พับริม 15 • พับบนล่าง 35)',
        fabricWidth: 140,
        yRepeat: 0,
        gatherRatio: 2.2,
        sideHem: 15,
        topBottomHem: 35,
        pieces: 2,
        panelCountExp: 'CEIL(((WC * G) + HEM_SIDE) / FW_FAB) * P',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr6',
        curtainStyle: 'ม่านตาไก่',
        grainType: 'sheer',
        label: 'เกรนม่านโปร่ง - ม่านตาไก่ (กลับหน้าผ้า >270 • ลอน 2.2 • พับริม 15 • พับบนล่าง 35)',
        fabricWidth: 300,
        yRepeat: 0,
        gatherRatio: 2.2,
        sideHem: 15,
        topBottomHem: 35,
        pieces: 2,
        panelCountExp: 'P',
        yRepeatCountExp: '0',
        qtyExp: '(((WC * G) + HEM_SIDE) * P) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr7',
        curtainStyle: 'ม่านพับ',
        grainType: 'opaque',
        label: 'เกรนม่านทึบ - ม่านพับ (ลอน 1.0 • พับริม 15 • พับบนล่าง 40)',
        fabricWidth: 140,
        yRepeat: 0,
        gatherRatio: 1.0,
        sideHem: 15,
        topBottomHem: 40,
        pieces: 1,
        panelCountExp: 'CEIL(((WC * G) + HEM_SIDE) / FW_FAB) * P',
        yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
        qtyExp: '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
        roundMode: 'ceil_1dec',
      },
      {
        id: 'fcr8',
        curtainStyle: 'ม่านพับ',
        grainType: 'sheer',
        label: 'เกรนม่านโปร่ง - ม่านพับ (กลับหน้าผ้า >270 • ลอน 1.0 • พับริม 15 • พับบนล่าง 40)',
        fabricWidth: 300,
        yRepeat: 0,
        gatherRatio: 1.0,
        sideHem: 15,
        topBottomHem: 40,
        pieces: 1,
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

function normalizeWidthFormulaItem(wf, idx) {
  const def = defaultMasterDB().widthFormulas[0];
  return Object.assign({
    id: 'wf_' + (idx + 1),
    curtainStyle: 'ม่านจีบ',
    label: '',
    railWidth: 'RW',
    pieces: 2,
    gatherRatio: 2.5,
    overlap: 10,
    sideReturn: 15,
    widthExp: '((RW + OV + SR) / P)',
    roundMode: 'ceil_int',
  }, def, wf || {});
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
    staff: ensureDefaultAdmin(Array.isArray(raw.staff) ? raw.staff : def.staff),
    curtains: Array.isArray(raw.curtains) && raw.curtains.length ? raw.curtains : def.curtains,
    hooks: Array.isArray(raw.hooks) && raw.hooks.length ? raw.hooks : def.hooks,
    remarks: Array.isArray(raw.remarks) && raw.remarks.length ? raw.remarks : def.remarks,
    fabrics: Array.isArray(raw.fabrics) && raw.fabrics.length
      ? raw.fabrics.map((f, i) => normalizeFabricItem(f, i))
      : def.fabrics,
    rails: Array.isArray(raw.rails) && raw.rails.length ? raw.rails : def.rails,
    blinds: Array.isArray(raw.blinds) && raw.blinds.length ? raw.blinds : def.blinds,
    widthFormulas: Array.isArray(raw.widthFormulas) && raw.widthFormulas.length
      ? raw.widthFormulas.map((w, i) => normalizeWidthFormulaItem(w, i))
      : def.widthFormulas,
    heightFormulas: Array.isArray(raw.heightFormulas) && raw.heightFormulas.length
      ? raw.heightFormulas.map(h => Object.assign({ roundMode: 'none' }, h))
      : def.heightFormulas,
    fabricCalcRules: Array.isArray(raw.fabricCalcRules) && raw.fabricCalcRules.length
      ? raw.fabricCalcRules
      : def.fabricCalcRules,
  };
}

let masterDB = (() => {
  try {
    const raw = JSON.parse(
      localStorage.getItem(DB_KEY) ||
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
 *   WC (ความกว้างผ้าม่าน), HC (ความสูงผ้าม่าน), P (จำนวนผืน),
 *   G (ระยะย่นผ้าม่าน), OV (ระยะเผื่อเกย), SR (ระยะเผื่ออ้อมข้าง),
 *   FW_FAB (ขนาดหน้าผ้า), YR (Y-Repeat), HEM_SIDE (ระยะเผื่อพับริมผ้า), HEM_TB (ระยะพับขอบบนล่าง),
 *   PANELS (จำนวนหน้าผ้า), YR_CNT (จำนวน Y-Repeat)
 * Functions:
 *   FLOOR(x) / floor(x) = ปัดเศษลงเป็นจำนวนเต็ม
 *   CEIL(x)  / ceil(x)  = ปัดเศษขึ้นเป็นจำนวนเต็ม
 *   CEIL1(x) / ceil1(x) = ปัดเศษขึ้นเป็นทศนิยม 1 ตำแหน่ง
 *   ROUND(x) / round(x) = ปัดเศษทั่วไป
 */
function evalFormulaExpr(expr, vars = {}, roundMode = 'none') {
  if (expr === undefined || expr === null || !String(expr).trim()) return '';
  try {
    const floorInt = x => Math.floor(Number(x) + 1e-9);
    const ceilInt = x => Math.ceil(Number(x) - 1e-9);
    const ceil1Dec = x => Math.ceil((Number(x) - 1e-9) * 10) / 10;
    const roundStd = x => Math.round(Number(x) * 100) / 100;

    const fn = new Function(
      'W', 'H', 'EL', 'ER', 'ET', 'EB', 'RW', 'RH', 'FW', 'FH',
      'WC', 'HC', 'P', 'G', 'OV', 'SR',
      'FW_FAB', 'YR', 'HEM_SIDE', 'HEM_TB', 'PANELS', 'YR_CNT',
      'ceil', 'floor', 'round', 'ceil1', 'CEIL', 'FLOOR', 'ROUND', 'CEIL1', 'max', 'min',
      `"use strict"; return (${expr});`
    );
    const res = fn(
      vars.W || 0, vars.H || 0, vars.EL || 0, vars.ER || 0, vars.ET || 0, vars.EB || 0,
      vars.RW || 0, vars.RH || 0, vars.FW || 0, vars.FH || 0,
      vars.WC || 0, vars.HC || 0, vars.P || 1, vars.G || 1, vars.OV || 0, vars.SR || 0,
      vars.FW_FAB || 140, vars.YR || 0, vars.HEM_SIDE || 0, vars.HEM_TB || 0,
      vars.PANELS || 1, vars.YR_CNT || 0,
      ceilInt, floorInt, roundStd, ceil1Dec, ceilInt, floorInt, roundStd, ceil1Dec, Math.max, Math.min
    );
    if (res === undefined || res === null || Number.isNaN(res) || !Number.isFinite(res)) return '';
    return applyRoundMode(res, roundMode);
  } catch (e) {
    console.warn('Formula error:', expr, e);
    return '';
  }
}

function getWidthFormulasForStyle(curtainStyle) {
  const all = masterDB.widthFormulas || [];
  if (!curtainStyle) return all;
  const matched = all.filter(f => !f.curtainStyle || f.curtainStyle === '*' || f.curtainStyle === curtainStyle || curtainStyle.includes(f.curtainStyle));
  return matched.length ? matched : all;
}

function getHeightFormulasForWindow(curtainStyle, rodType, hookSize) {
  const all = masterDB.heightFormulas || [];
  const matched = all.filter(f => {
    const matchStyle = !curtainStyle || !f.curtainStyle || f.curtainStyle === '*' || f.curtainStyle === curtainStyle || curtainStyle.includes(f.curtainStyle);
    const matchRod = !rodType || !f.rodType || f.rodType === '*' || f.rodType === rodType;
    const matchHook = !hookSize || !f.hookSize || f.hookSize === '*' || f.hookSize === hookSize;
    return matchStyle && matchRod && matchHook;
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

function getRailsForStyle(curtainStyle) {
  const all = masterDB.rails || [];
  if (!curtainStyle) return all;
  const matched = all.filter(r => !r.curtainStyle || r.curtainStyle === '*' || r.curtainStyle === curtainStyle || curtainStyle.includes(r.curtainStyle));
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
 * คำนวณขนาดความกว้างผ้าม่าน, ความสูงผ้าม่าน, จำนวนผืน และปริมาณผ้า (แยกเกรนม่านทึบ / เกรนม่านโปร่ง หรือ ม่านม้วน/มู่ลี่ ตร.ม. ขั้นต่ำ 1.5 ตร.ม./ผืน)
 */
function computeCurtainLayerByWidthHeight(w, wf, hf, opts = {}) {
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const W = num(w.width), H = num(w.height);
  const EL = num(w.extL), ER = num(w.extR), ET = num(w.extT), EB = num(w.extB);
  const RW = (w.calcMode === 'manual' && w.customRailW !== undefined && String(w.customRailW).trim() !== '')
    ? num(w.customRailW)
    : (W + EL + ER);
  const RH = (w.calcMode === 'manual' && w.customRailH !== undefined && String(w.customRailH).trim() !== '')
    ? num(w.customRailH)
    : (H + ET + EB);
  const FW = num(w.fullW), FH = num(w.fullH);

  const P = num(opts.pieces) || num(wf && wf.pieces) || (isBlindOrRollerStyle(opts.curtainStyle) ? 1 : 2);
  const G = num(opts.gatherRatio) || num(wf && wf.gatherRatio) || 2.5;
  const OV = num(wf && wf.overlap);
  const SR = num(wf && wf.sideReturn);

  const vars = {
    W, H, EL, ER, ET, EB, RW, RH, FW, FH,
    WC: RW, HC: RH, P, G, OV, SR,
    FW_FAB: 140, YR: 0, HEM_SIDE: 15, HEM_TB: 35, PANELS: P, YR_CNT: 0,
  };

  // 1) คำนวณขนาดความกว้างผ้าม่าน (a)
  let a = '';
  if (wf && wf.widthExp) {
    a = evalFormulaExpr(wf.widthExp, vars, wf.roundMode || 'none');
  } else if (RW) {
    a = String(RW);
  }
  vars.WC = num(a) || RW;

  // 2) คำนวณขนาดความสูงผ้าม่าน (b)
  let b = '';
  if (hf && hf.heightExp) {
    b = evalFormulaExpr(hf.heightExp, vars, hf.roundMode || 'none');
  } else if (RH) {
    b = String(RH);
  }
  vars.HC = num(b) || RH;

  // 3) กรณีเป็นม่านม้วน / มู่ลี่ -> คำนวณเป็นตารางเมตร ขั้นต่ำ 1.5 ตร.ม./ผืน
  const styleName = opts.curtainStyle || (wf && wf.curtainStyle) || '';
  const passedBlind = opts.blindItem || opts.blindRule || null;
  if (isBlindOrRollerStyle(styleName) || passedBlind) {
    const blindRule = passedBlind || (masterDB.blinds || []).find(bl => bl.curtainStyle === styleName) || { minSqm: 1.5, roundMode: 'ceil_1dec' };
    const minSqm = Math.max(1.5, num(blindRule.minSqm) || 1.5);
    const rawSqmPerPiece = (vars.WC / 100) * (vars.HC / 100);
    const sqmPerPiece = (vars.WC > 0 && vars.HC > 0) ? Math.max(minSqm, rawSqmPerPiece) : 0;
    const totalSqm = sqmPerPiece * P;
    const t = totalSqm > 0 ? applyRoundMode(totalSqm, blindRule.roundMode || 'ceil_1dec') : '';
    return {
      a, b, n: (RW || RH) ? String(P) : '', t,
      RW, RH, unit1: 'ผืน', unit2: 'ตร.ม.',
      details: { mode: 'blind_sqm', minSqm, rawSqmPerPiece: Math.round(rawSqmPerPiece * 100) / 100, sqmPerPiece: Math.round(sqmPerPiece * 100) / 100 },
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
  vars.HEM_SIDE = num(fRule && fRule.sideHem);
  vars.HEM_TB = num(fRule && fRule.topBottomHem);

  const panelsStr = (fRule && fRule.panelCountExp)
    ? evalFormulaExpr(fRule.panelCountExp, vars, 'ceil_int')
    : String(Math.ceil(((vars.WC * vars.G) + vars.HEM_SIDE) / Math.max(1, vars.FW_FAB)) * P);
  vars.PANELS = num(panelsStr) || P;

  const yrCntStr = (fRule && fRule.yRepeatCountExp)
    ? evalFormulaExpr(fRule.yRepeatCountExp, vars, 'ceil_int')
    : (vars.YR > 0 ? String(Math.ceil((vars.HC + vars.HEM_TB) / vars.YR)) : '0');
  vars.YR_CNT = num(yrCntStr);

  let t = '';
  if ((vars.WC > 0 || vars.HC > 0) && fRule && fRule.qtyExp) {
    t = evalFormulaExpr(fRule.qtyExp, vars, fRule.roundMode || 'ceil_1dec');
  }

  return {
    a, b, n: (RW || RH) ? String(P) : '', t,
    RW, RH, unit1: 'ผืน', unit2: 'หลา',
    details: {
      mode: grainType,
      fabricWidth: vars.FW_FAB,
      panelCount: vars.PANELS,
      yRepeat: vars.YR,
      yRepeatCount: vars.YR_CNT,
      sideHem: vars.HEM_SIDE,
      topBottomHem: vars.HEM_TB,
      gatherRatio: vars.G,
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

/* ---------------- Modal UI for Master DB (Admin Only) ---------------- */
const MasterDBModal = (() => {
  let activeTab = 'staff';
  let onUpdate = null;

  const escH = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function curtainSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด (*)'], ...(masterDB.curtains || []).map(c => [c.name, c.name])];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function rodSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด (*)'], ...ROD_TYPES_LIST.map(r => [r, r])];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function hookSelectOpts(selected) {
    const opts = [['*', 'ทั้งหมด / ไม่ใช้ (*)'], ...(masterDB.hooks || []).map(h => [h.name, h.name])];
    return opts.map(([v, t]) => `<option value="${escH(v)}" ${(selected || '*') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
  }

  function roundModeSelectOpts(selected) {
    return ROUND_MODES.map(([v, t]) => `<option value="${escH(v)}" ${(selected || 'ceil_1dec') === v ? 'selected' : ''}>${escH(t)}</option>`).join('');
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
          <b>🧵 ฐานข้อมูลผ้า (สำหรับนำมาคำนวณปริมาณผ้า):</b><br>
          กำหนด ชื่อผ้า, ดีไซน์ผ้า, ขนาดหน้าผ้า (ซม.), Y-Repeat (ซม.) และรูปแบบการคำนวณ<br>
          <span style="color:#b42318;font-weight:700">* เงื่อนไขสำคัญ: เฉพาะผ้าที่มีขนาดหน้าผ้าเกิน 270 ซม. ขึ้นไป (&gt; 270 ซม.) เท่านั้น ถึงสามารถเลือกใช้คำนวณได้ทั้งเกรนม่านทึบและเกรนม่านโปร่ง</span>
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th>ชื่อผ้า (CS DES.)</th>
              <th style="width:130px">ดีไซน์ผ้า (DES.NO.)</th>
              <th style="width:115px">ขนาดหน้าผ้า (ซม.)</th>
              <th style="width:105px">Y-Repeat (ซม.)</th>
              <th style="width:270px">รูปแบบการคำนวณเกรนผ้า</th>
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
      body.innerHTML = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>📐 ฐานข้อมูลขนาดความกว้างผ้าม่าน (กำหนดได้หลายค่าตามรูปแบบผ้าม่าน):</b><br>
          ประกอบด้วย: <b>ขนาดรางม่าน (<code>RW</code>)</b>, <b>จำนวนผืน (<code>P</code>)</b>, <b>ระยะย่นผ้าม่านแต่ละแบบ (<code>G</code>)</b>,
          <b>ระยะเผื่อเกย (<code>OV</code>)</b>, <b>ระยะเผื่ออ้อมข้าง (<code>SR</code>)</b>, สูตรคำนวณ และการปัดเศษ<br>
          ฟังก์ชันในสูตร: <code>FLOOR(x)</code> = ปัดเศษลงจำนวนเต็ม, <code>CEIL(x)</code> = ปัดเศษขึ้นจำนวนเต็ม, <code>CEIL1(x)</code> = ปัดเศษขึ้นทศนิยม 1 ตำแหน่ง
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th style="width:115px">รูปแบบผ้าม่าน</th>
              <th>ชื่อเงื่อนไข</th>
              <th style="width:72px">ขนาดราง</th>
              <th style="width:65px">จำนวนผืน (P)</th>
              <th style="width:75px">ระยะย่น (G)</th>
              <th style="width:75px">เผื่อเกย (OV)</th>
              <th style="width:82px">เผื่ออ้อมข้าง (SR)</th>
              <th style="width:140px">สูตรความกว้างผ้า</th>
              <th style="width:170px">การปัดเศษ</th>
              <th style="width:42px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${(masterDB.widthFormulas || []).map((wf, i) => `
              <tr>
                <td><select data-db-edit="widthFormulas.${i}.curtainStyle">${curtainSelectOpts(wf.curtainStyle)}</select></td>
                <td><input data-db-edit="widthFormulas.${i}.label" value="${escH(wf.label || '')}" placeholder="ชื่อเงื่อนไข"></td>
                <td><input data-db-edit="widthFormulas.${i}.railWidth" value="${escH(wf.railWidth || 'RW')}" placeholder="RW"></td>
                <td><input type="number" step="1" min="1" data-db-edit="widthFormulas.${i}.pieces" value="${escH(wf.pieces ?? 2)}"></td>
                <td><input type="number" step="any" data-db-edit="widthFormulas.${i}.gatherRatio" value="${escH(wf.gatherRatio ?? 2.5)}"></td>
                <td><input type="number" step="any" data-db-edit="widthFormulas.${i}.overlap" value="${escH(wf.overlap ?? 0)}"></td>
                <td><input type="number" step="any" data-db-edit="widthFormulas.${i}.sideReturn" value="${escH(wf.sideReturn ?? 0)}"></td>
                <td><input data-db-edit="widthFormulas.${i}.widthExp" value="${escH(wf.widthExp || '((RW + OV + SR) / P)')}"></td>
                <td><select data-db-edit="widthFormulas.${i}.roundMode">${roundModeSelectOpts(wf.roundMode || 'ceil_int')}</select></td>
                <td class="c"><button type="button" class="danger" data-db-del="widthFormulas.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="widthFormulas">➕ เพิ่มค่าขนาดความกว้างผ้าม่าน</button>
      `;
    } else if (activeTab === 'heightFormulas') {
      body.innerHTML = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>📏 ฐานข้อมูลการคำนวณขนาดความสูงผ้าม่าน ตามรูปแบบผ้าม่าน + ประเภทรางม่าน + ขนาดตะขอ (กำหนดได้หลายค่า):</b><br>
          ตัวแปร: <code>RH</code> = ความสูงราง (H+ET+EB), <code>H</code> = สูงเฟรม, <code>ET</code> = เผื่อบน, <code>EB</code> = เผื่อล่าง • ฟังก์ชัน: <code>FLOOR()</code>, <code>CEIL()</code>, <code>CEIL1()</code>
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th style="width:120px">รูปแบบผ้าม่าน</th>
              <th style="width:120px">ประเภทรางม่าน</th>
              <th style="width:110px">ขนาดตะขอ</th>
              <th>ชื่อเงื่อนไขความสูง</th>
              <th style="width:115px">สูตรความสูงผ้า</th>
              <th style="width:185px">การปัดเศษ</th>
              <th style="width:42px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${(masterDB.heightFormulas || []).map((hf, i) => `
              <tr>
                <td><select data-db-edit="heightFormulas.${i}.curtainStyle">${curtainSelectOpts(hf.curtainStyle)}</select></td>
                <td><select data-db-edit="heightFormulas.${i}.rodType">${rodSelectOpts(hf.rodType)}</select></td>
                <td><select data-db-edit="heightFormulas.${i}.hookSize">${hookSelectOpts(hf.hookSize)}</select></td>
                <td><input data-db-edit="heightFormulas.${i}.label" value="${escH(hf.label || '')}"></td>
                <td><input data-db-edit="heightFormulas.${i}.heightExp" value="${escH(hf.heightExp || 'RH')}"></td>
                <td><select data-db-edit="heightFormulas.${i}.roundMode">${roundModeSelectOpts(hf.roundMode || 'none')}</select></td>
                <td class="c"><button type="button" class="danger" data-db-del="heightFormulas.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="heightFormulas">➕ เพิ่มค่าการคำนวณความสูงผ้าม่าน</button>
      `;
    } else if (activeTab === 'fabricCalcRules') {
      body.innerHTML = `
        <div class="subcard" style="margin-bottom:8px;font-size:12px">
          <b>🧮 ฐานข้อมูลคำนวณปริมาณผ้า (แยกแบบเกรนม่านทึบ และ เกรนม่านโปร่ง):</b><br>
          ประกอบด้วย: ขนาดความกว้างผ้าม่าน (<code>WC</code>), จำนวนหน้าผ้า (<code>PANELS</code>), ขนาดหน้าผ้า (<code>FW_FAB</code>),
          Y-Repeat (<code>YR</code>), จำนวน Y-Repeat (<code>YR_CNT</code>), ระยะเผื่อพับริมผ้า (<code>HEM_SIDE</code>),
          ระยะย่นผ้าม่านแต่ละแบบ (<code>G</code>), ระยะพับขอบบนล่างผ้าม่านแต่ละแบบ (<code>HEM_TB</code>), จำนวนผืน (<code>P</code>)<br>
          ฟังก์ชันปัดเศษ: <code>FLOOR(x)</code> (ปัดลงจำนวนเต็ม), <code>CEIL(x)</code> (ปัดขึ้นจำนวนเต็ม), <code>CEIL1(x)</code> (ปัดขึ้นทศนิยม 1 ตำแหน่ง)
        </div>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th style="width:100px">รูปแบบม่าน</th>
              <th style="width:115px">เกรนคำนวณ</th>
              <th>ชื่อสูตร</th>
              <th style="width:62px">หน้าผ้า (FW_FAB)</th>
              <th style="width:58px">Y-Repeat (YR)</th>
              <th style="width:55px">ระยะย่น (G)</th>
              <th style="width:60px">พับริม (HEM_SIDE)</th>
              <th style="width:65px">พับบนล่าง (HEM_TB)</th>
              <th style="width:52px">ผืน (P)</th>
              <th style="width:130px">สูตรจำนวนหน้าผ้า (PANELS)</th>
              <th style="width:120px">สูตรจำนวน Y-Repeat (YR_CNT)</th>
              <th style="width:150px">สูตรปริมาณผ้า (หลา)</th>
              <th style="width:155px">การปัดเศษ</th>
              <th style="width:38px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${(masterDB.fabricCalcRules || []).map((r, i) => `
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
                <td><input type="number" step="any" data-db-edit="fabricCalcRules.${i}.sideHem" value="${escH(r.sideHem ?? 15)}"></td>
                <td><input type="number" step="any" data-db-edit="fabricCalcRules.${i}.topBottomHem" value="${escH(r.topBottomHem ?? 35)}"></td>
                <td><input type="number" step="1" data-db-edit="fabricCalcRules.${i}.pieces" value="${escH(r.pieces ?? 2)}"></td>
                <td><input data-db-edit="fabricCalcRules.${i}.panelCountExp" value="${escH(r.panelCountExp || '')}"></td>
                <td><input data-db-edit="fabricCalcRules.${i}.yRepeatCountExp" value="${escH(r.yRepeatCountExp || '')}"></td>
                <td><input data-db-edit="fabricCalcRules.${i}.qtyExp" value="${escH(r.qtyExp || '')}"></td>
                <td><select data-db-edit="fabricCalcRules.${i}.roundMode">${roundModeSelectOpts(r.roundMode || 'ceil_1dec')}</select></td>
                <td class="c"><button type="button" class="danger" data-db-del="fabricCalcRules.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="fabricCalcRules">➕ เพิ่มสูตรคำนวณปริมาณผ้า</button>
      `;
    } else if (activeTab === 'rails') {
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">กำหนดฐานข้อมูลรางม่านและอุปกรณ์เสริม พร้อมระบุว่าใช้กับรูปแบบม่านอะไร</p>
        <table class="ed-tbl">
          <thead>
            <tr>
              <th>ชื่อราง / อุปกรณ์</th>
              <th style="width:160px">หมวดหมู่ราง/อุปกรณ์</th>
              <th style="width:160px">ใช้กับรูปแบบม่านอะไร</th>
              <th style="width:130px">สีมาตรฐาน</th>
              <th style="width:50px">ลบ</th>
            </tr>
          </thead>
          <tbody>
            ${(masterDB.rails || []).map((rl, i) => `
              <tr>
                <td><input data-db-edit="rails.${i}.name" value="${escH(rl.name || '')}" placeholder="เช่น รางม่านจีบ มาตรฐาน"></td>
                <td><select data-db-edit="rails.${i}.rodCategory">${rodSelectOpts(rl.rodCategory)}</select></td>
                <td><select data-db-edit="rails.${i}.curtainStyle">${curtainSelectOpts(rl.curtainStyle)}</select></td>
                <td><input data-db-edit="rails.${i}.defaultColor" value="${escH(rl.defaultColor || '')}" placeholder="เช่น ขาว, ดำ"></td>
                <td class="c"><button type="button" class="danger" data-db-del="rails.${i}">✕</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <button type="button" class="primary" style="margin-top:8px" data-db-add="rails">➕ เพิ่มราง / อุปกรณ์</button>
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
      body.innerHTML = `
        <p class="hint" style="margin-bottom:8px">กำหนดรายชื่อรูปแบบผ้าม่าน และติ๊ก "ใช้ตะขอ" สำหรับม่านจีบ/ม่านลอน</p>
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
    }
  }

  function onEditChange(e) {
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
    document.querySelectorAll('[data-dbtab]').forEach(b => {
      b.addEventListener('click', () => { activeTab = b.dataset.dbtab; render(); });
    });
    document.getElementById('dbClose').addEventListener('click', () => {
      modal.hidden = true;
      if (onUpdate) onUpdate();
    });
    modal.addEventListener('input', onEditChange);
    modal.addEventListener('change', onEditChange);
    modal.addEventListener('click', e => {
      const add = e.target.closest('[data-db-add]');
      if (add) {
        const t = add.dataset.dbAdd;
        const id = 'id_' + Date.now();
        if (t === 'staff') {
          masterDB.staff.push({ id, username: '', password: '', role: 'staff', name: '', dept: '', branch: '' });
        } else if (t === 'fabrics') {
          masterDB.fabrics.push({ id, name: '', design: '', fabricWidth: 140, yRepeat: 0, calcMode: 'opaque' });
        } else if (t === 'rails') {
          masterDB.rails.push({ id, name: '', rodCategory: 'รางม่านจีบ', curtainStyle: 'ม่านจีบ', defaultColor: '' });
        } else if (t === 'blinds') {
          masterDB.blinds.push({ id, name: '', curtainStyle: 'ม่านม้วน', minSqm: 1.5, roundMode: 'ceil_1dec' });
        } else if (t === 'curtains') {
          masterDB.curtains.push({ id, name: '', useHook: false });
        } else if (t === 'hooks') {
          masterDB.hooks.push({ id, name: '' });
        } else if (t === 'remarks') {
          masterDB.remarks.push({ id, name: '' });
        } else if (t === 'widthFormulas') {
          masterDB.widthFormulas.push({
            id, curtainStyle: 'ม่านจีบ', label: 'เงื่อนไขความกว้างใหม่',
            railWidth: 'RW', pieces: 2, gatherRatio: 2.5, overlap: 10, sideReturn: 15,
            widthExp: '((RW + OV + SR) / P)', roundMode: 'ceil_int',
          });
        } else if (t === 'heightFormulas') {
          masterDB.heightFormulas.push({
            id, curtainStyle: 'ม่านจีบ', rodType: 'รางม่านจีบ', hookSize: '*',
            label: 'เงื่อนไขความสูงใหม่', heightExp: 'RH - 2', roundMode: 'none',
          });
        } else if (t === 'fabricCalcRules') {
          masterDB.fabricCalcRules.push({
            id, curtainStyle: 'ม่านจีบ', grainType: 'opaque',
            label: 'สูตรคำนวณปริมาณผ้าใหม่', fabricWidth: 140, yRepeat: 0,
            gatherRatio: 2.5, sideHem: 15, topBottomHem: 35, pieces: 2,
            panelCountExp: 'CEIL(((WC * G) + HEM_SIDE) / FW_FAB) * P',
            yRepeatCountExp: 'YR > 0 ? CEIL((HC + HEM_TB) / YR) : 0',
            qtyExp: '(PANELS * (YR > 0 ? (YR_CNT * YR) : (HC + HEM_TB))) / 90',
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
