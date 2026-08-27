// ============================================================
// Firebase 설정 — 두더지 잡기 글로벌 기록 백엔드
//
// 냥냥 메모리즈(easygo-catmemories)와 같은 Firebase 프로젝트를 쓰고,
// 컬렉션만 leaderboard_mole 로 분리한다.
//
// apiKey 는 공개용 클라이언트 키라 커밋해도 안전하다. 실제 보호는
// Firestore 보안 규칙에서 한다. 규칙 설정 방법은 ../README.md 참고.
//
// 키가 비어 있거나 규칙이 아직 없으면 게임은 그대로 동작하고
// 글로벌 기록만 비활성화된다.
// ============================================================

window.MOLE_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCHPBCNY-ytIvckay0iJL2aRpLmkXni1TE",
  authDomain:        "easygo-c0713.firebaseapp.com",
  projectId:         "easygo-c0713",
  storageBucket:     "easygo-c0713.firebasestorage.app",
  messagingSenderId: "600256873322",
  appId:             "1:600256873322:web:00b19f05aefc7ab598db13"
};

window.MOLE_FIREBASE_READY = !Object.values(window.MOLE_FIREBASE_CONFIG).some(
  (v) => !v || v === "REPLACE_ME"
);
