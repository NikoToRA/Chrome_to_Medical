import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { CTA_URL } from '../utils/constants'
import './HeroSection.css'

function HeroSection() {
    const containerRef = useRef(null)
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    })

    return (
        <section className="hero-refactored-section" ref={containerRef}>
            <div className="hero-flex-container">
                {/* Top Band: Main Copy */}
                <div className="hero-header-area">
                    <motion.div
                        className="hero-suspended-notice"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        ただいま新規受付停止中
                    </motion.div>
                    <motion.h1
                        className="hero-title-refactored"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        あなたの診療に<br className="mobile-only" />
                        <span className="text-highlight-refactored">AIをプラス</span>
                    </motion.h1>
                </div>

                {/* Middle: Hero Image */}
                <div className="hero-image-area">
                    <img
                        src="/hero-v3.png"
                        alt="Medical AI Assistant"
                        className="hero-img-refactored"
                    />
                </div>

                {/* Bottom Band: Sub Copy & CTA */}
                <div className="hero-footer-area">
                    <motion.p
                        className="hero-subtitle-refactored"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    >
                        記録も検索もAIに<br />
                        あなたは、診療だけに向き合える
                    </motion.p>

                    <motion.div
                        className="hero-cta-refactored"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                    >
                        <a href={CTA_URL} className="btn-refactored-primary">
                            診療に専念できる未来へ
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </a>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

export default HeroSection
