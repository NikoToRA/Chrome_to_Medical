import { motion } from 'framer-motion'
import './PersonaChallengesSection.css'

function PersonaChallengesSection() {
    const painPoints = [
        {
            id: 1,
            image: '/images/pain-points/outpatient_1.png',
            title: '診療後、記録が書き終わらず\n患者さんの待ち時間が増加',
            description: '次の患者さんを待たせてしまい、クレームの原因に'
        },
        {
            id: 2,
            image: '/images/pain-points/nurse_2.png',
            title: '診断書、指示書、紹介状\n同じことを何回も書いている…',
            description: '似た内容なのに毎回一から作成する非効率さ'
        },
        {
            id: 3,
            image: '/images/pain-points/invitation_3.png',
            title: '残業が当たり前になり\nスタッフの疲労が蓄積',
            description: '記録業務に追われ、本来の患者ケアに集中できない'
        }
    ]

    return (
        <section className="persona-challenges-section">
            <div className="section-container">
                <div className="pain-points-grid">
                    {painPoints.map((point, index) => (
                        <motion.div
                            key={point.id}
                            className="pain-point-card"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="pain-point-image-wrapper">
                                <img
                                    src={point.image}
                                    alt={point.title}
                                    className="pain-point-image"
                                />
                            </div>
                            <div className="pain-point-content">
                                <h3 className="pain-point-title">{point.title}</h3>
                                <p className="pain-point-description">{point.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    className="solution-arrow"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <div className="arrow-down">▼</div>
                </motion.div>
            </div>
        </section>
    )
}

export default PersonaChallengesSection
