# 미니게임 모음

브라우저에서 바로 플레이하는 미니게임 모음입니다. 각 게임은 외부 라이브러리 없는 단일 HTML 파일로 동작합니다.

## 플레이

- 게임 목록: https://iwanjin.github.io/mole-fever-game/
- 귀여운 두더지 잡기 (피버타임 에디션): https://iwanjin.github.io/mole-fever-game/mole/
- 포켓몬 레전드: 히스이의 전설 (엔드 콘텐츠 확장판): https://iwanjin.github.io/mole-fever-game/pocket/

## 구조

```
index.html      게임 목록 페이지
mole/index.html 두더지 잡기
pocket/index.html 포켓몬 레전드
```

## 게임 추가 방법

1. `<이름>/index.html` 로 게임 파일을 넣습니다.
2. 루트 `index.html` 의 `.games` 안에 카드 `<a class="game" href="<이름>/">` 를 추가합니다.
3. 커밋 후 push 하면 GitHub Pages 에 자동 반영됩니다.

## 실행 (로컬)

각 `index.html` 을 브라우저로 열면 됩니다.
