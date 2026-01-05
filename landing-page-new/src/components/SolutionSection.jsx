import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import './SolutionSection.css'

function SolutionSection() {
    return (
        <section className="solution-section section-lg">
            <div className="container">
                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="section-title">
                        その悩み、解決します。<br />
                        <span className="highlight-blue">Karte AI+</span>が、あなたのカルテ作成をサポート
                    </h2>
                    <p className="section-subtitle">
                        Chromeブラウザで動作するクラウド型カルテに、<br />
                        拡張機能をインストールするだけ。
                    </p>
                </motion.div>

                <motion.div
                    className="before-after-container"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <div className="before-after-image-wrapper">
                        <img
                            src="/before-after.png"
                            alt="医師のビフォアフター：タイピングの苦痛からAIエージェントによる一瞬の解決へ"
                            className="before-after-image"
                        />
                    </div>
                </motion.div>

                <div className="solution-steps">
                    <motion.div
                        className="step-card"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={slideUp}
                    >
                        <div className="step-number">01</div>
                        <div className="step-content">
                            <h3>導入は簡単</h3>
                            <p>Chrome拡張機能を入れるだけ。<br />今のカルテがそのまま使えます。</p>
                        </div>
                    </motion.div>

                    <motion.div
                        className="step-card"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={slideUp}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="step-number">02</div>
                        <div className="step-content">
                            <h3>操作は直感</h3>
                            <p>いつもの画面にボタンが増えるだけ。<br />ワンクリックで定型文を貼り付け。</p>
                        </div>
                    </motion.div>

                    <motion.div
                        className="step-card"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={slideUp}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="step-number">03</div>
                        <div className="step-content">
                            <h3>AIがサポート</h3>
                            <p>4つのエージェントが<br />あなたの診療をバックアップ。</p>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    className="solution-result"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <a href="/register" className="result-box">
                        <span className="result-label">RESULT</span>
                        <h3 className="result-text">たった月4980円で、<br className="mobile-break" />1日2時間を取り戻す</h3>
                        <p className="result-desc">空いた時間は、患者様との対話や、あなたのプライベートへ。</p>
                    </a>
                </motion.div>

                {/* Supported Emrs Section removed - moved to CompatibilitySection */}

            </div>
        </section>
    )
}

export default SolutionSection
