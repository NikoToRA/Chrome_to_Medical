import { motion } from 'framer-motion'
import './BenefitSection.css'

function BenefitSection() {
    const benefits = [
        {
            image: '/images/future/dostor_waiting.png',
            title: '患者さんを待たせない',
            description: 'クリニックのイメージアップと回転率の向上'
        },
        {
            image: '/images/future/Nurse_happy.png',
            title: 'スタッフを待たせない',
            description: '必要書類をワンクリックで発行で、業務時間の大幅短縮'
        },
        {
            image: '/images/future/family_future.png',
            title: '家族も、待たせない',
            description: '「今日は早く帰れるよ」が日常になる'
        }
    ]

    return (
        <section className="benefit-section">
            <div className="section-container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="section-title">
                        もう、誰も待たせない。<br />
                        AIが理想の経営を叶えます
                    </h2>
                </motion.div>

                <div className="benefits-grid">
                    {benefits.map((benefit, index) => (
                        <motion.div
                            key={index}
                            className="benefit-card"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="benefit-image-wrapper">
                                <img
                                    src={benefit.image}
                                    alt={benefit.title}
                                    className="benefit-image"
                                />
                            </div>
                            <div className="benefit-content">
                                <h3 className="benefit-title">{benefit.title}</h3>
                                <p className="benefit-description">{benefit.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default BenefitSection
