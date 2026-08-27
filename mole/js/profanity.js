/**
 * Profanity Filter — 어린이 친화 닉네임 검열
 *
 * 회피 패턴 차단:
 *  - 공백/탭 삽입
 *  - 특수문자 끼워넣기 (시*발, 시!발)
 *  - 숫자 치환 (l33t: 1→i, 3→e, 4→a, 5→s, 0→o, 7→t, 8→b, @→a, $→s)
 *  - 자모 분리 (ㅅㅂ, ㅈㄴ, ㅂㅅ 같은 흔한 약어)
 *  - 알파벳 사이 한글, 한글 사이 알파벳/숫자 혼용
 *
 * 두 단계 정규화:
 *  - 1단계 strict: 한글+영문만 남기고 모두 strip → 한국어 금칙어 매칭용
 *  - 2단계 l33t: 숫자/특수문자를 영문으로 매핑한 뒤 strip → 영문 금칙어 매칭용
 *
 * 매칭은 substring(includes). 닉네임 길이가 짧아(≤12자) 실제 비용 무시 가능.
 */
const Profanity = (function () {
  // ===== 한국어 금칙어 (정규화 후 형태 — 자음/모음 한글 음절) =====
  const BANNED_KO = [
    // 강한 욕설 — 시발/씨발 변형
    '시발', '씨발', '시바', '씨바', '시팔', '씨팔', '쉬발', '쒸발', '슈발',
    '시벌', '씨벌', '시버', '씨버', '시바알', '씨바알', '시이발', '씨이발',
    '쒸발', '쉬바', '쒸바', '쒸팔',
    // 좆 변형
    '좆', '좇', '존나', '졸라', '존맛', '좆같', '좆도', '좆나', '좆까', '쫒같',
    // 새끼/색기
    '개새끼', '개색기', '개색끼', '새끼', '색기', '색끼', '쌔끼', '쌔키',
    '개새', '느금마', '니애미', '니어미', '니애비', '니아빠',
    // 병신/머저리
    '병신', '븅신', '븅쉰', '병쉰', '븅', '머저리', '띨빵', '돌대가리',
    // 미친
    '미친놈', '미친년', '미친새끼', '돌았', '뒤져', '뒤졌',
    // 닥쳐/꺼져 등
    '닥쳐', '꺼져', '죽어', '뒤져버', '뒈져',
    // 성/외설
    '자지', '보지', '보짓', '자위', '딸딸이', '딸치', '딸친', '쎅스', '색스',
    '섹스', '음경', '음순', '정자', '사정', '음모', '오르가즘', '오르가슴',
    '꼴리', '꼴림', '발기', '음란',
    '빠굴', '빠구리', '떡치', '떡친',
    // 비속어 한자
    '운지', '한남', '한녀', '김치남', '김치녀', '맘충',
    // 특정 멸칭/혐오
    '짱깨', '쪽바리', '깜둥이', '검둥이',
    // 자모 약어 (자모 그대로 — 정규화에서 자모 보존)
    'ㅅㅂ', 'ㅆㅂ', 'ㅂㅅ', 'ㄱㅅㄲ', 'ㅈㄴ', 'ㅈㄹ', 'ㅁㅊ', 'ㅈㅂ',
    'ㄷㅊ', 'ㄲㅈ', 'ㅗㅗ',
  ];

  // ===== 영어 금칙어 (정규화 후 형태 — 소문자 영문) =====
  const BANNED_EN = [
    // 일반 욕설
    'fuck', 'fcuk', 'fuk', 'fck', 'fking', 'fukin', 'fcking', 'fucker',
    // l33t/자모 정규화 후에도 남는 변형.
    // f4ck·f@ck 는 4·@ 가 a 로 매핑돼 'fack' 이 되므로 원형만으론 안 걸린다.
    // v·x·q 는 매핑 대상이 아니라서 fvck·fxck·fuq 도 따로 넣어야 한다.
    'fack', 'fcak', 'fukc', 'fvck', 'fxck', 'fuq',
    'phuck', 'phuk', 'phack',
    'motherfucker', 'mthrfckr', 'wtf',
    'shit', 'shyt', 'sht', 'bullshit',
    'ass', 'asshole', 'azzhole', 'asshat', 'jackass', 'dumbass',
    'bitch', 'biatch', 'btch', 'bich',
    'damn', 'goddamn',
    'piss', 'pissed', 'pissoff',
    'crap', 'crappy',
    'hell',
    // 성적 비속어
    'dick', 'dickhead', 'cock', 'cocks', 'prick',
    'cunt', 'twat',
    'pussy', 'puss',
    'whore', 'hore', 'hoe', 'slut', 'skank',
    'penis', 'vagina', 'boobs', 'tits', 'titties',
    'sex', 'sexy', 'porn', 'porno', 'xxx',
    'orgasm', 'masturbat', 'horny', 'naked', 'nude',
    'rape', 'rapist',
    // 인종 차별/혐오
    'nigger', 'nigga', 'nigr',
    'faggot', 'faggit', 'fag',
    'retard', 'retarded',
    'chink', 'gook',
    // 약자
    'stfu', 'gtfo', 'fu',
  ];

  // ===== 정규화 =====
  // 1단계: 한국어 매칭용 — 한글(음절+자모)과 영문만 남기고 모두 제거.
  // 2단계: 영어 매칭용 — l33t 변환 후 동일 strip.
  function normalizeForKo(s) {
    return s
      .toLowerCase()
      .replace(/[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
  }
  function normalizeForEn(s) {
    return s
      .toLowerCase()
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/3/g, 'e')
      .replace(/4/g, 'a')
      .replace(/5/g, 's')
      .replace(/7/g, 't')
      .replace(/8/g, 'b')
      .replace(/9/g, 'g')
      .replace(/@/g, 'a')
      .replace(/\$/g, 's')
      .replace(/[^a-z가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
  }

  /**
   * isProfane(name): boolean
   * 두 정규화된 형태에서 어느 하나라도 금칙어 substring을 포함하면 true.
   * 빈 문자열, 공백만, 또는 단일 영문/숫자 같이 비어 있는 경우는 false (검열 대상 아님).
   */
  function isProfane(name) {
    if (!name) return false;
    const ko = normalizeForKo(name);
    const en = normalizeForEn(name);
    if (!ko && !en) return false;
    for (const w of BANNED_KO) {
      if (ko.includes(w)) return true;
    }
    for (const w of BANNED_EN) {
      if (en.includes(w)) return true;
    }
    return false;
  }

  return { isProfane };
})();
