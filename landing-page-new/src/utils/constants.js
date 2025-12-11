// Payment and pricing constants
export const PRICING = {
    monthly: 4980,
    trialDays: 14,
    currency: '¥',
    paymentMethods: ['クレジットカード', 'デビットカード'],
    instantPurchase: true
}

// Update CTA URL to support instant purchase
export const CTA_URL = '/register/'
export const PURCHASE_URL = '/purchase' // Direct purchase option
export const DEMO_URL = '/demo'
export const CONTACT_URL = 'mailto:support@wonder-drill.com'

// Site info
export const SITE_NAME = 'Karte AI+'
export const SITE_TAGLINE = 'あなたの診療にAIをプラス'

// Time Savings Calculations
export const DEFAULT_DAILY_HOURS_SAVED = 2
export const WORK_DAYS_PER_YEAR = 365
export const calculateYearlySavings = (dailyHours) => dailyHours * WORK_DAYS_PER_YEAR

// Features - 4 AI Agents + Templates + Compatibility
export const FEATURES = [
    {
        id: 'soap',
        title: 'SOAPエージェント',
        description: 'カルテ記録を簡略化。診療内容を自動的に構造化されたSOAP形式で記録します。',
        icon: '📋',
        benefits: ['記録時間50%削減', '構造化された記録', '検索性向上']
    },
    {
        id: 'referral',
        title: '紹介状エージェント',
        description: '診療記録から紹介状を自動作成。必要な情報を抽出し、適切な形式で文書化します。',
        icon: '📄',
        benefits: ['作成時間80%削減', '記載漏れ防止', '標準化された形式']
    },
    {
        id: 'consultation',
        title: '診療サポートエージェント',
        description: '診療中の疑問に即座に回答。最新の医学知識やガイドラインを参照できます。',
        icon: '💡',
        benefits: ['即座に回答', '信頼性の高い情報', '診療の質向上']
    },
    {
        id: 'translation',
        title: '翻訳エージェント',
        description: 'インバウンド患者対応に最適。カルテ内容を多言語に翻訳し、外国人患者とのコミュニケーションを円滑化します。',
        icon: '🌐',
        benefits: ['多言語対応', '医療用語の正確な翻訳', 'インバウンド対応']
    },
    {
        id: 'templates',
        title: '定型文システム',
        description: 'ボタンひとつで頻出する診断名や処方、説明文を入力。カスタマイズも自由自在。',
        icon: '⚡',
        benefits: ['ワンクリック入力', 'カスタマイズ可能', 'パターン化対応']
    },
    {
        id: 'compatibility',
        title: 'Chrome対応',
        description: '全てのChromeベースクラウドカルテに対応。既存のシステムをそのまま使えます。',
        icon: '🔧',
        benefits: ['導入が簡単', 'システム変更不要', '即日利用可能']
    }
]

// Testimonials with doctor silhouettes
export const TESTIMONIALS = [
    {
        id: 1,
        quote: 'こんな簡単にAIがカルテに使えるようになるとは驚きです',
        author: '内科クリニック 院長',
        specialty: '内科',
        role: '開業医',
        role: '開業医',
        rating: 5,
        timeSaved: '1日2.5時間削減',
        image: '/images/doctors/doctor-1.png'
    },
    {
        id: 2,
        quote: 'ボタンひとつで診断名やパターン化されたテキストが記録できる',
        author: '整形外科クリニック 医師',
        specialty: '整形外科',
        role: '勤務医',
        role: '勤務医',
        rating: 5,
        timeSaved: '1日1.5時間削減',
        image: '/images/doctors/doctor-2.png'
    },
    {
        id: 3,
        quote: 'タイピングすることがほぼなくなりました',
        author: '皮膚科クリニック 院長',
        specialty: '皮膚科',
        role: '開業医',
        role: '開業医',
        rating: 5,
        timeSaved: '1日3時間削減',
        image: '/images/doctors/doctor-3.png'
    }
]

// Workflow Steps
export const WORKFLOW_STEPS = [
    {
        step: 1,
        title: 'Chrome拡張機能をインストール',
        description: 'ワンクリックでインストール完了。設定も簡単です。',
        duration: '1分'
    },
    {
        step: 2,
        title: '定型文やAIエージェントを設定',
        description: 'よく使う文章やパターンを登録。AIエージェントの設定も直感的。',
        duration: '5分'
    },
    {
        step: 3,
        title: '診療中にボタンで入力',
        description: 'カルテ画面でボタンをクリックするだけ。キーボード操作は最小限。',
        duration: '即座'
    },
    {
        step: 4,
        title: '時間を取り戻す',
        description: '削減した時間を患者ケアや自己研鑽、プライベートに活用。',
        duration: '毎日'
    }
]

// Social Links
export const SOCIAL_LINKS = {
    twitter: '#',
    facebook: '#',
    linkedin: '#'
}

// Footer Links
export const FOOTER_LINKS = {
    company: [
        { label: '会社概要', href: 'https://wonder-drill.com/about#corp' },
        { label: 'お問い合わせ', href: '/contact' }
    ],
    legal: [
        { label: 'プライバシーポリシー', href: 'https://stkarteai1763705952.z11.web.core.windows.net/privacy' },
        { label: '利用規約', href: 'https://stkarteai1763705952.z11.web.core.windows.net/terms' },
        { label: '特定商取引法に基づく表記', href: '/legal' }
    ],
    support: [
        { label: '無料から始める', href: 'https://stkarteai1763705952.z11.web.core.windows.net/' },
        { label: 'ヘルプセンター', href: '/help' },
        { label: 'よくある質問', href: '/faq' },
        { label: 'お問い合わせ', href: '/contact' }
    ]
}

export const COMPANY_INFO = {
    name: 'Wonder Drill株式会社',
    representative: '代表取締役 医師 平山 傑',
    mission: '医療従事者が患者と向き合う時間を最大化する',
    description: '現役救急医が創業。医療現場の課題をテクノロジーで解決します。'
}
