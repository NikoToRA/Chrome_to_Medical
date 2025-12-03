import { motion } from 'framer-motion'
import { slideUp, pulse } from '../utils/animations'
import { CTA_URL } from '../utils/constants'
import './CTASection.css'

function CTASection() {
    return (
        <section className="cta-section section-lg">
            <div className="container">
                <motion.div
                    className="cta-content"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="cta-title">
                        今すぐ始めて、<br />
                        <span className="gradient-text">時間を取り戻しましょう</span>
                    </h2>

                    <p className="cta-description">
                        14日間の無料トライアルで、Karte AI+の効果を実感してください。
                    </p>

                    <div className="cta-benefits">
                        <div className="cta-benefit">
                            <span>14日間無料</span>
                        </div>
                        <div className="cta-benefit">
                            <span>いつでもキャンセル可能</span>
                        </div>
                    </div>

                    <motion.a
                        href={CTA_URL}
                        className="btn btn-primary btn-lg cta-button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        今すぐ無料で始める
                        <span className="cta-arrow">→</span>
                    </motion.a>

                    <p className="cta-note">
                        導入後のサポートも充実。安心してご利用いただけます。
                    </p>
                </motion.div>
            </div>
        </section>
    )
}

export default CTASection
