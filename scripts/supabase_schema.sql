-- ── Tables ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS politicians (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  party      TEXT NOT NULL,
  role       TEXT NOT NULL,
  country    TEXT NOT NULL,   -- 'kr' | 'us'
  lang       TEXT NOT NULL,   -- 'ko' | 'en'
  leaning    SMALLINT NOT NULL DEFAULT 0,  -- -1=진보/progressive, 0=중도, 1=보수/conservative
  photo_url  TEXT,
  bio        TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issues (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  summary    TEXT,
  category   TEXT NOT NULL,
  lang       TEXT NOT NULL,
  leaning    SMALLINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed: Politicians ──────────────────────────────────

INSERT INTO politicians (id, name, party, role, country, lang, leaning) VALUES
  ('yoon-sy',  '윤석열',        '국민의힘',       '전 대통령',        'kr', 'ko',  1),
  ('moon-ji',  '문재인',        '더불어민주당',    '전 대통령',        'kr', 'ko', -1),
  ('lee-jm',   '이재명',        '더불어민주당',    '대표',             'kr', 'ko', -1),
  ('cho-guk',  '조국',          '조국혁신당',      '대표',             'kr', 'ko', -1),
  ('trump',    'Donald Trump',  'Republican',     'President',        'us', 'en',  1),
  ('biden',    'Joe Biden',     'Democrat',       'Former President', 'us', 'en', -1),
  ('harris',   'Kamala Harris', 'Democrat',       'Former VP',        'us', 'en', -1),
  ('sanders',  'Bernie Sanders','Democrat',       'Senator',          'us', 'en', -1)
ON CONFLICT (id) DO NOTHING;

-- ── Seed: Issues ──────────────────────────────────────

INSERT INTO issues (id, title, summary, category, lang, leaning, expires_at) VALUES
  ('e1', 'AI-generated content mandatory labeling',
   'Should governments legally require watermarks or labels on all AI-generated images and text to prevent misinformation?',
   'Tech & AI', 'en', 0, NOW() + INTERVAL '30 days'),

  ('e2', 'US 4-day work week legislation',
   'Should Congress pass legislation mandating companies to pilot a 4-day work week without reducing employee pay?',
   'Labor & Economy', 'en', -1, NOW() + INTERVAL '30 days'),

  ('e3', 'Crypto gains taxed as regular income',
   'Should Bitcoin, Ethereum, and NFT profits be taxed at the same rate as ordinary income rather than capital gains rates?',
   'Finance & Tax', 'en', -1, NOW() + INTERVAL '30 days'),

  ('e4', 'Nuclear plant 10-year life extensions',
   'Should aging nuclear power plants be granted 10-year operational extensions as a bridge to renewable energy targets?',
   'Energy & Climate', 'en', 1, NOW() + INTERVAL '30 days'),

  ('k1', 'AI 생성 콘텐츠 라벨 의무화',
   'AI가 생성한 이미지·텍스트에 워터마크 또는 라벨 표시를 법적으로 의무화해야 하는가?',
   '기술·AI', 'ko', 0, NOW() + INTERVAL '30 days'),

  ('k2', '주 4일 근무제 법제화',
   '기업들이 생산성 저하 없이 주 4일 근무제를 의무적으로 시범 도입해야 하는가?',
   '노동·경제', 'ko', -1, NOW() + INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;
