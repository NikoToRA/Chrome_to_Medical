import { motion } from 'framer-motion'
import './ThreeStepsSection.css'

function ThreeStepsSection() {
    const steps = [
        {
            title: 'Chrome拡張をインストール',
            description: 'Chromeウェブストアからインストール。ベンダー調整不要です。'
        },
        {
            title: 'メールで認証',
            description: '届いたメールのリンクをクリックして認証完了。'
        },
        {
            title: '即日利用開始',
            description: '面倒な設定なしで、すぐに使い始められます。',
            highlighted: true
        }
    ]

    return (
        <section className="three-steps-section">
            <div className="section-container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="section-title">
                        導入は簡単<span className="highlight">3STEP</span>！
                    </h2>
                    <p className="section-subtitle">今日からすぐに使い始められます</p>
                </motion.div>

                <div className="steps-container">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            className={`step-card ${step.highlighted ? 'highlighted' : ''}`}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="step-image-placeholder">
                                <span className="placeholder-text">画像準備中</span>
                            </div>
                            <h3 className="step-title">{step.title}</h3>
                            <p className="step-description">{step.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default ThreeStepsSection
