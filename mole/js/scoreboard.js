// ============================================================
// ScoreBoard — 두더지 잡기 기록 등록 + 글로벌 순위표 UI
//
// 담당:
//   - 게임 종료 결과 창 (점수/잡은 수/PERFECT 수)
//   - 닉네임 입력 + 금칙어 검열 후 글로벌 기록 등록
//   - TOP 10 실시간 순위표 (국기, 부분 IP, 내 기록 표시)
//   - 내 최고 점수 로컬 저장
//
// Firebase 가 준비되지 않았거나 보안 규칙이 아직 없으면 등록만 막고
// 게임과 로컬 최고 점수는 그대로 동작한다.
// ============================================================

const ScoreBoard = (function () {
  const TOP_N = 10;
  const NAME_MAX = 12;
  const BEST_KEY = 'moleBestScore';
  const NAME_KEY = 'mole_nickname';

  // 마지막 판 결과 — 등록 버튼이 참조한다.
  let pending = null;
  let submittedThisRound = false;
  let unsubscribe = null;

  // ===== 유틸 =====

  function el(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ISO 3166-1 alpha-2 → 유니코드 국기 이모지.
  // 알 수 없으면 지구 아이콘. (틀린 국기를 보여주는 것보다 정직하다.)
  function countryToFlag(cc) {
    if (!cc || !/^[A-Za-z]{2}$/.test(cc)) return '🌐';
    const u = cc.toUpperCase();
    return String.fromCodePoint(
      0x1F1E6 + u.charCodeAt(0) - 65,
      0x1F1E6 + u.charCodeAt(1) - 65
    );
  }

  // IPv4 → "A.B.*.*" / IPv6 → 첫 그룹만. 알 수 없으면 빈 문자열.
  function maskIp(ip) {
    if (!ip || typeof ip !== 'string') return '';
    const v4 = /^(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(ip);
    if (v4) return `${v4[1]}.*.*`;
    if (ip.includes(':')) {
      const head = ip.split(':')[0];
      return head ? `${head}:*:*:*` : '';
    }
    return '';
  }

  function rankIcon(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return String(rank);
  }

  // ===== 내 최고 점수 =====

  function getBest() {
    return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
  }

  function setBest(score) {
    try { localStorage.setItem(BEST_KEY, String(score)); } catch {}
  }

  function renderBest() {
    const node = el('best-score');
    if (node) node.textContent = getBest().toLocaleString();
  }

  // ===== 순위표 =====

  function setStatus(text) {
    const node = el('lb-status');
    if (!node) return;
    node.textContent = text || '';
    node.classList.toggle('hidden', !text);
  }

  function renderRows(list) {
    const ol = el('lb-list');
    if (!ol) return;
    ol.innerHTML = '';

    if (!list.length) {
      setStatus('아직 기록이 없어요. 첫 기록의 주인이 되어 보세요!');
      return;
    }
    setStatus('');

    list.forEach((entry, idx) => {
      const rank = idx + 1;
      const li = document.createElement('li');
      li.className = 'lb-row' + (entry.isMe ? ' lb-row-me' : '');

      const ipMasked = maskIp(entry.ip);
      const flagLabel = (entry.country || '').toUpperCase() || '알 수 없음';

      li.innerHTML = `
        <span class="lb-rank">${rankIcon(rank)}</span>
        <span class="lb-name">
          <span class="lb-flag" title="${escapeHtml(flagLabel)}">${countryToFlag(entry.country)}</span>
          ${escapeHtml(entry.name)}
          ${entry.isMe ? '<span class="lb-me">나</span>' : ''}
          ${ipMasked ? `<span class="lb-ip">${escapeHtml(ipMasked)}</span>` : ''}
        </span>
        <span class="lb-score">${entry.score.toLocaleString()}점</span>
        <span class="lb-meta">🔨 ${entry.hits}마리 · ✨ ${entry.perfects}</span>
      `;
      ol.appendChild(li);
    });
  }

  function statusForReason(reason) {
    if (reason === 'not_configured') {
      return '글로벌 기록이 아직 연결되지 않았어요.';
    }
    if (reason === 'permission_denied') {
      return '글로벌 기록 준비 중이에요. (Firestore 보안 규칙 설정 필요)';
    }
    return '글로벌 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
  }

  async function startLeaderboard() {
    if (!MoleCloud.isReady()) {
      setStatus(statusForReason('not_configured'));
      return;
    }
    setStatus('순위를 불러오는 중...');
    unsubscribe = await MoleCloud.subscribeTop(
      TOP_N,
      renderRows,
      (reason) => setStatus(statusForReason(reason))
    );
  }

  // ===== 결과 창 =====

  function openResult(result) {
    pending = result;
    submittedThisRound = false;

    const scoreNode = el('result-score');
    if (scoreNode) scoreNode.textContent = result.score.toLocaleString();

    const detail = el('result-detail');
    if (detail) {
      detail.textContent = `잡은 두더지 ${result.hits}마리 · PERFECT ${result.perfects}회`;
    }

    const best = getBest();
    const isNewBest = result.score > best;
    if (isNewBest) setBest(result.score);
    renderBest();

    const bestLine = el('result-best');
    if (bestLine) {
      bestLine.textContent = isNewBest
        ? '🎉 내 최고 점수를 새로 세웠어요!'
        : `내 최고 점수 ${best.toLocaleString()}점`;
    }

    const input = el('nickname-input');
    if (input) input.value = localStorage.getItem(NAME_KEY) || '';

    setSubmitMessage('');
    updateSubmitAvailability();

    const modal = el('result-modal');
    if (modal) modal.classList.remove('hidden');
    if (input && !input.disabled) input.focus();
  }

  function closeResult() {
    const modal = el('result-modal');
    if (modal) modal.classList.add('hidden');
  }

  function setSubmitMessage(text, kind) {
    const node = el('submit-msg');
    if (!node) return;
    node.textContent = text || '';
    node.className = 'submit-msg' + (kind ? ' ' + kind : '');
  }

  // 등록 버튼을 쓸 수 있는 상태인지 정리한다.
  function updateSubmitAvailability() {
    const btn = el('submit-score-btn');
    const input = el('nickname-input');
    if (!btn) return;

    if (!pending || pending.score <= 0) {
      btn.disabled = true;
      if (input) input.disabled = true;
      setSubmitMessage('점수가 0점이면 기록을 등록할 수 없어요.');
      return;
    }
    if (!MoleCloud.isReady()) {
      btn.disabled = true;
      if (input) input.disabled = true;
      setSubmitMessage(statusForReason('not_configured'));
      return;
    }
    if (submittedThisRound) {
      btn.disabled = true;
      if (input) input.disabled = true;
      return;
    }
    btn.disabled = false;
    if (input) input.disabled = false;
  }

  async function submitScore() {
    if (!pending || submittedThisRound) return;

    const input = el('nickname-input');
    const raw = (input ? input.value : '').trim();

    if (!raw) {
      setSubmitMessage('닉네임을 입력해 주세요.', 'error');
      if (input) input.focus();
      return;
    }
    if (raw.length > NAME_MAX) {
      setSubmitMessage(`닉네임은 ${NAME_MAX}자까지 쓸 수 있어요.`, 'error');
      return;
    }
    if (typeof Profanity !== 'undefined' && Profanity.isProfane(raw)) {
      setSubmitMessage('그 닉네임은 쓸 수 없어요. 다른 이름으로 바꿔 주세요.', 'error');
      if (input) input.select();
      return;
    }

    const btn = el('submit-score-btn');
    if (btn) btn.disabled = true;
    setSubmitMessage('등록 중...');

    try { localStorage.setItem(NAME_KEY, raw); } catch {}

    const res = await MoleCloud.addEntry({
      name: raw,
      score: pending.score,
      hits: pending.hits,
      perfects: pending.perfects,
      hammer: pending.hammer
    });

    if (!res.ok) {
      if (btn) btn.disabled = false;
      setSubmitMessage(
        res.reason === 'permission_denied'
          ? statusForReason('permission_denied')
          : '등록에 실패했어요. 잠시 후 다시 시도해 주세요.',
        'error'
      );
      return;
    }

    submittedThisRound = true;
    updateSubmitAvailability();
    setSubmitMessage('기록이 등록됐어요!', 'ok');

    const est = await MoleCloud.getRankEstimate(pending.score);
    if (est) {
      setSubmitMessage(`기록이 등록됐어요! 현재 ${est.rank}위`, 'ok');
    }
  }

  // ===== 초기화 =====

  function init() {
    renderBest();
    startLeaderboard();

    const btn = el('submit-score-btn');
    if (btn) btn.addEventListener('click', submitScore);

    const input = el('nickname-input');
    if (input) {
      input.setAttribute('maxlength', String(NAME_MAX));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitScore();
      });
    }

    const closeBtn = el('result-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeResult);
  }

  // 게임 종료 시 game 쪽에서 호출한다.
  function onGameEnd(result) {
    openResult({
      score: Number(result.score) || 0,
      hits: Number(result.hits) || 0,
      perfects: Number(result.perfects) || 0,
      hammer: String(result.hammer || '')
    });
  }

  return { init, onGameEnd, getBest, renderBest, closeResult };
})();

document.addEventListener('DOMContentLoaded', ScoreBoard.init);
