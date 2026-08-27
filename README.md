# 미니게임 모음

브라우저에서 바로 플레이하는 미니게임 모음입니다. 게임 목록 페이지에서 각 게임으로 들어갑니다.

## 플레이

게임 목록: https://iwanjin.github.io/minigames/

| 게임 | 주소 | 위치 |
| --- | --- | --- |
| 냥냥 메모리즈 | https://iwanjin.github.io/easygo-catmemories/ | 별도 저장소 (easygo-catmemories) |
| 귀여운 두더지 잡기 | https://iwanjin.github.io/minigames/mole/ | 이 저장소 `mole/` |
| 포켓몬 레전드: 히스이의 전설 | https://iwanjin.github.io/minigames/pocket/ | 이 저장소 `pocket/` |
| 오목 | https://easy-go-baduk.onrender.com/?game=omok | 별도 저장소 (easygo-baduk) |
| 바둑 | https://easy-go-baduk.onrender.com/?game=baduk | 별도 저장소 (easygo-baduk) |

오목·바둑은 Render 무료 플랜에서 돌아가므로 접속이 없던 뒤 첫 요청은 응답까지 30초 정도 걸릴 수 있습니다.

## 구조

```
index.html                  게임 목록 페이지
mole/index.html             두더지 잡기
mole/js/firebase-config.js  Firebase 설정 (공개 클라이언트 키)
mole/js/profanity.js        닉네임 금칙어 검열
mole/js/cloud.js            Firestore 기록 읽기/쓰기
mole/js/scoreboard.js       결과 창 + 글로벌 순위표 UI
pocket/index.html           포켓몬 레전드
```

각 게임 화면 좌측 상단의 `← 게임 목록` 링크로 목록으로 돌아옵니다.

## 두더지 잡기 글로벌 기록 설정

두더지 잡기는 냥냥 메모리즈와 같은 Firebase 프로젝트(`easygo-c0713`)를 쓰고,
컬렉션만 `leaderboard_mole` 로 분리합니다.

**아직 이 컬렉션의 보안 규칙이 없으면 순위표에 "글로벌 기록 준비 중" 이라고 표시되고
기록 등록이 막힙니다. 게임 플레이와 내 최고 점수(로컬 저장)는 그대로 동작합니다.**

활성화하려면 Firebase 콘솔 → Firestore Database → 규칙에서, 기존 규칙을 지우지 말고
`match /databases/{database}/documents { ... }` 안에 아래 블록을 **추가**하세요.

```
// 두더지 잡기 글로벌 기록
match /leaderboard_mole/{doc} {
  allow read: if true;
  allow create: if
    request.resource.data.keys().hasOnly(
      ['name','score','hits','perfects','hammer','deviceId','country','ip','createdAt']
    )
    && request.resource.data.name is string
    && request.resource.data.name.size() <= 12
    && request.resource.data.score is int
    && request.resource.data.score >= 1
    && request.resource.data.score <= 1000000
    && request.resource.data.hits is int
    && request.resource.data.hits >= 0
    && request.resource.data.perfects is int
    && request.resource.data.perfects >= 0;
  allow update, delete: if false;
}
```

규칙 페이지: https://console.firebase.google.com/project/easygo-c0713/firestore/rules

정렬은 `score` 내림차순 한 가지만 쓰므로 복합 색인은 만들 필요가 없습니다.
(동점끼리는 순서가 보장되지 않습니다.)

### 기록되는 값

닉네임, 점수, 잡은 두더지 수, PERFECT 판정 수, 사용한 망치, 기기 ID,
지역 코드(브라우저 언어에서 추출), 공인 IP.

국기는 지역 코드로 표시하고, IP는 순위표에서 `118.36.*.*` 처럼 일부만 보여줍니다.
IP와 지역 코드는 클라이언트가 보내는 값이라 위변조가 가능합니다. 신뢰 신호가 아니라
표시용 메타데이터로만 쓰세요.

## 게임 추가 방법

- 이 저장소에 두는 경우: `<이름>/index.html` 로 파일을 넣고, 루트 `index.html` 의 `.games` 안에 `<a class="game" href="<이름>/">` 카드를 추가합니다.
- 다른 곳에 배포된 게임을 연결하는 경우: 카드의 `href` 에 전체 주소를 넣고 `target="_blank" rel="noopener"` 와 `<span class="external">다른 사이트 ↗</span>` 를 함께 추가합니다.

커밋 후 push 하면 GitHub Pages 에 자동 반영됩니다.

## 실행 (로컬)

각 `index.html` 을 브라우저로 열면 됩니다. 두더지 잡기의 글로벌 순위표도
`file://` 에서 동작합니다.
