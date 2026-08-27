// ============================================================
// Cloud Module — 두더지 잡기 Firestore 글로벌 기록
//
// 냥냥 메모리즈의 cloud.js 구조를 그대로 따르고, 컬렉션만
// leaderboard_mole 하나를 쓴다.
//
// 정렬은 score 내림차순 단일 기준. 복합 색인이 필요 없어서
// Firestore 콘솔에서 색인을 따로 만들지 않아도 동작한다.
// (동점은 순서가 보장되지 않는다.)
// ============================================================

const MoleCloud = (function () {
  const COLLECTION = 'leaderboard_mole';

  let dbPromise = null;
  let mod = null;

  function isReady() { return !!window.MOLE_FIREBASE_READY; }

  async function ensure() {
    if (!isReady()) throw new Error('FIREBASE_NOT_CONFIGURED');
    if (dbPromise) return dbPromise;

    const appMod = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js');
    const fsMod = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js');
    mod = fsMod;

    // 같은 Firebase 프로젝트를 다른 게임과 공유하므로 앱 이름을 분리한다.
    const app = appMod.initializeApp(window.MOLE_FIREBASE_CONFIG, 'mole');
    const db = fsMod.getFirestore(app);
    dbPromise = Promise.resolve(db);
    return dbPromise;
  }

  // ====== 디바이스 ID — "내 기록" 표시용 ======
  const DEVICE_KEY = 'mole_deviceId';
  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      try { localStorage.setItem(DEVICE_KEY, id); } catch {}
    }
    return id;
  }

  // ====== 클라이언트 IP ======
  // 외부 API에서 공인 IP를 1회 페치해 세션 캐시. 실패하면 빈 문자열.
  // 클라이언트가 보내는 값이라 위변조가 가능하므로 신뢰 신호로 쓰지 말고
  // 닉네임 옆 부분 표시용 메타데이터로만 쓴다.
  let cachedIp = null;
  async function getClientIp() {
    if (cachedIp !== null) return cachedIp;
    try {
      const res = await fetch('https://api.ipify.org?format=json', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) { cachedIp = ''; return ''; }
      const data = await res.json();
      cachedIp = String(data.ip || '').slice(0, 45);
      return cachedIp;
    } catch {
      cachedIp = '';
      return '';
    }
  }

  // 브라우저 언어에서 지역 코드 추출. "ko-KR" → "KR", "ko" → "".
  function getCountryCode() {
    try {
      const lang = (navigator && navigator.language) || '';
      const parts = lang.split('-');
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (/^[a-zA-Z]{2}$/.test(p)) return p.toUpperCase();
      }
      return '';
    } catch { return ''; }
  }

  // ====== 기록 등록 ======
  // entry: { name, score, hits, perfects, hammer }
  async function addEntry(entry) {
    if (!isReady()) return { ok: false, reason: 'not_configured' };

    const score = Number(entry.score) || 0;
    if (score <= 0) return { ok: false, reason: 'zero_score' };

    try {
      const db = await ensure();
      const ip = await getClientIp();

      const doc = {
        name: String(entry.name || '익명').slice(0, 12),
        score: score,
        hits: Number(entry.hits) || 0,
        perfects: Number(entry.perfects) || 0,
        hammer: String(entry.hammer || '').slice(0, 30),
        deviceId: getDeviceId(),
        country: getCountryCode(),
        ip: ip,
        createdAt: mod.serverTimestamp()
      };
      const ref = await mod.addDoc(mod.collection(db, COLLECTION), doc);
      return { ok: true, id: ref.id };
    } catch (e) {
      console.warn('[MoleCloud] addEntry 실패', e);
      // 규칙이 아직 없으면 permission-denied 로 떨어진다.
      const denied = e && (e.code === 'permission-denied' || /permission/i.test(String(e)));
      return { ok: false, reason: denied ? 'permission_denied' : 'error', error: e };
    }
  }

  function mapDoc(d, me) {
    const x = d.data() || {};
    return {
      id: d.id,
      name: x.name || '익명',
      score: x.score || 0,
      hits: x.hits || 0,
      perfects: x.perfects || 0,
      hammer: x.hammer || '',
      country: x.country || '',
      ip: x.ip || '',
      deviceId: x.deviceId,
      isMe: x.deviceId === me
    };
  }

  function topQuery(db, limitN) {
    return mod.query(
      mod.collection(db, COLLECTION),
      mod.orderBy('score', 'desc'),
      mod.limit(limitN)
    );
  }

  // ====== TOP N 단발 조회 ======
  async function getTop(limitN = 10) {
    if (!isReady()) return { ok: false, reason: 'not_configured', list: [] };
    try {
      const db = await ensure();
      const snap = await mod.getDocs(topQuery(db, limitN));
      const me = getDeviceId();
      return { ok: true, list: snap.docs.map(d => mapDoc(d, me)) };
    } catch (e) {
      console.warn('[MoleCloud] getTop 실패', e);
      const denied = e && (e.code === 'permission-denied' || /permission/i.test(String(e)));
      return { ok: false, reason: denied ? 'permission_denied' : 'error', list: [] };
    }
  }

  // ====== TOP N 실시간 구독 ======
  // onUpdate(list) / onError(reason). 반환값은 unsubscribe 함수.
  async function subscribeTop(limitN, onUpdate, onError) {
    if (!isReady()) {
      onError && onError('not_configured');
      return () => {};
    }
    try {
      const db = await ensure();
      const me = getDeviceId();
      return mod.onSnapshot(
        topQuery(db, limitN),
        (snap) => onUpdate(snap.docs.map(d => mapDoc(d, me))),
        (err) => {
          console.warn('[MoleCloud] subscribeTop 오류', err);
          const denied = err && err.code === 'permission-denied';
          onError && onError(denied ? 'permission_denied' : 'error');
        }
      );
    } catch (e) {
      console.warn('[MoleCloud] subscribeTop 실패', e);
      onError && onError('error');
      return () => {};
    }
  }

  // ====== 내 점수의 순위 추정 ======
  // 최근 상위 200건 표본에서 내 점수보다 높은 기록 수로 계산.
  async function getRankEstimate(score) {
    if (!isReady()) return null;
    try {
      const db = await ensure();
      const snap = await mod.getDocs(topQuery(db, 200));
      const scores = snap.docs.map(d => (d.data() || {}).score || 0);
      if (!scores.length) return null;
      const higher = scores.filter(s => s > score).length;
      return { rank: higher + 1, sampleSize: scores.length };
    } catch (e) {
      console.warn('[MoleCloud] getRankEstimate 실패', e);
      return null;
    }
  }

  return {
    isReady,
    getDeviceId,
    getCountryCode,
    addEntry,
    getTop,
    subscribeTop,
    getRankEstimate
  };
})();
