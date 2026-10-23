/*
 * lessons.js — "Learn Quantum": browsable lesson library + per-lesson detail
 * with concepts, worked example, steps, practice question, and completion.
 */
(function (global) {
  'use strict';

  var activeFilter = 'all';
  function esc(s) { return global.SIM_ESC(s); }

  function renderLessons() {
    var c = document.getElementById('content');
    var meta = global.CATEGORY_META;
    var user = global.getAppUser();
    var prog = global.Progress.get(user.id);
    var done = prog.completedLessons;

    c.innerHTML =
      '<div class="flex-between wrap mb-16">' +
        '<h3 style="font-size:1.15rem;font-weight:700">Choose a lesson</h3>' +
        '<div class="seg" id="lessonFilter">' +
          '<button data-f="all" class="active">All</button>' +
          '<button data-f="beginner">Beginner</button>' +
          '<button data-f="intermediate">Intermediate</button>' +
          '<button data-f="advanced">Advanced</button>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-3" id="lessonGrid"></div>';

    document.querySelectorAll('#lessonFilter button').forEach(function (b) {
      b.addEventListener('click', function () {
        activeFilter = b.getAttribute('data-f');
        document.querySelectorAll('#lessonFilter button').forEach(function (x) { x.classList.toggle('active', x === b); });
        fillGrid(done);
      });
    });

    fillGrid(done);
  }

  function fillGrid(done) {
    var grid = document.getElementById('lessonGrid');
    if (!grid) return;
    var list = global.LESSONS.filter(function (l) { return activeFilter === 'all' || l.category === activeFilter; });
    grid.innerHTML = list.map(function (l) {
      var meta = global.CATEGORY_META[l.category];
      var isDone = done.indexOf(l.id) !== -1;
      return '<div class="lesson-card" data-id="' + l.id + '">' +
        '<span class="lc-ic" style="background:' + l.color + '22;color:' + l.color + '">' + l.icon + '</span>' +
        '<div class="lc-body"><div class="lc-title">' + esc(l.title) + '</div>' +
        '<div class="lc-meta">' + esc(meta.label) + ' \u00b7 ' + esc(l.duration) + '</div></div>' +
        (isDone ? '<span class="lc-done">\u2713</span>' : '<span class="badge badge-muted">' + esc(l.summary.slice(0, 16)) + '\u2026</span>') +
        '</div>';
    }).join('');

    grid.querySelectorAll('.lesson-card').forEach(function (card) {
      card.addEventListener('click', function () { global.navigate('#/learn/' + card.getAttribute('data-id')); });
    });
  }

  function renderLessonDetail(id) {
    var lesson = global.LESSONS.find(function (l) { return l.id === id; });
    var c = document.getElementById('content');
    if (!lesson) { c.innerHTML = '<p class="muted">Lesson not found.</p>'; return; }

    var meta = global.CATEGORY_META[lesson.category];
    var user = global.getAppUser();
    var prog = global.Progress.get(user.id);
    var isDone = prog.completedLessons.indexOf(id) !== -1;

    var concepts = lesson.concepts.map(function (k) {
      return '<div class="concept-item"><h4>' + esc(k.title) + '</h4><p>' + esc(k.desc) + '</p></div>';
    }).join('');

    var steps = lesson.steps.map(function (s) {
      return '<div class="step-item"><h4>' + esc(s.title) + '</h4><p>' + esc(s.text) + '</p></div>';
    }).join('');

    var practice = lesson.practice && lesson.practice[0] ? renderPractice(lesson.practice[0]) : '';

    c.innerHTML =
      '<div class="card lesson-detail">' +
        '<div class="ld-header">' +
          '<span class="lc-ic" style="width:56px;height:56px;border-radius:15px;background:' + lesson.color + '22;color:' + lesson.color + ';display:grid;place-items:center;font-size:1.6rem">' + lesson.icon + '</span>' +
          '<div style="flex:1;min-width:0"><div class="flex wrap" style="margin-bottom:8px"><span class="badge ' + meta.badge + '">' + meta.label + '</span>' +
          '<span class="badge badge-muted">' + esc(lesson.duration) + '</span></div>' +
          '<h1 class="ld-title">' + esc(lesson.title) + '</h1>' +
          '<p class="ld-desc">' + esc(lesson.summary) + '</p></div>' +
        '</div>' +

        '<p style="line-height:1.7;color:var(--text)">' + esc(lesson.intro) + '</p>' +

        '<h3 class="card-title" style="margin:22px 0 12px"><span class="dot"></span>Key concepts</h3>' +
        '<div class="concept-list">' + concepts + '</div>' +

        '<h3 class="card-title" style="margin:22px 0 12px"><span class="dot" style="background:var(--cyan)"></span>Visual example</h3>' +
        '<div class="example-box">' + esc(lesson.example) + '</div>' +

        '<h3 class="card-title" style="margin:22px 0 12px"><span class="dot" style="background:var(--purple)"></span>Step by step</h3>' +
        '<div class="step-list">' + steps + '</div>' +

        (practice ? '<h3 class="card-title" style="margin:22px 0 12px"><span class="dot" style="background:var(--pink)"></span>Practice</h3><div id="practiceArea">' + practice + '</div>' : '') +

        '<div class="sim-actions" style="margin-top:20px">' +
          '<button class="btn btn-purple btn-sm" id="askTutorBtn">\uD83E\uDD16 Ask AI Tutor</button>' +
          '<button class="btn ' + (isDone ? 'btn-secondary' : 'btn-primary') + ' btn-sm" id="markLessonBtn">' + (isDone ? '\u2713 Completed' : 'Mark as completed') + '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('askTutorBtn').addEventListener('click', function () {
      global.navigate('#/tutor?q=' + encodeURIComponent(lesson.title));
    });

    document.getElementById('markLessonBtn').addEventListener('click', function () {
      global.Progress.markLesson(user.id, id);
      global.toast('Lesson completed \u2014 nice work!', 'success');
      global.updateStreakUI();
      renderLessonDetail(id);
    });

    var pracArea = document.getElementById('practiceArea');
    if (pracArea && lesson.practice && lesson.practice[0]) bindPractice(pracArea, lesson.practice[0]);
  }

  function renderPractice(p) {
    var letters = ['A', 'B', 'C', 'D'];
    return '<div class="quiz-q">' + esc(p.q) + '</div>' +
      p.options.map(function (o, i) {
        return '<button class="quiz-opt" data-i="' + i + '"><span class="opt-key">' + letters[i] + '.</span>' + esc(o) + '</button>';
      }).join('');
  }

  function bindPractice(area, q) {
    var answer = q.answer;
    area.querySelectorAll('.quiz-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        area.querySelectorAll('.quiz-opt').forEach(function (b) { b.disabled = true; });
        var idx = parseInt(btn.getAttribute('data-i'), 10);
        if (idx === answer) {
          btn.classList.add('correct');
          area.insertAdjacentHTML('beforeend', '<div class="badge badge-green mt-8">\u2713 Correct \u2014 ' + esc(q.explain) + '</div>');
        } else {
          btn.classList.add('wrong');
          area.querySelector('.quiz-opt[data-i="' + answer + '"]').classList.add('correct');
          area.insertAdjacentHTML('beforeend', '<div class="badge badge-pink mt-8">\u2715 Not quite. ' + esc(q.explain) + '</div>');
        }
      });
    });
  }

  global.renderLessons = renderLessons;
  global.renderLessonDetail = renderLessonDetail;
})(window);
