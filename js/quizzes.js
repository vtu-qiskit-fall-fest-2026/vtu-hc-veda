/*
 * quizzes.js — interactive multiple-choice quizzes with scoring & explanations.
 */
(function (global) {
  'use strict';
  function esc(s) { return global.SIM_ESC(s); }
  var letters = ['A', 'B', 'C', 'D'];

  function quizBest(quizId) {
    var p = global.Progress.get(global.getAppUser().id);
    var hit = p.quizScores.find(function (s) { return s.quizId === quizId; });
    return hit ? hit.best : null;
  }

  function renderQuizzes() {
    var c = document.getElementById('content');
    c.innerHTML =
      '<div class="grid grid-3" id="quizGrid"></div>';

    var grid = document.getElementById('quizGrid');
    grid.innerHTML = global.QUIZZES.map(function (q) {
      var best = quizBest(q.id);
      var meta = global.CATEGORY_META[q.level];
      return '<div class="quiz-card" data-id="' + q.id + '" style="cursor:pointer">' +
        '<div class="quiz-meta"><span class="badge ' + meta.badge + '">' + esc(meta.label) + '</span>' +
        (best != null ? '<span class="badge badge-green">Best ' + best + '%</span>' : '<span class="badge badge-muted">Not taken</span>') + '</div>' +
        '<div class="lc-ic" style="width:44px;height:44px;border-radius:12px;background:' + q.color + '22;color:' + q.color + ';display:grid;place-items:center;font-size:1.2rem">' + q.icon + '</div>' +
        '<h3 style="margin-top:12px;font-size:1.05rem">' + esc(q.title) + '</h3>' +
        '<p class="muted" style="font-size:0.85rem;margin-top:6px">' + q.questions.length + ' questions</p>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.quiz-card').forEach(function (card) {
      card.addEventListener('click', function () { global.navigate('#/quizzes/' + card.getAttribute('data-id')); });
    });
  }

  function renderQuizRunner(quizId) {
    var q = global.QUIZZES.find(function (x) { return x.id === quizId; });
    var c = document.getElementById('content');
    if (!q) { c.innerHTML = '<p class="muted">Quiz not found.</p>'; return; }
    runQuiz(q);
  }

  function runQuiz(q) {
    var c = document.getElementById('content');
    var idx = 0, score = 0;
    var total = q.questions.length;

    function questionHTML(question) {
      return '<div class="quiz-q">' + esc(question.q) + '</div>' +
        question.options.map(function (o, i) {
          return '<button class="quiz-opt" data-i="' + i + '"><span class="opt-key">' + letters[i] + '.</span>' + esc(o) + '</button>';
        }).join('');
    }

    function next(qi) {
      var qq = q.questions[qi];
      c.innerHTML =
        '<div class="card" style="max-width:720px;margin:0 auto">' +
          '<div class="flex-between mb-16"><div><span class="badge badge-green">' + esc(q.title) + '</span></div>' +
          '<span class="muted">Question ' + (qi + 1) + ' of ' + total + '</span></div>' +
          '<div class="progress cyan mb-24"><span style="width:' + Math.round((qi) / total * 100) + '%"></span></div>' +
          '<div id="qArea">' + questionHTML(qq) + '</div>' +
          '<div id="qaFeedback" class="mt-16"></div>' +
          '<div class="sim-actions mt-16" id="navArea"></div>' +
        '</div>';

      var answered = false;
      document.querySelectorAll('#qArea .quiz-opt').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (answered) return;
          answered = true;
          document.querySelectorAll('#qArea .quiz-opt').forEach(function (b) { b.disabled = true; });
          var i = parseInt(btn.getAttribute('data-i'), 10);
          var correct = i === qq.answer;
          if (correct) { btn.classList.add('correct'); score++; }
          else {
            btn.classList.add('wrong');
            var right = document.querySelector('#qArea .quiz-opt[data-i="' + qq.answer + '"]');
            if (right) right.classList.add('correct');
          }
          document.getElementById('qaFeedback').innerHTML =
            '<div class="' + (correct ? 'badge badge-green' : 'badge badge-pink') + '">' +
            (correct ? '\u2713 Correct!' : '\u2715 Not quite') + ' \u2022 ' + esc(qq.explain) + '</div>';

          var nav = document.getElementById('navArea');
          var btnTxt = (qi === total - 1) ? 'Finish quiz' : 'Next question \u2192';
          nav.innerHTML = '<button class="btn btn-primary" id="nextQ">' + btnTxt + '</button>';
          document.getElementById('nextQ').addEventListener('click', function () {
            if (qi === total - 1) finish();
            else next(qi + 1);
          });
        });
      });
    }

    function finish() {
      var pct = Math.round(score / total * 100);
      global.Progress.recordQuiz(global.getAppUser().id, q, pct);
      var col = pct >= 80 ? '#34d399' : (pct >= 50 ? '#f6b93b' : '#f87171');
      c.innerHTML =
        '<div class="card" style="max-width:560px;margin:0 auto;text-align:center">' +
          '<div class="score-ring" style="margin:0 auto"><svg width="140" height="140" viewBox="0 0 140 140">' +
          '<circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12"/>' +
          '<circle cx="70" cy="70" r="60" fill="none" stroke="' + col + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (pct / 100 * 377) + ' 377"/>' +
          '</svg><div class="ring-text"><div><b style="font-size:2rem">' + pct + '%</b><br><span>' + score + '/' + total + ' correct</span></div></div></div>' +
          '<h3 class="mt-16" style="font-size:1.4rem">' + (pct >= 80 ? 'Outstanding!' : (pct >= 50 ? 'Good work!' : 'Keep practicing!')) + '</h3>' +
          '<p class="muted mt-8">Your score has been saved to your progress.</p>' +
          '<div class="sim-actions" style="justify-content:center">' +
          '<button class="btn btn-secondary" id="retry">Retry</button>' +
          '<button class="btn btn-primary" id="backQuizzes">All quizzes</button>' +
          '</div>' +
        '</div>';
      document.getElementById('retry').addEventListener('click', function () { runQuiz(q); });
      document.getElementById('backQuizzes').addEventListener('click', function () { global.navigate('#/quizzes'); });
    }

    next(0);
  }

  global.renderQuizzes = renderQuizzes;
  global.renderQuizRunner = renderQuizRunner;
})(window);
