import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import './ThreeStepsSection.css'

function ThreeStepsSection() {
    return (
        <section className="three-steps-section section-lg">
            <div className="container">
                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="section-title">導入簡単 3 STEP</h2>
                    <p className="section-subtitle">今日からすぐに使い始められます</p>
                </motion.div>

                <motion.div
                    className="steps-container"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    <motion.div className="step-card" variants={staggerItem}>
                        <div className="step-number">01</div>
                        <div className="step-content">
                            <h3>拡張機能をインストール</h3>
                            <p>
                                Chromeブラウザに追加するだけ。<br />
                                <span className="highlight-note">※ベンダー調整不要</span>
                            </p>
                        </div>
                    </motion.div>

                    <motion.div className="step-card" variants={staggerItem}>
                        <div className="step-number">02</div>
                        <div className="step-content">
                            <h3>メールを確認</h3>
                            <p>届いたメールのリンクをクリックして認証。</p>
                        </div>
                    </motion.div>

                    <motion.div className="step-card" variants={staggerItem}>
                        <div className="step-number">03</div>
                        <div className="step-content">
                            <h3>即日利用開始</h3>
                            <p>面倒な設定なしで、すぐに使い始められます。</p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}

export default ThreeStepsSection
