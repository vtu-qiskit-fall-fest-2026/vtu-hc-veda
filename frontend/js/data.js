/*
 * data.js — static learning content: lessons, quizzes, algorithms, achievements,
 * and suggested AI Tutor questions. This is demo content so no backend/AI is
 * required for the platform to feel complete.
 */
(function (global) {
  'use strict';

  var CATEGORY_META = {
    beginner: { label: 'Beginner', badge: 'badge-green' },
    intermediate: { label: 'Intermediate', badge: 'badge-cyan' },
    advanced: { label: 'Advanced', badge: 'badge-purple' }
  };

  var LESSONS = [
    // -------- BEGINNER --------
    {
      id: 'what-is-qc', category: 'beginner', title: 'What is Quantum Computing?', icon: '◉', color: '#34d399',
      duration: '6 min', summary: 'A gentle introduction to quantum computing and why it matters.',
      intro: 'Quantum computing leverages quantum mechanics to process information in fundamentally new ways. Instead of the binary bits of classical computers (0s and 1s), quantum computers use qubits that can be in superposition, enabling them to explore many possibilities at once.',
      concepts: [
        { title: 'Qubits vs Bits', desc: 'A classical bit is either 0 or 1. A qubit is a quantum system that can be 0, 1, or a superposition of both.' },
        { title: 'Quantum parallelism', desc: 'A register of n qubits can represent 2^n states simultaneously, letting certain algorithms run far faster.' },
        { title: 'Why now?', desc: 'Better qubit control (e.g. superconducting qubits, trapped ions) has pushed quantum computers past ~100s of qubits.' }
      ],
      example: 'A 3-qubit computer holds 2^3 = 8 basis states at once: |000⟩, |001⟩, …, |111⟩.',
      steps: [
        { title: 'Bits are binary', text: 'Classical computers store 0 and 1. Every operation is deterministic.' },
        { title: 'Qubits are quantum', text: 'Qubits live on the Bloch sphere and can be complex superpositions.' },
        { title: 'Information = probability', text: 'Reading a qubit collapses it to 0 or 1 with a probability we control.' },
        { title: 'Algorithms exploit this', text: 'Entanglement + superposition power Shor, Grover, and quantum simulation.' }
      ],
      practice: [
        { q: 'How many basis states can n qubits represent simultaneously?', options: ['n', '2^n', 'n^2', '2n'], answer: 1, explain: 'n qubits span a Hilbert space of dimension 2^n.' }
      ]
    },
    {
      id: 'bit-vs-qubit', category: 'beginner', title: 'Classical Bit vs Qubit', icon: '⊙', color: '#22c9ff',
      duration: '7 min', summary: 'Compare a deterministic bit with a probabilistic quantum qubit.',
      intro: 'The bit and the qubit look similar on the surface, but they behave very differently. A bit can only be 0 or 1 with certainty. A qubit describes probabilities and phases.',
      concepts: [
        { title: 'A bit', desc: 'Always exactly 0 or 1. Reading it is free and never disturbs it.' },
        { title: 'A qubit', desc: 'α|0⟩ + β|1⟩ where α, β are complex amplitudes with |α|²+|β|²=1.' },
        { title: 'Measurement', desc: 'Measuring a qubit returns 0 with probability |α|² and 1 with |β|², collapsing the state.' }
      ],
      example: 'A qubit in state |+⟩ = (|0⟩+|1⟩)/√2 has a 50% chance of measuring 0 and 50% of measuring 1.',
      steps: [
        { title: 'Bit has 2 states', text: '0 or 1 — determined exactly.' },
        { title: 'Qubit has infinite states', text: 'Any point on the Bloch sphere is a valid pure state.' },
        { title: 'Measurement is probabilistic', text: 'The same qubit state gives different results each run.' },
        { title: 'Phases matter', text: 'Two states with the same probabilities can differ by a relative phase.' }
      ],
      practice: [
        { q: 'What happens when you measure a qubit in state (|0⟩+|1⟩)/√2?', options: ['Always 0', 'Always 1', '0 or 1 with 50% each', 'It stays in superposition forever'], answer: 2, explain: 'The superposition collapses; each outcome has probability 0.5.' }
      ]
    },
    {
      id: 'qubit-states', category: 'beginner', title: 'Qubits and Quantum States', icon: '⌿', color: '#8b5cf6',
      duration: '8 min', summary: 'Representing quantum states as vectors and amplitudes.',
      intro: 'A single qubit state is a complex vector. We write |0⟩ = (1, 0) and |1⟩ = (0, 1), and a general state is α|0⟩ + β|1⟩.',
      concepts: [
        { title: 'Bra-ket notation', desc: '|ψ⟩ is a "ket" vector. ⟨ψ| is the conjugate "bra".' },
        { title: 'Amplitudes', desc: 'Complex numbers α and β. Their squares give probabilities.' },
        { title: 'Normalization', desc: '|α|² + |β|² = 1 ensures total probability is 1.' }
      ],
      example: '|+⟩ = (|0⟩+|1⟩)/√2  →  α = β = 1/√2 ≈ 0.707.',
      steps: [
        { title: 'Write the vector', text: '|0⟩=(1,0), |1⟩=(0,1).' },
        { title: 'Superpose', text: 'Add scaled versions of basis states to get a general state.' },
        { title: 'Normalize', text: 'Scale so amplitudes square-sum to 1.' },
        { title: 'Measure', text: 'Probabilities come from |α|² and |β|².' }
      ],
      practice: [
        { q: 'In state α|0⟩+β|1⟩, what is the probability of measuring |1⟩?', options: ['α²', 'β²', '|α|²', '|β|²'], answer: 3, explain: 'The probability is the squared magnitude of the amplitude: |β|².' }
      ]
    },
    {
      id: 'superposition', category: 'beginner', title: 'Superposition', icon: '≋', color: '#22c9ff',
      duration: '7 min', summary: 'The ability of a qubit to be in multiple states at once.',
      intro: 'Superposition is the core quantum resource: a qubit is a weighted combination of |0⟩ and |1⟩ until we measure it. The Hadamard gate is the standard way to create it.',
      concepts: [
        { title: 'Linear combination', desc: '|ψ⟩ = α|0⟩ + β|1⟩ with complex coefficients.' },
        { title: 'Not "both at once"', desc: 'It is a single quantum state with probability amplitudes, not a hidden coin flip.' },
        { title: 'Interference', desc: 'Amplitudes can add constructively or destructively, used in many algorithms.' }
      ],
      example: 'Apply H to |0⟩: (|0⟩+|1⟩)/√2 — a perfect 50/50 superposition.',
      steps: [
        { title: 'Prepare |0⟩', text: 'Start in a definite basis state.' },
        { title: 'Apply H', text: 'H|0⟩ = (|0⟩+|1⟩)/√2.' },
        { title: 'Equal amplitudes', text: 'Both basis states have amplitude 1/√2.' },
        { title: 'Measure on H basis', text: 'The state collapses to an equal 50/50 distribution.' }
      ],
      practice: [
        { q: 'Which gate turns |0⟩ into the equal superposition (|0⟩+|1⟩)/√2?', options: ['X', 'Z', 'H', 'CNOT'], answer: 2, explain: 'The Hadamard (H) gate creates this superposition.' }
      ]
    },
    {
      id: 'measurement', category: 'beginner', title: 'Measurement', icon: '▦', color: '#f472b6',
      duration: '6 min', summary: 'How reading a qubit collapses its state.',
      intro: 'Measurement is irreversible: it projects the quantum state onto a basis state. This is why we usually wait until the end of a circuit to measure.',
      concepts: [
        { title: 'Born rule', desc: 'P(outcome) = |amplitude|².' },
        { title: 'Collapse', desc: 'After measuring 0, the state becomes |0⟩.' },
        { title: 'No-cloning', desc: 'You generally cannot copy an unknown quantum state.' }
      ],
      example: 'Measuring (|0⟩+|1⟩)/√2 yields 0 or 1 with 50% each; afterwards the state is |0⟩ or |1⟩.',
      steps: [
        { title: 'Pick a basis', desc: 'Standard measurement is in the computational basis.' },
        { title: 'Compute probabilities', text: 'Square the magnitudes of amplitudes.' },
        { title: 'Sample an outcome', text: 'Randomly choose according to those probabilities.' },
        { title: 'State collapses', text: 'All other terms vanish for that run.' }
      ],
      practice: [
        { q: 'After measuring a qubit and observing |0⟩, the qubit is…', options: ['Still in superposition', 'Definitely |0⟩', 'Definitely |1⟩', 'Random'], answer: 1, explain: 'Measurement collapses the state to the observed outcome.' }
      ]
    },
    {
      id: 'entanglement', category: 'beginner', title: 'Entanglement', icon: '∞', color: '#22d3a7',
      duration: '9 min', summary: 'The resource that links qubits so their results correlate.',
      intro: 'Entanglement creates correlations between qubits that no classical system can reproduce. The Bell state is the simplest example: measuring it always gives correlated results.',
      concepts: [
        { title: 'Bell state', desc: '(|00⟩+|11⟩)/√2 — the two qubits are always equal when measured.' },
        { title: 'Non-local correlations', desc: 'Bell inequalities show these correlations are stronger than classical.' },
        { title: 'Key resource', desc: 'Drives teleportation, superdense coding, and quantum error correction.' }
      ],
      example: 'H on q0, then CNOT(q0→q1) creates the Bell state |Φ+⟩ = (|00⟩+|11⟩)/√2.',
      steps: [
        { title: 'H on q0', text: 'Creates superposition.' },
        { title: 'CNOT(q0→q1)', text: 'Flips q1 only where q0 is |1⟩.' },
        { title: 'Correlated outcome', text: 'Only |00⟩ or |11⟩ ever appears.' },
        { title: 'Measure', text: 'Both qubits always read the same value.' }
      ],
      practice: [
        { q: 'In the Bell state (|00⟩+|11⟩)/√2, which outcomes are possible?', options: ['00 and 11 only', '01 and 10 only', '00,01,10,11', 'Only 00'], answer: 0, explain: 'The state only has |00⟩ and |11⟩ terms — results always match.' }
      ]
    },

    // -------- INTERMEDIATE --------
    {
      id: 'quantum-gates', category: 'intermediate', title: 'Quantum Gates', icon: '⊓', color: '#8b5cf6',
      duration: '8 min', summary: 'The building blocks — unitary operations on qubits.',
      intro: 'Quantum gates are unitary matrices that rotate the state on the Bloch sphere. Since they are unitary, they are always reversible and preserve normalization.',
      concepts: [
        { title: 'Unitary', desc: 'U†U = I. Gates are invertible, so you can "undo" any gate.' },
        { title: 'Single-qubit gates', desc: 'H, X, Y, Z, S, T act on one qubit.' },
        { title: 'Two-qubit gates', desc: 'CNOT, SWAP, and controlled rotations connect qubits.' }
      ],
      example: 'X = [[0,1],[1,0]], Z = [[1,0],[0,-1]], H = 1/√2 [[1,1],[1,-1]].',
      steps: [
        { title: 'Gate = matrix', text: 'Multiply the state vector by the gate matrix.' },
        { title: 'Apply in order', text: 'Circuit order = matrix multiplication order.' },
        { title: 'Reversible', text: 'The inverse matrix un-applies any gate.' },
        { title: 'Composition', text: 'A circuit is just a large unitary operator.' }
      ],
      practice: [
        { q: 'Which property makes quantum gates reversible?', options: ['Hermitian', 'Unitary', 'Diagonal', 'Symmetric'], answer: 1, explain: 'Unitary matrices (U†U=I) are always invertible.' }
      ]
    },
    {
      id: 'hadamard', category: 'intermediate', title: 'Hadamard Gate', icon: 'H', color: '#38bdf8',
      duration: '6 min', summary: 'The gate that creates equal superposition.',
      intro: 'The Hadamard gate is the single most-used gate: it maps |0⟩ to |+⟩ and |1⟩ to |−⟩.',
      concepts: [
        { title: 'Matrix', desc: 'H = 1/√2 [[1,1],[1,-1]].' },
        { title: 'H|0⟩=|+⟩', desc: 'Equal superposition of |0⟩ and |1⟩.' },
        { title: 'H|1⟩=|−⟩', desc: 'Equal superposition but |1⟩ has a −1 phase.' },
        { title: 'H²=I', desc: 'Applying H twice returns to the starting state.' }
      ],
      example: 'H|0⟩ = (|0⟩+|1⟩)/√2 → 50% each when measured.',
      steps: [
        { title: 'Start |0⟩', text: 'Definite state.' },
        { title: 'Apply H', text: 'Becomes (|0⟩+|1⟩)/√2.' },
        { title: 'Amplitudes equal', text: '1/√2 for each basis state.' },
        { title: 'Measure', text: '50/50 distribution.' }
      ],
      practice: [
        { q: 'What is H|1⟩?', options: ['|0⟩', '|1⟩', '(|0⟩-|1⟩)/√2', '(|0⟩+|1⟩)/√2'], answer: 2, explain: 'H|1⟩ = (|0⟩ − |1⟩)/√2, the |−⟩ state.' }
      ]
    },
    {
      id: 'pauli-x', category: 'intermediate', title: 'Pauli-X Gate', icon: 'X', color: '#fb7185',
      duration: '5 min', summary: 'The quantum NOT gate that flips |0⟩↔|1⟩.',
      intro: 'Pauli-X is a bit flip. It maps |0⟩→|1⟩ and |1⟩→|0⟩, exactly like a classical NOT gate.',
      concepts: [
        { title: 'Matrix', desc: 'X = [[0,1],[1,0]].' },
        { title: 'Bit flip', desc: '|0⟩↔|1⟩.' },
        { title: 'Geometric', desc: '180° rotation about the x-axis of the Bloch sphere.' }
      ],
      example: 'X|0⟩ = |1⟩. Apply X twice → back to |0⟩.',
      steps: [
        { title: 'Start |0⟩', text: 'Definite state.' },
        { title: 'Apply X', text: 'State becomes |1⟩.' },
        { title: 'Deterministic', text: 'No probability — always flips.' }
      ],
      practice: [
        { q: 'X|1⟩ = ?', options: ['|0⟩', '|1⟩', '|+⟩', 'H'], answer: 0, explain: 'X flips |1⟩ back to |0⟩.' }
      ]
    },
    {
      id: 'pauli-y', category: 'intermediate', title: 'Pauli-Y Gate', icon: 'Y', color: '#f472b6',
      duration: '5 min', summary: 'A flip with a phase — the "bit + phase flip".',
      intro: 'Pauli-Y flips the state and applies a phase i, mapping |0⟩→i|1⟩ and |1⟩→-i|0⟩.',
      concepts: [
        { title: 'Matrix', desc: 'Y = [[0,-i],[i,0]].' },
        { title: 'Bit+phase flip', desc: 'Combines the action of X and Z.' },
        { title: 'Imaginary amps', desc: 'Introduces phase factor i into amplitudes.' }
      ],
      example: 'Y|0⟩ = i|1⟩, Y|1⟩ = −i|0⟩.',
      steps: [
        { title: 'Start |0⟩', text: 'Definite state.' },
        { title: 'Apply Y', text: 'Becomes i|1⟩.' },
        { title: 'Measure', text: 'i²=1, so probability of |1⟩ is 1.' }
      ],
      practice: [
        { q: 'What is Y|0⟩?', options: ['|0⟩', '|1⟩', 'i|1⟩', '|+⟩'], answer: 2, explain: 'Y|0⟩ = i|1⟩.' }
      ]
    },
    {
      id: 'pauli-z', category: 'intermediate', title: 'Pauli-Z Gate', icon: 'Z', color: '#a78bfa',
      duration: '5 min', summary: 'A pure phase flip on |1⟩.',
      intro: 'Pauli-Z leaves |0⟩ unchanged and flips the sign of |1⟩. It is a phase flip, fundamental for interference.',
      concepts: [
        { title: 'Matrix', desc: 'Z = [[1,0],[0,-1]].' },
        { title: 'Phase flip', desc: '|0⟩→|0⟩, |1⟩→-|1⟩.' },
        { title: 'Global vs relative phase', desc: 'A global phase is unobservable; Z adds a relative phase.' }
      ],
      example: 'Z|1⟩ = -|1⟩, Z|0⟩ = |0⟩.',
      steps: [
        { title: 'Start |1⟩', text: 'Definite state.' },
        { title: 'Apply Z', text: 'Becomes -|1⟩.' },
        { title: 'Measure', text: '|-1|²=1, so still measures |1⟩ (phase unobservable here).' }
      ],
      practice: [
        { q: 'Z|1⟩ = ?', options: ['|1⟩', '-|1⟩', '|0⟩', 'i|1⟩'], answer: 1, explain: 'Z flips the sign of the |1⟩ amplitude.' }
      ]
    },
    {
      id: 'cnot', category: 'intermediate', title: 'CNOT Gate', icon: '⊕', color: '#fbbf24',
      duration: '7 min', summary: 'The control–target gate behind entanglement.',
      intro: 'The controlled-NOT (CNOT) acts on two qubits: a control and a target. If the control is |1⟩, the target flips; otherwise nothing changes.',
      concepts: [
        { title: 'Definition', desc: 'Control unchanged; target XOR gate applied to control value.' },
        { title: 'Entanglement', desc: 'CNOT with a superposition control produces entanglement.' },
        { title: 'Universality', desc: 'CNOT + single-qubit gates form a universal gate set.' }
      ],
      example: 'CNOT|00⟩=|00⟩, CNOT|11⟩=|10⟩, CNOT|+0⟩ = (|00⟩+|11⟩)/√2 (Bell).',
      steps: [
        { title: 'Set control & target', text: 'Pick two distinct qubits.' },
        { title: 'Control is 1?', text: 'Only then is the target flipped.' },
        { title: 'Entangle', text: 'With superposition control, creates correlation.' }
      ],
      practice: [
        { q: 'CNOT|10⟩ = ? (control q0, target q1)', options: ['|10⟩', '|11⟩', '|00⟩', '|01⟩'], answer: 1, explain: 'Control is 1, so target flips: |10⟩→|11⟩.' }
      ]
    },
    {
      id: 'quantum-circuits', category: 'intermediate', title: 'Quantum Circuits', icon: '⊞', color: '#22d3a7',
      duration: '8 min', summary: 'Arranging gates in sequence on wires.',
      intro: 'A quantum circuit is a sequence of gates applied to a set of qubits. Full functionality lives in the Circuit Builder — try it!',
      concepts: [
        { title: 'Wires', desc: 'Each horizontal line is a qubit over time.' },
        { title: 'Gates', desc: 'Boxes/gates are applied left to right.' },
        { title: 'Measurables', desc: 'Classical registers collect measurement bits.' }
      ],
      example: 'H(q0); CNOT(q0,q1) is the Bell circuit.',
      steps: [
        { title: 'Choose qubits', text: 'Decide how many wires.' },
        { title: 'Add gates', text: 'Click gates, pick target/control.' },
        { title: 'Run', text: 'Simulate to get a probability histogram.' }
      ],
      practice: [
        { q: 'In circuit notation, order of gates reads…', options: ['Right to left', 'Left to right', 'Top to bottom', 'Random'], answer: 1, explain: 'Gates apply left-to-right in execution order.' }
      ]
    },

    // -------- ADVANCED --------
    {
      id: 'quantum-algorithms', category: 'advanced', title: 'Quantum Algorithms', icon: '⚛', color: '#ec6ad2',
      duration: '10 min', summary: 'How superposition + interference speed up computation.',
      intro: 'Quantum algorithms combine superposition, interference, and entanglement to solve problems faster than classical counterparts. The Algorithm Lab lets you run them.',
      concepts: [
        { title: 'Superposition', desc: 'Prepare many states at once.' },
        { title: 'Interference', desc: 'Amplitudes reinforce or cancel to highlight the answer.' },
        { title: 'Speedups', desc: 'Exponential (Shor) and quadratic (Grover) advantages.' }
      ],
      example: 'Grover finds a marked item with O(√N) queries vs O(N) classically.',
      steps: [
        { title: 'Prepare uniform superposition', text: 'Apply H to all qubits.' },
        { title: 'Oracle', text: 'Flip the sign of the target amplitude.' },
        { title: 'Diffusion', text: 'Amplify the target, suppress the rest.' },
        { title: 'Measure', text: 'High probability of the answer.' }
      ],
      practice: [
        { q: 'Which "resource" makes quantum speedups possible?', options: ['Classical caching', 'Superposition & interference', 'More clock speed', 'Parallel threads'], answer: 1, explain: 'Quantum algorithms exploit superposition and interference to explore/amplify solutions.' }
      ]
    },
    {
      id: 'deutsch-jozsa', category: 'advanced', title: 'Deutsch–Jozsa Algorithm', icon: '⌘', color: '#8b5cf6',
      duration: '10 min', summary: 'Decide constant vs balanced function in one query.',
      intro: 'The Deutsch–Jozsa algorithm determines whether a hidden boolean function is constant or balanced using a single query — something a classical computer may need many queries to do.',
      concepts: [
        { title: 'Problem', desc: 'f maps {0,1}^n → {0,1}, promised constant or balanced.' },
        { title: 'Solution', desc: 'One query decides it, with certainty.' },
        { title: 'Oracle', desc: 'Phase (kicked back) encodes f in the amplitudes.' }
      ],
      example: 'Prepare all qubits in superposition, apply the oracle, then H gates — a balanced function yields |0…0⟩? no.',
      steps: [
        { title: 'Prepare |+…+⟩', text: 'H on every answer register.' },
        { title: 'Apply oracle', text: 'Flips phase if balanced term nonzero.' },
        { title: 'Inverse H', text: 'Interference collapses to the answer.' },
        { title: 'Measure', text: 'Constant → |0…0⟩; balanced → anything else.' }
      ],
      practice: [
        { q: 'Deutsch–Jozsa decides the function in how many queries?', options: ['0', '1', 'n', '2^n'], answer: 1, explain: 'It solves the problem in a single query (classically up to 2^(n-1)+1).' }
      ]
    },
    {
      id: 'grover', category: 'advanced', title: "Grover's Search Algorithm", icon: '⌕', color: '#22c9ff',
      duration: '11 min', summary: 'Search an unstructured database in O(√N) queries.',
      intro: "Grover's algorithm finds a marked item among N possibilities in O(√N) queries, a quadratic speedup over brute force.",
      concepts: [
        { title: 'Oracle', desc: 'Flips the sign of the target state.' },
        { title: 'Diffusion operator', desc: 'Amplifies the marked amplitude.' },
        { title: 'Repeat ~√N times', desc: 'Probability of the target approaches 1.' }
      ],
      example: 'With N=4, √N=2 iterations find the item with near-certainty.',
      steps: [
        { title: 'Uniform superposition', text: 'H on all qubits.' },
        { title: 'Oracle', text: 'Tag the target with −1 amplitude.' },
        { title: 'Diffusion', text: 'Inversion about the mean amplifies the target.' },
        { title: 'Repeat & measure', text: 'Target appears with high probability.' }
      ],
      practice: [
        { q: "Grover's quadratic speedup means complexity is…", options: ['O(N)', 'O(√N)', 'O(N²)', 'O(log N)'], answer: 1, explain: 'Grover requires O(√N) queries, a quadratic speedup.' }
      ]
    },
    {
      id: 'shor', category: 'advanced', title: "Shor's Algorithm", icon: '§', color: '#fbbf24',
      duration: '12 min', summary: 'Factoring integers exponentially faster than classical methods.',
      intro: "Shor's algorithm factors large integers in polynomial time using the Quantum Fourier Transform to find the period of a function, breaking RSA.",
      concepts: [
        { title: 'Reduction', desc: 'Factoring reduces to period-finding.' },
        { title: 'QFT', desc: 'Extracts the period via frequency analysis.' },
        { title: 'Classical steps', desc: 'Euclid gcd and continued fractions process the QFT result.' }
      ],
      example: 'Yield a factor via gcd(a^(r/2)±1, N).',
      steps: [
        { title: 'Modular exponentiation', text: 'Prepare superposition of powers of a.' },
        { title: 'QFT', text: 'Reveals the period r.' },
        { title: 'Read r', text: 'If r even and a^(r/2) not ≡ ±1, gcd gives a factor.' },
        { title: 'Repeat if needed', text: 'Quantum part is fast; the last step is classical.' }
      ],
      practice: [
        { q: "Shor's algorithm relies on which quantum transform?", options: ['Bell transform', 'Quantum Fourier Transform', 'Grover diffusion', 'CNOT'], answer: 1, explain: 'The QFT extracts the period that underpins factoring.' }
      ]
    },
    {
      id: 'qft', category: 'advanced', title: 'Quantum Fourier Transform', icon: '≀', color: '#34d399',
      duration: '10 min', summary: 'The basis-change transform at the heart of Shor, HHL, and more.',
      intro: 'The QFT maps the computational basis to the Fourier (frequency) basis. It is the quantum analogue of the classical Fast Fourier Transform, but exponentially compact.',
      concepts: [
        { title: 'Definition', desc: 'QFT|j⟩ = 1/√N Σ_k e^(2πijk/N)|k⟩.' },
        { title: 'Ladder structure', desc: 'Hadamards + controlled-phase (S/T/CZ) gates.' },
        { title: 'Applications', desc: 'Shor, phase estimation, HHL.' }
      ],
      example: 'QFT on 3 qubits uses H + controlled phases + SWAPs.',
      steps: [
        { title: 'Hadamards', text: 'Create superposition across all inputs.' },
        { title: 'Controlled phases', text: 'Encode phases proportional to j×k.' },
        { title: 'SWAP', text: 'Reverse the qubit order.' },
        { title: 'Read frequencies', text: 'Amplitudes now show frequency components.' }
      ],
      practice: [
        { q: 'The QFT is most similar to which classical algorithm?', options: ['Sorting', 'FFT', 'Hashing', 'BFS'], answer: 1, explain: 'QFT is the quantum analogue of the Fast Fourier Transform.' }
      ]
    },
    {
      id: 'teleportation', category: 'advanced', title: 'Quantum Teleportation', icon: '⇄', color: '#ec6ad2',
      duration: '11 min', summary: 'Move an unknown quantum state using entanglement.',
      intro: 'Quantum teleportation transports an unknown qubit from Alice to Bob using a shared Bell pair and two classical bits. The state is consumed on arrival, only using classical channels.',
      concepts: [
        { title: 'Shared Bell pair', desc: 'Alice and Bob each hold one qubit of an entangled pair.' },
        { title: 'Bell measurement', desc: 'Alice measures her two qubits, yielding 2 classical bits.' },
        { title: 'Correction', desc: 'Bob applies X/Z based on the bits to reconstruct the state.' }
      ],
      example: 'The unknown state is "disembodied" and rebuilt at Bob, destroyed at Alice.',
      steps: [
        { title: 'Share entanglement', text: 'Pre-share a Bell pair.' },
        { title: 'Bell measurement', text: 'Alice entangles and measures her qubit + one Bell half.' },
        { title: 'Send 2 bits', text: 'Classical bits tell Bob which correction to apply.' },
        { title: 'Reconstruct', text: 'Bob applies X/Z to recover the state.' }
      ],
      practice: [
        { q: 'What is transmitted through a classical channel in teleportation?', options: ['The qubit state', '2 classical bits', 'Entanglement', 'Nothing'], answer: 1, explain: 'Two classical bits tell Bob which correction gates to apply.' }
      ]
    }
  ];

  var QUIZZES = [
    {
      id: 'quiz-beginner', title: 'Qubits & Superposition', level: 'beginner', icon: '⊙', color: '#34d399',
      questions: [
        { q: 'What is a qubit?', options: ['A classical bit', 'A quantum two-level system', 'A logic gate', 'A binary counter'], answer: 1, explain: 'A qubit is a quantum two-level system that can be in superposition.' },
        { q: 'Which gate creates superposition?', options: ['X', 'Z', 'H', 'CNOT'], answer: 2, explain: 'The Hadamard gate H creates superposition.' },
        { q: 'P(measuring |1⟩) in (|0⟩+|1⟩)/√2?', options: ['0', '1', '0.5', '0.25'], answer: 2, explain: 'Each amplitude squared is 0.5, so P=0.5.' },
        { q: 'n qubits span how many basis states?', options: ['n', '2n', 'n²', '2^n'], answer: 3, explain: '2^n basis states.' },
        { q: 'What does measurement do?', options: ['Nothing', 'Creates entanglement', 'Collapses state to an outcome', 'Copies the qubit'], answer: 2, explain: 'Measurement collapses the state into a definite outcome.' }
      ]
    },
    {
      id: 'quiz-gates', title: 'Quantum Gates', level: 'intermediate', icon: '⊓', color: '#22c9ff',
      questions: [
        { q: 'Which gate is a bit flip (NOT)?', options: ['X', 'Z', 'H', 'S'], answer: 0, explain: 'Pauli-X flips |0⟩↔|1⟩.' },
        { q: 'H|1⟩ = ?', options: ['|0⟩', '(|0⟩-|1⟩)/√2', '|1⟩', 'i|0⟩'], answer: 1, explain: 'H|1⟩ = (|0⟩-|1⟩)/√2.' },
        { q: 'CNOT|10⟩ (control q0) = ?', options: ['|10⟩', '|11⟩', '|00⟩', '|01⟩'], answer: 1, explain: 'Control=1 flips target to |11⟩.' },
        { q: 'Quantum gates are…', options: ['Irreversible', 'Unitary', 'Random', 'Classical'], answer: 1, explain: 'Gates are unitary matrices (reversible).' },
        { q: 'What does Z do?', options: ['Flips bit', 'Phase flip on |1⟩', 'Creates superposition', 'Swaps qubits'], answer: 1, explain: 'Z maps |1⟩ to -|1⟩.' }
      ]
    },
    {
      id: 'quiz-algorithms', title: 'Quantum Algorithms', level: 'advanced', icon: '⚛', color: '#8b5cf6',
      questions: [
        { q: 'Which algorithm gives quadratic speedup?', options: ['Shor', 'Grover', 'Bell', 'QFT'], answer: 1, explain: 'Grover gives O(√N).' },
        { q: 'Shor factors using what?', options: ['Grover diffusion', 'QFT + period finding', 'Noise', 'Bell measurement'], answer: 1, explain: 'Shor reduces factoring to period finding via QFT.' },
        { q: 'Deutsch–Jozsa uses how many queries?', options: ['0', '1', 'n', '2^n'], answer: 1, explain: 'One query decides constant vs balanced.' },
        { q: 'Bell measurement is central to…', options: ['Teleportation', 'Sorting', 'The C compiler', 'Nothing'], answer: 0, explain: 'Teleportation uses a Bell measurement.' },
        { q: 'QFT is the quantum analogue of…?', options: ['Sorting', 'FFT', 'Hashing', 'Quicksort'], answer: 1, explain: 'QFT ≈ Fast Fourier Transform.' }
      ]
    }
  ];

  var ALGORITHMS = [
    {
      id: 'bell', name: 'Bell State', icon: '∞', color: '#22d3a7', qubits: 2,
      tagline: 'The simplest maximally entangled state.',
      intro: 'The Bell state (|00⟩+|11⟩)/√2 entangles two qubits so their measurements always match.',
      problem: 'Create a maximally entangled two-qubit state and verify correlated outcomes.',
      math: 'H = 1/√2 [[1,1],[1,-1]]; CNOT then gives (|00⟩+|11⟩)/√2.',
      circuit: 'H(q0) → CNOT(q0→q1)',
      steps: [
        'Apply H to q0 → equal superposition.',
        'CNOT(q0→q1) → |00⟩ and |11⟩ only.',
        'Measure → correlated 00/11 outcomes.'
      ],
      exampleIn: 'q0 = |0⟩, q1 = |0⟩',
      exampleOut: '00 or 11 (50% each) — never 01 or 10.',
      preset: 'bell'
    },
    {
      id: 'ghz', name: 'GHZ State', icon: '⌗', color: '#8b5cf6', qubits: 3,
      tagline: 'Entanglement extended to three qubits.',
      intro: 'The GHZ state (|000⟩+|111⟩)/√2 entangles three qubits into a single superlative state.',
      problem: 'Create a three-qubit entangled state where all qubits always match.',
      math: 'H(q0) then CNOT(q0→q1), CNOT(q0→q2) → (|000⟩+|111⟩)/√2.',
      circuit: 'H(q0) → CNOT(0→1) → CNOT(0→2)',
      steps: [
        'H(q0) → superposition.',
        'CNOT(0→1), CNOT(0→2) → copy onto q1, q2.',
        'Measure → all zeros or all ones.'
      ],
      exampleIn: 'q0,q1,q2 = |000⟩',
      exampleOut: '000 or 111 (50% each).',
      preset: 'ghz'
    },
    {
      id: 'deutsch-jozsa', name: 'Deutsch–Jozsa', icon: '⌘', color: '#ec6ad2', qubits: 3,
      tagline: 'Classify a function in one query.',
      intro: 'Decides whether a hidden boolean function is constant or balanced using a single quantum query.',
      problem: 'Given f: {0,1}ⁿ→{0,1} promised to be constant or balanced, decide which.',
      math: 'Prepare |+⟩ registers, apply oracle (phase kickback), inverse H, measure.',
      circuit: 'H(0),H(1),X(2),H(2) → oracle CXs → H(0),H(1)',
      steps: [
        'Put answer registers in |+⟩ superposition and oracle register in |−⟩.',
        'Apply the oracle (controlled-X) → phase kickback encodes f.',
        'Inverse H → interference reveals the answer.',
        'Measure → |0…0⟩ for constant, otherwise balanced.'
      ],
      exampleIn: 'Balanced oracle demo',
      exampleOut: 'Non-zero output → balanced.',
      preset: 'deutsch-jozsa'
    },
    {
      id: 'grover', name: "Grover's Search", icon: '⌕', color: '#22c9ff', qubits: 2,
      tagline: 'Quadratic speedup for unstructured search.',
      intro: "Finds a marked item among N possibilities in O(√N) queries.",
      problem: 'Search an unstructured set of N items for a single marked one with fewest queries.',
      math: 'Oracle flips target sign; diffusion inverts about the mean; repeat O(√N).',
      circuit: 'H(0),H(1) → oracle CX → H(1),Z(1) (diffusion)',
      steps: [
        'Uniform superposition via H.',
        'Oracle → −1 on the target amplitude.',
        'Diffusion → amplify target probability.',
        'Measure → the marked item with high probability.'
      ],
      exampleIn: 'N=4, target |11⟩',
      exampleOut: '|11⟩ appears with high probability.',
      preset: 'grover'
    },
    {
      id: 'qft', name: 'Quantum Fourier Transform', icon: '≀', color: '#34d399', qubits: 3,
      tagline: 'Basis change from position to frequency.',
      intro: 'The QFT maps computational basis states to the Fourier basis, the engine of Shor and phase estimation.',
      problem: 'Compute the discrete Fourier transform of a quantum state.',
      math: 'QFT|j⟩ = 1/√N Σ_k e^(2πijk/N)|k⟩.',
      circuit: 'H + controlled-phase ladder + SWAP',
      steps: [
        'Apply H to create superposition.',
        'Add controlled-phase gates encoding j·k.',
        'SWAP to reverse qubit order.',
        'Read frequency components from the amplitudes.'
      ],
      exampleIn: '3-qubit computational state',
      exampleOut: 'Complex amplitude distribution in the Fourier basis.',
      preset: 'qft'
    },
    {
      id: 'teleport', name: 'Teleportation', icon: '⇄', color: '#fbbf24', qubits: 3,
      tagline: 'Move a quantum state with entanglement.',
      intro: 'Transports an unknown qubit from Alice to Bob using a shared Bell pair and classical bits.',
      problem: 'Send an unknown quantum state from one place to another without transmitting the qubit itself.',
      math: 'Shared Bell pair + Bell measurement → 2 bits → X/Z corrections.',
      circuit: 'Bell(1,2), then Bell measurement + corrections',
      steps: [
        'Share a Bell pair between Alice and Bob.',
        'Alice performs a Bell measurement on her two qubits.',
        'Send 2 classical bits.',
        'Bob applies X/Z corrections → state reconstructed.'
      ],
      exampleIn: 'Unknown qubit on Alice’s side',
      exampleOut: 'State is rebuilt at Bob, consumed at Alice.',
      preset: 'teleport'
    }
  ];

  var ACHIEVEMENTS = [
    { id: 'first-lesson', name: 'Quantum Beginner', icon: '◉', desc: 'Complete your first lesson.', metric: 'lessons', threshold: 1 },
    { id: 'lesson-5', name: 'Superposition Scholar', icon: '≋', desc: 'Complete 5 lessons.', metric: 'lessons', threshold: 5 },
    { id: 'lessons-10', name: 'Circuit Builder', icon: '⊞', desc: 'Complete 10 lessons.', metric: 'lessons', threshold: 10 },
    { id: 'quiz-pass', name: 'Quiz Master', icon: '✓', desc: 'Score ≥ 80% on a quiz.', metric: 'bestScore', threshold: 80 },
    { id: 'algorithm', name: 'Algorithm Explorer', icon: '⚛', desc: 'Run your first algorithm.', metric: 'algorithms', threshold: 1 },
    { id: 'algorithm-3', name: 'Algorithm Architect', icon: '⌘', desc: 'Run 3 different algorithms.', metric: 'algorithms', threshold: 3 },
    { id: 'circuit', name: 'Quantum Expert', icon: '○', desc: 'Build 5 custom circuits.', metric: 'circuits', threshold: 5 },
    { id: 'streak-3', name: 'Consistent Learner', icon: '🔥', desc: 'Reach a 3-day streak.', metric: 'streak', threshold: 3 }
  ];

  var TUTOR_SUGGESTIONS = [
    'What is a qubit?',
    'Explain superposition simply.',
    'How does the Hadamard gate work?',
    'Explain entanglement.',
    'How does Grover\u2019s algorithm work?',
    'What is a CNOT gate?',
    'Explain the Bloch sphere.',
    'What is quantum teleportation?'
  ];

  var TUTOR_ANSWERS = {
    qubit: 'A qubit is the quantum analogue of a bit. Unlike a bit, which is strictly 0 or 1, a qubit is a two-level quantum system written α|0⟩ + β|1⟩. When you measure it, you see 0 or 1 with probabilities |α|² and |β|².',
    superposition: 'Superposition means a qubit holds a weighted combination of |0⟩ and |1⟩ at once, like a coin spinning — but it is a genuine quantum state, not a hidden coin. The Hadamard gate creates an equal 50/50 superposition (|0⟩+|1⟩)/√2.',
    hadamard: 'The Hadamard gate H = 1/√2[[1,1],[1,-1]]. It sends |0⟩→|+⟩=(|0⟩+|1⟩)/√2 and |1⟩→|−⟩=(|0⟩-|1⟩)/√2, giving equal superposition. Apply it twice and you get back the original state (H²=I).',
    entanglement: 'Entanglement links qubits so their measurement outcomes are correlated in a way classical systems cannot replicate. The Bell state (|00⟩+|11⟩)/√2 always yields matching results. It powers teleportation and superdense coding.',
    grover: "Grover's algorithm searches an unstructured list in O(√N) queries. It prepares an equal superposition, uses an oracle to flip the target's sign, then a diffusion operator to amplify the target's amplitude. Repeating ~√N times makes the answer almost certain.",
    cnot: 'The CNOT gate acts on a control and a target qubit. If the control is |1⟩, it flips the target; otherwise it does nothing. Applied to a superposition control, it creates entanglement.',
    bloch: 'The Bloch sphere is a unit sphere on which every pure state of a single qubit sits. North pole is |0⟩, south is |1⟩; the equator holds equal superpositions like |+⟩ and |−⟩. Rotations by gates move the state around the sphere.',
    teleport: 'Quantum teleportation moves an unknown qubit using a shared Bell pair and 2 classical bits, without transmitting the state itself. It relies on entanglement, then the receiver applies X/Z corrections based on a Bell measurement.'
  };

  global.CATEGORY_META = CATEGORY_META;
  global.LESSONS = LESSONS;
  global.QUIZZES = QUIZZES;
  global.ALGORITHMS = ALGORITHMS;
  global.ACHIEVEMENTS = ACHIEVEMENTS;
  global.TUTOR_SUGGESTIONS = TUTOR_SUGGESTIONS;
  global.TUTOR_ANSWERS = TUTOR_ANSWERS;
})(window);
