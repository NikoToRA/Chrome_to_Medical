import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import './AgentFeatureSection.css'

function AgentFeatureSection() {
    return (
        <section className="agent-feature-section section-lg">
            <div className="container">
                <div className="feature-layout reverse">
                    <motion.div
                        className="feature-content"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={slideUp}
                    >
                        <div className="feature-badge orange">メイン機能 02</div>
                        <h2 className="feature-heading">
                            4つのエージェントが、<br />
                            あなたを<span className="highlight-orange">サポート</span>。
                        </h2>
                        <p className="feature-subheading">
                            専門特化したAIが、あなたの指示を待っています。<br />
                            自分でカスタマイズすることも可能です。
                        </p>

                        <motion.div
                            className="agent-grid"
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            <motion.div className="agent-card" variants={staggerItem}>
                                <div className="agent-icon">📋</div>
                                <h4>SOAP</h4>
                                <p>記録を構造化</p>
                            </motion.div>

                            <motion.div className="agent-card" variants={staggerItem}>
                                <div className="agent-icon">📄</div>
                                <h4>紹介状</h4>
                                <p>文書自動作成</p>
                            </motion.div>

                            <motion.div className="agent-card" variants={staggerItem}>
                                <div className="agent-icon">💡</div>
                                <h4>診療支援</h4>
                                <p>疑問に即答</p>
                            </motion.div>

                            <motion.div className="agent-card" variants={staggerItem}>
                                <div className="agent-icon">🌐</div>
                                <h4>翻訳</h4>
                                <p>多言語対応</p>
                            </motion.div>
                        </motion.div>

                        <div className="custom-note">
                            <span className="note-icon">🔧</span>
                            <p><strong>カスタマイズ可能:</strong> あなたの診療スタイルに合わせて、エージェントの振る舞いを調整できます。</p>
                        </div>
                    </motion.div>

                    <motion.div
                        className="feature-visual"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={slideUp}
                    >
                        <div className="agents-visual">
                            <div className="center-image-container">
                                <img
                                    src="/images/agents/Agent-center.jpg"
                                    alt="AI Agent Character"
                                    className="center-agent-image"
                                />
                            </div>
                            <div className="orbit-agent agent-1">📋</div>
                            <div className="orbit-agent agent-2">📄</div>
                            <div className="orbit-agent agent-3">💡</div>
                            <div className="orbit-agent agent-4">🌐</div>
                            <div className="orbit-ring"></div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

export default AgentFeatureSection
