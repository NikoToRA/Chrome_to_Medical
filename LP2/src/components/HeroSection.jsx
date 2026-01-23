import { motion } from 'framer-motion'
import './HeroSection.css'

function HeroSection() {
    return (
        <section className="hero-section">
            <div className="hero-container">
                <motion.h1
                    className="hero-title"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    簡単AI導入で、記録時間を<span className="highlight">1/3</span>に。
                </motion.h1>

                <motion.div
                    className="hero-image-wrapper"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <img
                        src="/Hero3.png"
                        alt="Karte AI+ 画面イメージ"
                        className="hero-image"
                    />
                </motion.div>
            </div>
        </section>
    )
}

export default HeroSection
