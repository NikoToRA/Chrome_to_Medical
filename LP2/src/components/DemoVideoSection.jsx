import { motion } from 'framer-motion'
import './DemoVideoSection.css'

function DemoVideoSection() {
    return (
        <section className="demo-video-section">
            <div className="section-container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <p className="section-label">機能紹介</p>
                    <h2 className="section-title">
                        いつもの電子カルテを<br />
                        AIがサポート
                    </h2>
                </motion.div>

                <motion.div
                    className="feature-card-blue"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="feature-content-left">
                        <h3 className="feature-heading">
                            ワンクリックで<br />
                            AIエージェントが起動
                        </h3>
                        <p className="feature-description">
                            Chrome拡張機能をインストールするだけ。<br />
                            いつもの電子カルテ画面で、すぐに使える。
                        </p>
                    </div>
                    <div className="feature-video-placeholder">
                        <span className="placeholder-text">デモ動画準備中</span>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default DemoVideoSection
