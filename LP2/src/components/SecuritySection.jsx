import { motion } from 'framer-motion'
import { slideUp } from '../utils/animations'
import './SecuritySection.css'

function SecuritySection() {
    return (
        <section className="security-section">
            <div className="container">
                <motion.div
                    className="security-banner"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <div className="security-items">
                        <div className="security-item">
                            <svg className="security-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            <span>3省2ガイドライン準拠</span>
                        </div>
                        <div className="security-divider"></div>
                        <div className="security-item">
                            <svg className="security-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                            <span>SSL/TLS暗号化通信</span>
                        </div>
                        <div className="security-divider"></div>
                        <div className="security-item">
                            <svg className="security-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                            </svg>
                            <span>Microsoft Azure基盤</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default SecuritySection
