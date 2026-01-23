import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import './PainPointsSection.css'

function PainPointsSection() {
    return (
        <section className="pain-points-section section-md">
            <div className="container">
                {/* Hook - Large Title */}
                <motion.div
                    className="pain-points-hook"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="pain-points-hook-title">
                        先生、<span className="highlight-text">待たせていませんか？</span>
                    </h2>
                </motion.div>

                {/* Spacer */}
                <div className="pain-points-spacer"></div>

                {/* Pain Points Grid with Illustrations */}
                <motion.div
                    className="pain-points-grid"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    <motion.div className="pain-point-card" variants={staggerItem}>
                        <div className="pain-point-label">患者さん</div>
                        <div className="pain-point-illustration">
                            <img src="/images/pain-points/outpatient_1.png" alt="患者さん" />
                        </div>
                    </motion.div>

                    <motion.div className="pain-point-card" variants={staggerItem}>
                        <div className="pain-point-label">スタッフ</div>
                        <div className="pain-point-illustration">
                            <img src="/images/pain-points/nurse_2.png" alt="スタッフ" />
                        </div>
                    </motion.div>

                    <motion.div className="pain-point-card" variants={staggerItem}>
                        <div className="pain-point-label">紹介先の病院</div>
                        <div className="pain-point-illustration">
                            <img src="/images/pain-points/invitation_3.png" alt="紹介先の病院" />
                        </div>
                    </motion.div>

                    <motion.div className="pain-point-card" variants={staggerItem}>
                        <div className="pain-point-label">家族</div>
                        <div className="pain-point-illustration">
                            <img src="/images/pain-points/family_4.png" alt="家族" />
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}

export default PainPointsSection
