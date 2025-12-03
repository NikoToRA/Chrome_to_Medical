import { motion } from 'framer-motion'
import { slideUp, fadeIn } from '../utils/animations'
import './SecuritySection.css'

function SecuritySection() {
    return (
        <section className="security-section section-lg">
            <div className="container">
                <div className="security-content">
                    <motion.div
                        className="security-text"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={slideUp}
                    >
                        <div className="security-badge">SECURITY</div>
                        <h2 className="security-title">
                            医療情報ガイドラインに準拠した、<br />
                            <span className="highlight-secure">堅牢なセキュリティ</span>
                        </h2>
                        <p className="security-description">
                            患者様の大切な個人情報を扱うため、Karte AI+はセキュリティを最優先に設計されています。
                            Microsoft Azureの堅牢な基盤の上で、安心・安全な環境を提供します。
                        </p>

                        <ul className="security-features">
                            <li className="security-item">
                                <span className="check-mark">🛡️</span>
                                <div>
                                    <strong>Microsoft Azure採用</strong>
                                    <p>世界最高水準のセキュリティを誇るクラウド基盤を利用。</p>
                                </div>
                            </li>
                            <li className="security-item">
                                <span className="check-mark">🔒</span>
                                <div>
                                    <strong>通信の暗号化</strong>
                                    <p>全てのデータ通信はSSL/TLSにより暗号化され、盗聴や改ざんを防ぎます。</p>
                                </div>
                            </li>
                            <li className="security-item">
                                <span className="check-mark">📑</span>
                                <div>
                                    <strong>3省2ガイドライン準拠</strong>
                                    <p>厚生労働省・総務省・経産省の医療情報セキュリティガイドラインに準拠。</p>
                                </div>
                            </li>
                        </ul>
                    </motion.div>

                    <motion.div
                        className="security-visual"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeIn}
                    >
                        <div className="shield-container">
                            <div className="azure-logo-placeholder">
                                <span className="azure-icon">☁️</span>
                                <span className="azure-text">Microsoft Azure</span>
                            </div>
                            <div className="shield-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div className="lock-animation"></div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

export default SecuritySection
