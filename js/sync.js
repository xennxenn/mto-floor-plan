/* =========================================================
   Realtime Cloud Synchronization (js/sync.js)
   - ซิงค์ข้อมูลทั้งรายการออเดอร์ (orders) และฐานข้อมูลหลัก (masterDB) แบบ Realtime ทุกคนเห็นข้อมูลชุดเดียวกันทันที
   - รองรับ 3 โหมด Cloud Realtime:
     1) Firebase Realtime Database (แนะนำ/เร็วที่สุด: ใช้เพียง Database URL เช่น https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app)
     2) Firebase Cloud Firestore (ใช้ Project ID + API Key ผ่าน onSnapshot Realtime Listener)
     3) Supabase Realtime (ใช้ Supabase URL + Anon Key)
   - รองรับการฝังค่า DEFAULT_CLOUD_CONFIG ลงในโค้ดเพื่อ Deploy ขึ้น GitHub + Vercel ให้ทุกคนเปิดเว็บแล้วเชื่อมต่อฐานข้อมูลเดียวกันทันที
   - รองรับการแชร์ลิงก์ตั้งค่าอัตโนมัติ (?sync=...) และ BroadcastChannel ซิงค์ข้ามแท็บทันที
   ========================================================= */

/**
 * หากต้องการฝังค่า Cloud ถาวรลงในโค้ดสำหรับ Vercel ให้ใส่ค่าใน DEFAULT_CLOUD_CONFIG ด้านล่างนี้
 * เมื่อ Deploy ขึ้น Vercel ทุกคนที่เปิดลิงก์จะซิงค์ข้อมูลชุดเดียวกันโดยอัตโนมัติทันที
 */
const DEFAULT_CLOUD_CONFIG = {
  provider: '',       // 'firebase_rtdb' | 'firestore' | 'supabase'
  databaseURL: '',    // สำหรับ Firebase Realtime Database เช่น 'https://mto-plan-default-rtdb.asia-southeast1.firebasedatabase.app'
  projectId: '',      // สำหรับ Firebase Cloud Firestore
  apiKey: '',         // สำหรับ Firebase Cloud Firestore
  supabaseUrl: '',    // สำหรับ Supabase เช่น 'https://xxxx.supabase.co'
  supabaseKey: '',    // สำหรับ Supabase Anon Key
  roomKey: 'pasaya_mto_main', // ชื่อห้องข้อมูลส่วนกลางของทีม
};

const SYNC_CFG_KEY = 'mto-cloud-sync-cfg-v1';
const CLIENT_ID = 'cli_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

const RealtimeSync = (() => {
  let cfg = loadConfig();
  let status = 'local'; // 'local' | 'connecting' | 'online' | 'saving' | 'error'
  let statusMsg = 'โหมดออฟไลน์ (บันทึกในเครื่อง)';
  let isApplyingRemote = false;
  let lastRev = '';
  let pushTimer = null;
  let pollTimer = null;
  let sseSource = null;
  let firestoreUnsub = null;
  let supabaseChannel = null;
  let supabaseClient = null;
  let bc = null;

  function loadConfig() {
    // 1) ตรวจสอบจาก URL parameter (?sync=base64) เพื่อตั้งค่าอัตโนมัติเมื่อแชร์ลิงก์ให้ทีม
    try {
      const url = new URL(location.href);
      const syncParam = url.searchParams.get('sync');
      if (syncParam) {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(syncParam))));
        if (decoded && decoded.provider) {
          localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(decoded));
          url.searchParams.delete('sync');
          history.replaceState(null, '', url.toString());
        }
      }
    } catch (e) { console.warn('Invalid sync URL param', e); }

    // 2) โหลดจาก localStorage หรือใช้ค่า DEFAULT_CLOUD_CONFIG ที่ฝังไว้ในโค้ด
    try {
      const saved = JSON.parse(localStorage.getItem(SYNC_CFG_KEY));
      if (saved && saved.provider) return Object.assign({}, DEFAULT_CLOUD_CONFIG, saved);
    } catch (e) { /* ignore */ }
    return Object.assign({}, DEFAULT_CLOUD_CONFIG);
  }

  function saveConfig(newCfg) {
    cfg = Object.assign({}, DEFAULT_CLOUD_CONFIG, newCfg);
    try { localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(cfg)); } catch (e) { console.warn(e); }
  }

  function setStatus(st, msg) {
    status = st;
    statusMsg = msg || '';
    const btn = document.getElementById('btnCloudSync');
    const dot = document.getElementById('syncStatusDot');
    const txt = document.getElementById('syncStatusText');
    if (dot) {
      dot.className = 'sync-dot sync-' + st;
    }
    if (txt) {
      txt.textContent = msg;
    }
    if (btn) {
      btn.title = `สถานะ Cloud Realtime: ${msg} (คลิกเพื่อตั้งค่า/แชร์ลิงก์ทีม)`;
    }
  }

  function buildPayload() {
    const rev = Date.now() + '_' + CLIENT_ID;
    lastRev = rev;
    return {
      rev,
      clientId: CLIENT_ID,
      updatedAt: new Date().toISOString(),
      orders: typeof orders !== 'undefined' ? orders : [],
      masterDB: typeof masterDB !== 'undefined' ? masterDB : {},
    };
  }

  /**
   * นำข้อมูลที่ได้รับจาก Cloud / เครื่องอื่น มาอัปเดตหน้าจอแบบ Realtime
   * โดยรักษาตำแหน่งหน้าและช่องที่กำลังพิมพ์อยู่ไม่ให้กระตุก
   */
  function applyRemotePayload(data) {
    if (!data || typeof data !== 'object') return;
    if (data.rev && data.rev === lastRev) return;
    if (data.clientId && data.clientId === CLIENT_ID) return;

    lastRev = data.rev || String(Date.now());
    isApplyingRemote = true;
    try {
      if (Array.isArray(data.orders) && data.orders.length) {
        orders = data.orders.map((o, i) => normalizeOrder(o, i + 1));
        try { localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders)); } catch (e) {}
      }
      if (data.masterDB && typeof data.masterDB === 'object') {
        const def = defaultMasterDB();
        masterDB = {
          staff: Array.isArray(data.masterDB.staff) ? data.masterDB.staff : def.staff,
          curtains: Array.isArray(data.masterDB.curtains) && data.masterDB.curtains.length ? data.masterDB.curtains : def.curtains,
          hooks: Array.isArray(data.masterDB.hooks) && data.masterDB.hooks.length ? data.masterDB.hooks : def.hooks,
          remarks: Array.isArray(data.masterDB.remarks) && data.masterDB.remarks.length ? data.masterDB.remarks : def.remarks,
          formulas: Array.isArray(data.masterDB.formulas) && data.masterDB.formulas.length ? data.masterDB.formulas : def.formulas,
        };
        try { localStorage.setItem(DB_KEY, JSON.stringify(masterDB)); } catch (e) {}
        refreshRemarksDatalist();
      }

      // อัปเดต UI ตามหน้าปัจจุบัน
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

      if (!activeOrderId) {
        renderDashboard();
      } else {
        const stillExists = orders.find(o => o.id === activeOrderId);
        if (!stillExists) {
          showDashboard();
        } else if (!isTyping) {
          renderAllWorkspace();
        } else {
          // ถ้าผู้ใช้กำลังพิมพ์อยู่ ให้อัปเดตเฉพาะพรีวิวA4 และแถบสถานะด้านบน เพื่อไม่ให้เคอร์เซอร์หลุด
          updateTopBadge();
          renderTopSheetNav();
          renderPreview();
        }
      }
    } finally {
      isApplyingRemote = false;
    }
  }

  /* =========================================================
     Provider 1: Firebase Realtime Database (REST + SSE Stream)
     ไม่ต้องลงไลบรารีเพิ่ม รองรับ Realtime Stream ทันทีผ่าน EventSource
     ========================================================= */
  function cleanRtdbUrl(url) {
    let u = String(url || '').trim().replace(/\/+$/, '');
    if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }

  function rtdbEndpoint() {
    const base = cleanRtdbUrl(cfg.databaseURL);
    const room = encodeURIComponent((cfg.roomKey || 'pasaya_mto_main').replace(/[.#$[\]/]/g, '_'));
    return `${base}/mto_workspaces/${room}.json`;
  }

  async function connectFirebaseRTDB() {
    const endpoint = rtdbEndpoint();
    if (!cfg.databaseURL) {
      setStatus('local', 'โหมดในเครื่อง (คลิกเพื่อตั้งค่า Cloud Sync)');
      return;
    }
    setStatus('connecting', 'กำลังเชื่อมต่อ Firebase Realtime...');
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const initialData = await res.json();
      if (initialData && initialData.orders) {
        applyRemotePayload(initialData);
      } else {
        // ถ้าฐานข้อมูลบน Cloud ยังว่างอยู่ ให้ส่งข้อมูลชุดเริ่มต้นขึ้นไปทันที
        await pushToCloudNow();
      }
      setStatus('online', 'ซิงค์ Realtime ออนไลน์');
    } catch (err) {
      console.warn('RTDB initial fetch error:', err);
      setStatus('error', 'เชื่อมต่อไม่ได้ (ตรวจสอบ URL / Rules)');
      return;
    }

    // เปิดการเชื่อมต่อ EventSource (Server-Sent Events) ของ Firebase RTDB เพื่อรับข้อมูลทันทีที่มีคนแก้ไข
    try {
      if (sseSource) sseSource.close();
      sseSource = new EventSource(endpoint);
      sseSource.addEventListener('put', e => {
        try {
          const msg = JSON.parse(e.data);
          if (!msg || msg.data == null) return;
          if (msg.path === '/') {
            applyRemotePayload(msg.data);
          } else {
            // กรณีมีการอัปเดตย่อย ให้ดึง snapshot ล่าสุด
            fetch(endpoint, { cache: 'no-store' })
              .then(r => r.ok ? r.json() : null)
              .then(d => { if (d) applyRemotePayload(d); })
              .catch(() => {});
          }
          setStatus('online', 'ซิงค์ Realtime ออนไลน์');
        } catch (err) { console.warn(err); }
      });
      sseSource.onerror = () => {
        // Fallback polling ทุก 3 วินาทีหากเบราว์เซอร์บล็อก SSE
        startFallbackPolling(async () => {
          const r = await fetch(endpoint, { cache: 'no-store' });
          if (r.ok) {
            const d = await r.json();
            if (d) applyRemotePayload(d);
            setStatus('online', 'ซิงค์ Realtime ออนไลน์');
          }
        });
      };
    } catch (e) {
      console.warn('SSE fallback to polling', e);
    }
  }

  async function pushFirebaseRTDB(payload) {
    const endpoint = rtdbEndpoint();
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`RTDB PUT HTTP ${res.status}`);
  }

  /* =========================================================
     Provider 2: Firebase Cloud Firestore (onSnapshot Realtime)
     ========================================================= */
  let firestoreDb = null;
  let firestoreFns = null;

  async function connectFirestore() {
    if (!cfg.projectId || !cfg.apiKey) {
      setStatus('local', 'โหมดในเครื่อง (คลิกเพื่อตั้งค่า Cloud Sync)');
      return;
    }
    setStatus('connecting', 'กำลังเชื่อมต่อ Cloud Firestore...');
    try {
      const appMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
      const fsMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
      const appName = 'mto_fs_' + cfg.projectId;
      let fbApp;
      const existing = appMod.getApps().find(a => a.name === appName);
      if (existing) fbApp = existing;
      else fbApp = appMod.initializeApp({ apiKey: cfg.apiKey, projectId: cfg.projectId }, appName);

      firestoreDb = fsMod.getFirestore(fbApp);
      firestoreFns = fsMod;
      const room = (cfg.roomKey || 'pasaya_mto_main').replace(/\//g, '_');
      const docRef = fsMod.doc(firestoreDb, 'mto_workspaces', room);

      const snap = await fsMod.getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        if (d && d.payloadJson) applyRemotePayload(JSON.parse(d.payloadJson));
      } else {
        await pushToCloudNow();
      }

      if (firestoreUnsub) firestoreUnsub();
      firestoreUnsub = fsMod.onSnapshot(docRef, docSnap => {
        if (!docSnap.exists()) return;
        const d = docSnap.data();
        if (d && d.payloadJson) {
          try {
            applyRemotePayload(JSON.parse(d.payloadJson));
            setStatus('online', 'ซิงค์ Firestore ออนไลน์');
          } catch (err) { console.warn(err); }
        }
      }, err => {
        console.warn('Firestore snapshot error:', err);
        setStatus('error', 'Firestore เชื่อมต่อขัดข้อง');
      });

      setStatus('online', 'ซิงค์ Firestore ออนไลน์');
    } catch (err) {
      console.warn('Firestore init error:', err);
      setStatus('error', 'เชื่อมต่อ Firestore ไม่สำเร็จ');
    }
  }

  async function pushFirestore(payload) {
    if (!firestoreDb || !firestoreFns) return;
    const room = (cfg.roomKey || 'pasaya_mto_main').replace(/\//g, '_');
    const docRef = firestoreFns.doc(firestoreDb, 'mto_workspaces', room);
    await firestoreFns.setDoc(docRef, {
      rev: payload.rev,
      clientId: payload.clientId,
      updatedAt: payload.updatedAt,
      payloadJson: JSON.stringify(payload),
    });
  }

  /* =========================================================
     Provider 3: Supabase Realtime (Broadcast + Table / Storage)
     ========================================================= */
  async function connectSupabase() {
    if (!cfg.supabaseUrl || !cfg.supabaseKey) {
      setStatus('local', 'โหมดในเครื่อง (คลิกเพื่อตั้งค่า Cloud Sync)');
      return;
    }
    setStatus('connecting', 'กำลังเชื่อมต่อ Supabase Realtime...');
    try {
      const sbMod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      supabaseClient = sbMod.createClient(cfg.supabaseUrl.trim(), cfg.supabaseKey.trim());
      const room = (cfg.roomKey || 'pasaya_mto_main').replace(/[^a-zA-Z0-9_-]/g, '_');

      // ลองดึงข้อมูลล่าสุดจากตาราง mto_workspaces (ถ้าสร้างตารางไว้แล้ว)
      try {
        const { data, error } = await supabaseClient
          .from('mto_workspaces')
          .select('payload')
          .eq('room_key', room)
          .maybeSingle();
        if (!error && data && data.payload) {
          applyRemotePayload(typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload);
        } else if (!error && !data) {
          await pushToCloudNow();
        }
      } catch (e) { /* table optional if using broadcast */ }

      if (supabaseChannel) supabaseClient.removeChannel(supabaseChannel);
      supabaseChannel = supabaseClient.channel('mto_room_' + room, {
        config: { broadcast: { self: false } },
      });

      supabaseChannel
        .on('broadcast', { event: 'mto_sync' }, ({ payload }) => {
          if (payload) {
            applyRemotePayload(payload);
            setStatus('online', 'ซิงค์ Supabase ออนไลน์');
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mto_workspaces', filter: `room_key=eq.${room}` }, chg => {
          if (chg.new && chg.new.payload) {
            applyRemotePayload(typeof chg.new.payload === 'string' ? JSON.parse(chg.new.payload) : chg.new.payload);
          }
        })
        .subscribe(st => {
          if (st === 'SUBSCRIBED') {
            setStatus('online', 'ซิงค์ Supabase ออนไลน์');
          }
        });
    } catch (err) {
      console.warn('Supabase init error:', err);
      setStatus('error', 'เชื่อมต่อ Supabase ไม่สำเร็จ');
    }
  }

  async function pushSupabase(payload) {
    if (!supabaseClient) return;
    const room = (cfg.roomKey || 'pasaya_mto_main').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (supabaseChannel) {
      supabaseChannel.send({ type: 'broadcast', event: 'mto_sync', payload }).catch(() => {});
    }
    try {
      await supabaseClient.from('mto_workspaces').upsert({
        room_key: room,
        updated_at: payload.updatedAt,
        payload,
      }, { onConflict: 'room_key' });
    } catch (e) { /* ignore if table not created yet */ }
  }

  /* =========================================================
     Core Lifecycle: Connect, Schedule Push, BroadcastChannel
     ========================================================= */
  function cleanupConnections() {
    if (sseSource) { sseSource.close(); sseSource = null; }
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (firestoreUnsub) { firestoreUnsub(); firestoreUnsub = null; }
    if (supabaseChannel && supabaseClient) {
      supabaseClient.removeChannel(supabaseChannel);
      supabaseChannel = null;
    }
  }

  function startFallbackPolling(fn) {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => { fn().catch(() => {}); }, 3000);
  }

  async function connect() {
    cleanupConnections();
    if (!cfg || !cfg.provider) {
      setStatus('local', 'โหมดในเครื่อง (ตั้งค่า Cloud Sync)');
      return;
    }
    if (cfg.provider === 'firebase_rtdb') await connectFirebaseRTDB();
    else if (cfg.provider === 'firestore') await connectFirestore();
    else if (cfg.provider === 'supabase') await connectSupabase();
    else setStatus('local', 'โหมดในเครื่อง (ตั้งค่า Cloud Sync)');
  }

  async function pushToCloudNow() {
    if (isApplyingRemote) return;
    const payload = buildPayload();

    // 1) ซิงค์ข้ามแท็บในเครื่องเดียวกันทันที
    if (bc) {
      try { bc.postMessage(payload); } catch (e) {}
    }

    // 2) ซิงค์ขึ้น Cloud ตาม Provider ที่ตั้งค่าไว้
    if (!cfg || !cfg.provider) return;
    try {
      setStatus('saving', 'กำลังซิงค์ข้อมูล...');
      if (cfg.provider === 'firebase_rtdb') await pushFirebaseRTDB(payload);
      else if (cfg.provider === 'firestore') await pushFirestore(payload);
      else if (cfg.provider === 'supabase') await pushSupabase(payload);
      setStatus('online', 'ซิงค์ข้อมูลล่าสุดแล้ว');
    } catch (err) {
      console.warn('Cloud push error:', err);
      setStatus('error', 'บันทึกขึ้น Cloud ไม่สำเร็จ');
    }
  }

  function schedulePush() {
    if (isApplyingRemote) return;
    if (bc) {
      try { bc.postMessage(buildPayload()); } catch (e) {}
    }
    if (!cfg || !cfg.provider) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushToCloudNow(); }, 350);
  }

  /* =========================================================
     Cloud Sync Configuration Modal UI
     ========================================================= */
  function openModal() {
    const modal = document.getElementById('syncModal');
    if (!modal) return;
    document.getElementById('syncProvider').value = cfg.provider || 'firebase_rtdb';
    document.getElementById('syncRoomKey').value = cfg.roomKey || 'pasaya_mto_main';
    document.getElementById('syncRtdbUrl').value = cfg.databaseURL || '';
    document.getElementById('syncFsProjectId').value = cfg.projectId || '';
    document.getElementById('syncFsApiKey').value = cfg.apiKey || '';
    document.getElementById('syncSbUrl').value = cfg.supabaseUrl || '';
    document.getElementById('syncSbKey').value = cfg.supabaseKey || '';
    toggleProviderFields();
    modal.hidden = false;
  }

  function toggleProviderFields() {
    const p = document.getElementById('syncProvider').value;
    document.getElementById('syncBoxRtdb').hidden = (p !== 'firebase_rtdb');
    document.getElementById('syncBoxFirestore').hidden = (p !== 'firestore');
    document.getElementById('syncBoxSupabase').hidden = (p !== 'supabase');
  }

  function readModalConfig() {
    return {
      provider: document.getElementById('syncProvider').value,
      roomKey: (document.getElementById('syncRoomKey').value || 'pasaya_mto_main').trim(),
      databaseURL: (document.getElementById('syncRtdbUrl').value || '').trim(),
      projectId: (document.getElementById('syncFsProjectId').value || '').trim(),
      apiKey: (document.getElementById('syncFsApiKey').value || '').trim(),
      supabaseUrl: (document.getElementById('syncSbUrl').value || '').trim(),
      supabaseKey: (document.getElementById('syncSbKey').value || '').trim(),
    };
  }

  function generateShareLink() {
    const newCfg = readModalConfig();
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(newCfg))));
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set('sync', b64);
    return url.toString();
  }

  function init() {
    // ตั้งค่า BroadcastChannel สำหรับซิงค์ข้ามแท็บทันที
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('mto_realtime_channel_v1');
      bc.onmessage = e => {
        if (e && e.data) applyRemotePayload(e.data);
      };
    }

    const btn = document.getElementById('btnCloudSync');
    if (btn) btn.addEventListener('click', openModal);

    const provSel = document.getElementById('syncProvider');
    if (provSel) provSel.addEventListener('change', toggleProviderFields);

    const btnClose = document.getElementById('syncClose');
    if (btnClose) btnClose.addEventListener('click', () => {
      document.getElementById('syncModal').hidden = true;
    });

    const btnSave = document.getElementById('syncSaveBtn');
    if (btnSave) btnSave.addEventListener('click', async () => {
      saveConfig(readModalConfig());
      document.getElementById('syncModal').hidden = true;
      await connect();
    });

    const btnDisconnect = document.getElementById('syncDisconnectBtn');
    if (btnDisconnect) btnDisconnect.addEventListener('click', () => {
      saveConfig({ provider: '' });
      cleanupConnections();
      setStatus('local', 'โหมดในเครื่อง (ตั้งค่า Cloud Sync)');
      document.getElementById('syncModal').hidden = true;
    });

    const btnCopyLink = document.getElementById('syncCopyLinkBtn');
    if (btnCopyLink) btnCopyLink.addEventListener('click', () => {
      saveConfig(readModalConfig());
      const link = generateShareLink();
      navigator.clipboard.writeText(link).then(() => {
        alert('คัดลอกลิงก์สำหรับแชร์ให้ทีมแล้ว!\nเมื่อทีมงานเปิดลิงก์นี้ ระบบจะเชื่อมต่อฐานข้อมูล Realtime เดียวกันโดยอัตโนมัติ:\n\n' + link);
      }).catch(() => {
        prompt('คัดลอกลิงก์ด้านล่างนี้เพื่อส่งให้ทีม:', link);
      });
    });

    connect();
  }

  return {
    init,
    schedulePush,
    pushToCloudNow,
    openModal,
    get status() { return status; },
  };
})();
