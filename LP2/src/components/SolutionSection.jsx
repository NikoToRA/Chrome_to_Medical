import { motion } from 'framer-motion'
import { CTA_URL } from '../utils/constants'
import './SolutionSection.css'

function SolutionSection() {
    return (
        <section className="solution-section">
            <div className="section-container">
                <motion.h2
                    className="solution-title"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    その悩み、<span className="highlight">Karte AI</span>で解決！
                </motion.h2>

                <motion.div
                    className="solution-content"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="solution-image-wrapper">
                        <img
                            src="/Hero3.png"
                            alt="Karte AI+ 画面イメージ"
                            className="solution-image"
                        />
                    </div>

                    <div className="solution-text">
                        <h3 className="solution-subtitle">
                            Karte AIは、今の電子カルテに<br />
                            そのまま入れられるサポートツール。
                        </h3>

                        <div className="solution-description">
                            <p>
                                業務効率化のためにAIを検討しているクリニックのために、
                                業界屈指の導入しやすさ＆低価格を実現。
                            </p>
                            <p>
                                今お使いの電子カルテそのままでOK。<br />
                                ワンクリックでさまざまな記録を助けてくれます。
                            </p>
                            <p>
                                Google Chromeの環境と、電子カルテ※があれば
                                <strong>5分でセッティング完了</strong>。
                            </p>
                            <p className="trial-note">
                                14日間の無料トライアル期間での解約も自由です。
                            </p>
                        </div>

                        <a href={CTA_URL} className="solution-cta-button">
                            導入方法・料金→
                        </a>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default SolutionSection
