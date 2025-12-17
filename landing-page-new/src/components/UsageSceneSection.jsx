import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import { CTA_URL } from '../utils/constants'
import './UsageSceneSection.css'

function UsageSceneSection() {
    return (
        <section className="usage-scene-section section-lg">
            <div className="container">
                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="section-title">実際の利用シーン</h2>
                    <p className="section-subtitle">
                        驚くほどスムーズな操作感を、動画でご確認ください。
                    </p>
                </motion.div>

                <motion.div
                    className="usage-grid"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    {/* Column 1: Template Insertion */}
                    <motion.div className="usage-card" variants={staggerItem}>
                        <div className="video-container">
                            <video
                                src="/images/usage/usage_text.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="usage-video"
                            />
                            <div className="usage-overlay">
                                <div className="usage-overlay-text">スタンプのように<br />カルテを記載</div>
                            </div>
                        </div>
                        <div className="usage-content">
                            <h3>定型文の挿入</h3>
                            <p>
                                サイドパネルからワンクリックで、複雑な処方や指導文をカルテに貼り付け。
                                迷うことなく、一瞬で完了します。
                            </p>
                        </div>
                    </motion.div>

                    {/* Column 2: Agent Usage */}
                    <motion.div className="usage-card" variants={staggerItem}>
                        <div className="video-container">
                            <video
                                src="/images/usage/usage-agent.mp4"
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="usage-video"
                            />
                            <div className="usage-overlay">
                                <div className="usage-overlay-agent">紹介状作成エージェント</div>
                                <div className="usage-overlay-text">「紹介状を書いて」</div>
                            </div>
                        </div>
                        <div className="usage-content">
                            <h3>エージェントの使用</h3>
                            <p>
                                「紹介状を書いて」と指示するだけ。
                                AIエージェントがカルテ情報を読み取り、適切な下書きを自動生成します。
                            </p>
                        </div>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="usage-cta text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                    style={{ marginTop: 'var(--space-12)' }}
                >
                    <a href={CTA_URL} className="btn btn-primary btn-lg">
                        実際に試してみる
                    </a>
                </motion.div>
            </div>
        </section>
    )
}

export default UsageSceneSection
