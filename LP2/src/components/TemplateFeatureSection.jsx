import { motion } from 'framer-motion'
import { slideUp } from '../utils/animations'
import './TemplateFeatureSection.css'

function TemplateFeatureSection() {
    const features = [
        {
            id: 'agent',
            label: '機能 01',
            name: 'AIエージェント',
            tagline: '渡して、完成。',
            description: 'カルテ内容をコピーするだけ。紹介状・要約・診断書をAIが自動作成。',
            video: '/images/usage/usage-agent.mp4',
            link: '/manuals/agents.html',
            linkText: '4種類標準搭載',
            benefits: ['紹介状', '要約', '診断書', '症例相談']
        },
        {
            id: 'template',
            label: '機能 02',
            name: '定型文',
            tagline: 'ワンクリックで貼付。',
            description: 'よく使う文章を登録しておけば、カルテへ瞬時に挿入。繰り返し入力から解放。',
            video: '/images/usage/usage_text.mp4',
            link: '/manuals/fixed_phrases.html',
            linkText: '詳しく見る',
            benefits: ['処方', '指導', '説明', '所見']
        }
    ]

    return (
        <section id="features" className="features-section section-lg">
            <div className="container">
                <motion.div
                    className="features-header"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <span className="features-eyebrow">FEATURES</span>
                    <h2 className="features-title">
                        あなたの電子カルテに、<br />
                        <span className="highlight-yellow">AIが付く。</span>
                    </h2>
                </motion.div>

                {/* Hero Demo - ワンクリックでAIエージェント */}
                <motion.div
                    className="features-hero-demo"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <div className="hero-demo-content">
                        <h3 className="hero-demo-title">
                            <span className="highlight-yellow">ワンクリック</span>で<br />
                            AIエージェントが起動
                        </h3>
                        <p className="hero-demo-description">
                            Chrome拡張機能をインストールするだけ。<br />
                            いつもの電子カルテ画面で、すぐに使える。
                        </p>
                    </div>
                    <div className="hero-demo-video">
                        <div className="hero-video-placeholder">
                            <span>デモ動画準備中</span>
                        </div>
                    </div>
                </motion.div>

                <div className="features-showcase">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.id}
                            className={`feature-row ${index % 2 === 1 ? 'reverse' : ''}`}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={slideUp}
                        >
                            <div className="feature-media">
                                <div className="feature-video-wrapper">
                                    <video
                                        src={feature.video}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        className="feature-video"
                                    />
                                </div>
                            </div>

                            <div className="feature-info">
                                <span className="feature-label">{feature.label}</span>
                                <h3 className="feature-name">{feature.name}</h3>
                                <p className="feature-tagline">{feature.tagline}</p>
                                <p className="feature-description">{feature.description}</p>

                                <div className="feature-benefits">
                                    {feature.benefits.map((benefit, i) => (
                                        <span key={i} className="benefit-tag">{benefit}</span>
                                    ))}
                                </div>

                                <a
                                    href={feature.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="feature-cta"
                                >
                                    {feature.linkText}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7"/>
                                    </svg>
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default TemplateFeatureSection
