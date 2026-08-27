# 미니게임 모음

브라우저에서 바로 플레이하는 미니게임 모음입니다. 게임 목록 페이지에서 각 게임으로 들어갑니다.

## 플레이

게임 목록: https://iwanjin.github.io/minigames/

| 게임 | 주소 | 위치 |
| --- | --- | --- |
| 냥냥 메모리즈 | https://iwanjin.github.io/easygo-catmemories/ | 별도 저장소 (easygo-catmemories) |
| 귀여운 두더지 잡기 | https://iwanjin.github.io/minigames/mole/ | 이 저장소 `mole/` |
| 포켓몬 레전드: 히스이의 전설 | https://iwanjin.github.io/minigames/pocket/ | 이 저장소 `pocket/` |
| 오목 | https://easy-go-baduk.onrender.com/ | 별도 저장소 (easygo-baduk), 상단 `오목` 탭 |
| 바둑 | https://easy-go-baduk.onrender.com/ | 별도 저장소 (easygo-baduk), 상단 `바둑` 탭 |

오목·바둑은 Render 무료 플랜에서 돌아가므로 접속이 없던 뒤 첫 요청은 응답까지 30초 정도 걸릴 수 있습니다.

## 구조

```
index.html         게임 목록 페이지
mole/index.html    두더지 잡기
pocket/index.html  포켓몬 레전드
```

이 저장소에 들어 있는 게임은 외부 라이브러리 없는 단일 HTML 파일이며, 각 게임 화면 좌측 상단의 `← 게임 목록` 링크로 목록으로 돌아옵니다.

## 게임 추가 방법

- 이 저장소에 두는 경우: `<이름>/index.html` 로 파일을 넣고, 루트 `index.html` 의 `.games` 안에 `<a class="game" href="<이름>/">` 카드를 추가합니다.
- 다른 곳에 배포된 게임을 연결하는 경우: 카드의 `href` 에 전체 주소를 넣고 `target="_blank" rel="noopener"` 와 `<span class="external">다른 사이트 ↗</span>` 를 함께 추가합니다.

커밋 후 push 하면 GitHub Pages 에 자동 반영됩니다.

## 실행 (로컬)

각 `index.html` 을 브라우저로 열면 됩니다.
