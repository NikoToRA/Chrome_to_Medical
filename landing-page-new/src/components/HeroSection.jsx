import { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { motion } from 'framer-motion'
import { SwirlParticles } from './ThreeScene'
import { fadeIn, slideUp } from '../utils/animations'
import { SITE_TAGLINE, CTA_URL } from '../utils/constants'
import './HeroSection.css'

function HeroSection() {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)

        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return (
        <section className="hero-section">
            {/* Simple Three.js Background - Dark blue with swirling particles */}
            <div className="hero-canvas-container">
                <Canvas>
                    <Suspense fallback={null}>
                        <PerspectiveCamera makeDefault position={[0, 0, 8]} />

                        {/* Minimal lighting for particles */}
                        <ambientLight intensity={0.3} />

                        {/* Swirling particles only */}
                        <SwirlParticles count={isMobile ? 100 : 200} />
                    </Suspense>
                </Canvas>
            </div>

            {/* Main Content Grid */}
            <div className="container hero-grid-container">
                {/* Left Column: Text Content */}
                <motion.div
                    className="hero-text-column"
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                >


                    <motion.div className="hero-badge" variants={slideUp}>
                        <span>既存のクラウドカルテに、AIを簡単にプラス</span>
                    </motion.div>

                    <motion.h1
                        className="hero-title"
                        variants={slideUp}
                    >
                        <span className="text-pure-white">あなたのカルテに、</span><br />
                        <span className="gradient-text-logo">AIをプラス</span>
                    </motion.h1>

                    <motion.p
                        className="hero-subtitle"
                        variants={slideUp}
                    >
                        いつもの電子カルテ画面はそのまま。<br />
                        インストールするだけで、<br className="mobile-break" />
                        外来診療を劇的にアシスト。
                    </motion.p>

                    <motion.p
                        className="hero-description"
                        variants={slideUp}
                    >
                        4つのAIエージェント（SOAP、紹介状、診療サポート、翻訳）と<br />
                        定型文システムで、カルテ記録時間を<strong>1日2時間削減</strong>
                    </motion.p>

                    {/* Single CTA Button - 14-day free trial */}
                    <motion.div
                        className="hero-cta-single"
                        variants={slideUp}
                    >
                        <a href={CTA_URL} className="btn btn-primary btn-lg btn-trial">
                            <span className="btn-text">
                                <span className="btn-main">14日間無料でお試し</span>
                            </span>
                            <span className="cta-arrow">→</span>
                        </a>
                    </motion.div>

                    <motion.p className="cta-note" variants={slideUp}>
                        無料期間中はいつでもキャンセル可能 • システム変更不要 • 即日利用開始
                    </motion.p>

                </motion.div>

                {/* Right Column: Hero Image */}
                <motion.div
                    className="hero-image-column"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <div className="hero-image-container">
                        <img
                            src="/hero-image.jpeg"
                            alt="医師とAIエージェント"
                            className="hero-image-real"
                        />
                    </div>

                    <motion.div
                        className="hero-stats-compact"
                        variants={slideUp}
                    >
                        <div className="stat-item-compact">
                            <div className="stat-number-compact">2時間/日</div>
                            <div className="stat-label-compact">削減時間</div>
                        </div>
                        <div className="stat-divider-compact"></div>
                        <div className="stat-item-compact">
                            <div className="stat-number-compact">730時間/年</div>
                            <div className="stat-label-compact">自由時間</div>
                        </div>
                        <div className="stat-divider-compact"></div>
                        <div className="stat-item-compact">
                            <div className="stat-number-compact">4つ</div>
                            <div className="stat-label-compact">AIエージェント</div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                className="scroll-indicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 10, 0] }}
                transition={{
                    opacity: { delay: 1, duration: 0.5 },
                    y: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
                }}
            >
                <div className="scroll-arrow">↓</div>
                <span>スクロールして詳細を見る</span>
            </motion.div>
        </section>
    )
}

export default HeroSection
