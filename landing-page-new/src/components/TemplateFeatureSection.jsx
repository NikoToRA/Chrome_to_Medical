import { motion } from 'framer-motion'
import { slideUp, fadeIn } from '../utils/animations'
import './TemplateFeatureSection.css'

function TemplateFeatureSection() {
    return (
        <section id="features" className="template-feature-section section-lg">
            <div className="container">
                <div className="feature-layout">
                    <motion.div
                        className="feature-content"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={slideUp}
                    >
                        <div className="feature-badge">メイン機能 01</div>
                        <h2 className="feature-heading">
                            定型文を、<br />
                            <span className="highlight-blue">ワンクリック</span>で貼り付け。
                        </h2>
                        <p className="feature-subheading">
                            カルテと同じ画面で完結。<br />
                            もう、画面を行き来する必要はありません。
                        </p>

                        <div className="capability-list">
                            <div className="capability-item">
                                <span className="check-icon">✓</span>
                                <div className="capability-text">
                                    <strong>病名・薬剤名</strong>
                                    <p>頻出する複雑な名称も、一瞬で入力完了。</p>
                                </div>
                            </div>
                            <div className="capability-item">
                                <span className="check-icon">✓</span>
                                <div className="capability-text">
                                    <strong>診断書・紹介状</strong>
                                    <p>決まったフォーマットの文書作成もスムーズに。</p>
                                </div>
                            </div>
                            <div className="capability-item">
                                <span className="check-icon">✓</span>
                                <div className="capability-text">
                                    <strong>一般的なカルテ文面</strong>
                                    <p>「いつもの」所見や指導内容を一括管理。</p>
                                </div>
                            </div>
                            <div className="capability-item">
                                <span className="check-icon">✓</span>
                                <div className="capability-text">
                                    <strong>診療・指導を一括管理</strong>
                                    <p>セット登録で、漏れなくスピーディーに記録。</p>
                                </div>
                            </div>
                        </div>

                        <div className="manual-link-container">
                            <a href="/manuals/fixed_phrases.html" target="_blank" rel="noopener noreferrer" className="manual-link">
                                定型文機能の操作マニュアルを見る <span aria-hidden="true">→</span>
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        className="feature-visual"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeIn}
                    >
                        {/* Visual representation of the side panel overlay */}
                        <div className="browser-mockup">
                            <div className="browser-header">
                                <span className="dot red"></span>
                                <span className="dot yellow"></span>
                                <span className="dot green"></span>
                                <div className="address-bar">Cloud EMR System</div>
                            </div>
                            <div className="browser-body">
                                <div className="emr-content">
                                    <div className="emr-sidebar"></div>
                                    <div className="emr-main">
                                        <div className="emr-field active"></div>
                                        <div className="emr-field"></div>
                                    </div>
                                </div>

                                {/* The Extension Overlay */}
                                <div className="extension-overlay">
                                    <div className="overlay-header">Karte AI+</div>
                                    <div className="template-list">
                                        <div className="template-item">
                                            <span className="icon">💊</span>
                                            <span>感冒薬セット</span>
                                            <span className="paste-btn">貼付</span>
                                        </div>
                                        <div className="template-item">
                                            <span className="icon">📝</span>
                                            <span>生活習慣指導</span>
                                            <span className="paste-btn">貼付</span>
                                        </div>
                                        <div className="template-item">
                                            <span className="icon">🏥</span>
                                            <span>紹介状定型文</span>
                                            <span className="paste-btn">貼付</span>
                                        </div>
                                    </div>
                                    <div className="cursor-hand">👆</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

export default TemplateFeatureSection
