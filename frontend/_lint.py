import esprima

files = ['data.js', 'state.js', 'auth.js', 'router.js', 'simulator.js',
         'timeMachine.js', 'circuitBuilder.js', 'lessons.js', 'dashboard.js',
         'algorithms.js', 'quizzes.js', 'tutor.js', 'main.js']
bad = 0
for f in files:
    try:
        esprima.parseScript(open(f, encoding='utf-8').read())
        print('OK  ', f)
    except Exception as e:
        bad += 1
        print('FAIL', f, '->', str(e)[:220])
print('TOTAL FAILURES:', bad)
