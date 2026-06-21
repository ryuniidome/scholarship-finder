let scholarships = [];
let currentStep = 0;
let answers = {};

const questions = [
  {
    id: 'degree',
    question: '現在の学年・学位を教えてください',
    options: [
      { value: 'middle_school', label: '中学生' },
      { value: 'high_school', label: '高校生' },
      { value: 'undergraduate', label: '大学生（学部）' },
      { value: 'masters', label: '修士課程（大学院）' },
      { value: 'phd', label: '博士課程（大学院）' },
      { value: 'other', label: 'その他（社会人・研究生など）' }
    ]
  },
  {
    id: 'region',
    question: '希望する留学先の地域はどこですか？',
    options: [
      { value: 'north_america', label: '北米（アメリカ・カナダ）' },
      { value: 'europe', label: 'ヨーロッパ' },
      { value: 'asia', label: 'アジア' },
      { value: 'oceania', label: 'オセアニア（オーストラリア・NZなど）' },
      { value: 'other', label: 'その他の地域' },
      { value: 'any', label: 'こだわらない' }
    ]
  },
  {
    id: 'purpose',
    question: '留学の主な目的は何ですか？',
    options: [
      { value: 'language', label: '語学研修・文化体験' },
      { value: 'degree', label: '学位取得（修士・博士など）' },
      { value: 'research', label: '研究活動' },
      { value: 'career', label: 'インターンシップ・キャリア形成' }
    ]
  },
  {
    id: 'duration',
    question: '希望する留学期間はどのくらいですか？',
    options: [
      { value: 'less_1', label: '1ヶ月未満' },
      { value: '1_3', label: '1〜3ヶ月' },
      { value: '3_6', label: '3〜6ヶ月' },
      { value: '6_12', label: '6ヶ月〜1年' },
      { value: 'over_12', label: '1年以上' }
    ]
  },
  {
    id: 'nationality',
    question: '国籍を教えてください',
    options: [
      { value: 'japanese', label: '日本国籍' },
      { value: 'permanent_resident', label: '永住者・特別永住者' },
      { value: 'other', label: 'その他' }
    ]
  },
  {
    id: 'field',
    question: '専攻・研究分野を教えてください',
    options: [
      { value: 'stem', label: '理工学系' },
      { value: 'humanities_social', label: '人文・社会科学系' },
      { value: 'medical', label: '医療・生命科学系' },
      { value: 'arts', label: '芸術・デザイン系' },
      { value: 'any', label: '特定の分野はない / どれでも構わない' }
    ]
  }
];

// 留学期間の選択肢を代表的な月数に変換
const durationToMonths = {
  'less_1': 0.5,
  '1_3': 2,
  '3_6': 4.5,
  '6_12': 9,
  'over_12': 18
};

// 中学・高校生向けの専攻分野は「any」として扱う
function normalizeField(answers) {
  if (answers.degree === 'middle_school' || answers.degree === 'high_school') {
    return 'any';
  }
  return answers.field;
}

// 奨学金データを読み込む
fetch('./data/scholarships.json')
  .then(res => res.json())
  .then(data => {
    scholarships = data.scholarships;
    renderQuestion();
  })
  .catch(() => {
    document.getElementById('question-card').innerHTML =
      '<p style="color:red">データの読み込みに失敗しました。ローカルサーバー経由でお試しください。</p>';
  });

function renderQuestion() {
  const q = questions[currentStep];
  const total = questions.length;

  // プログレスバー更新
  document.getElementById('progress-fill').style.width = `${(currentStep / total) * 100}%`;
  document.getElementById('step-label').textContent = `質問 ${currentStep + 1} / ${total}`;

  // ボタン表示制御
  const backBtn = document.getElementById('btn-back');
  backBtn.style.display = currentStep > 0 ? 'inline-block' : 'none';

  const nextBtn = document.getElementById('btn-next');
  nextBtn.textContent = currentStep === total - 1 ? '結果を見る →' : '次へ →';
  nextBtn.disabled = !answers[q.id];

  // 質問と選択肢をレンダリング
  const card = document.getElementById('question-card');
  card.innerHTML = `
    <h2>${q.question}</h2>
    <div class="options">
      ${q.options.map(opt => `
        <label class="option ${answers[q.id] === opt.value ? 'selected' : ''}">
          <input type="radio" name="answer" value="${opt.value}" ${answers[q.id] === opt.value ? 'checked' : ''}>
          <span>${opt.label}</span>
        </label>
      `).join('')}
    </div>
  `;

  // 選択時のイベント
  card.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', e => {
      answers[q.id] = e.target.value;
      card.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      e.target.closest('.option').classList.add('selected');
      document.getElementById('btn-next').disabled = false;
    });
  });
}

function nextStep() {
  if (!answers[questions[currentStep].id]) return;

  if (currentStep < questions.length - 1) {
    currentStep++;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    showResults();
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function matchesScholarship(s) {
  const e = s.eligibility;
  const a = answers;
  const months = durationToMonths[a.duration];

  // 学位レベル（高校生は大学生向け奨学金も表示）
  const effectiveDegrees = a.degree === 'high_school'
    ? ['high_school', 'undergraduate']
    : a.degree === 'middle_school'
    ? ['middle_school', 'high_school']
    : [a.degree];
  if (!e.degree_levels.includes('any') && !effectiveDegrees.some(d => e.degree_levels.includes(d))) return false;

  // 地域（ユーザーが「こだわらない」の場合は全てマッチ）
  if (a.region !== 'any') {
    if (!e.regions.includes('any') && !e.regions.includes(a.region)) return false;
  }

  // 目的
  if (!e.purposes.includes('any') && !e.purposes.includes(a.purpose)) return false;

  // 期間
  if (e.duration_months.min !== null && months < e.duration_months.min) return false;
  if (e.duration_months.max !== null && months > e.duration_months.max) return false;

  // 国籍
  if (!e.nationality.includes('any') && !e.nationality.includes(a.nationality)) return false;

  // 分野（ユーザーが「問わない」または中学・高校生の場合は全てマッチ）
  const effectiveField = normalizeField(a);
  if (effectiveField !== 'any') {
    if (!e.fields.includes('any') && !e.fields.includes(effectiveField)) return false;
  }

  return true;
}

function showResults() {
  document.getElementById('quiz-section').style.display = 'none';
  document.getElementById('result-section').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const matched = scholarships.filter(matchesScholarship);

  document.getElementById('result-summary').textContent =
    matched.length > 0
      ? `${matched.length}件の奨学金が見つかりました`
      : '条件に合う奨学金が見つかりませんでした。条件を変えて再度お試しください。';

  const list = document.getElementById('scholarship-list');

  if (matched.length === 0) {
    list.innerHTML = '<div class="no-result">条件を変えて再度お試しください。</div>';
    return;
  }

  list.innerHTML = matched.map(s => `
    <div class="scholarship-card">
      <div class="scholarship-header">
        <span class="category-badge category-${s.category}">${categoryLabel(s.category)}</span>
        <h3>${s.name}</h3>
        <p class="organization">${s.organization}</p>
      </div>
      <div class="scholarship-body">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">給付額</span>
            <span>${s.amount}</span>
          </div>
          <div class="detail-item">
            <span class="label">留学期間</span>
            <span>${s.duration}</span>
          </div>
          <div class="detail-item">
            <span class="label">締切</span>
            <span>${s.deadline}</span>
          </div>
        </div>
        <p class="description">${s.description}</p>
        ${s.language_requirement ? `<p class="meta-item"><span class="meta-label">英語要件：</span>${s.language_requirement}</p>` : ''}
        ${s.num_recipients ? `<p class="meta-item"><span class="meta-label">募集人数：</span>${s.num_recipients}</p>` : ''}
        ${s.combinable ? `<p class="meta-item"><span class="meta-label">他奨学金との併給：</span>${s.combinable}</p>` : ''}
        ${s.post_obligation && s.post_obligation !== 'なし' ? `<p class="notes">📋 卒業後の義務：${s.post_obligation}</p>` : ''}
        ${s.notes ? `<p class="notes">⚠️ ${s.notes}</p>` : ''}
        <a href="${s.url}" target="_blank" rel="noopener" class="btn-link">詳細・公式サイトを見る →</a>
      </div>
    </div>
  `).join('');
}

function categoryLabel(cat) {
  return { government: '政府・公的機関', private: '民間財団', destination: '留学先国・機関' }[cat] || cat;
}

function resetQuiz() {
  currentStep = 0;
  answers = {};
  document.getElementById('quiz-section').style.display = 'block';
  document.getElementById('result-section').style.display = 'none';
  renderQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
