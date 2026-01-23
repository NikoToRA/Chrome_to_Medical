import { motion } from 'framer-motion'
import './WhyNotEfficientSection.css'

function WhyNotEfficientSection() {
    return (
        <section className="why-not-efficient-section">
            <div className="section-container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="section-title">
                        カルテ・診断書・紹介状…<br />
                        <span className="highlight">記録作成が業務を圧迫。</span>
                    </h2>
                    <p className="section-subtitle">
                        でも、これ以上の効率化は無理だと諦めていませんか？
                    </p>
                </motion.div>
            </div>
        </section>
    )
}

export default WhyNotEfficientSection
