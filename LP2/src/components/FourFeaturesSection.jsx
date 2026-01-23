import { motion } from 'framer-motion'
import './FourFeaturesSection.css'

function FourFeaturesSection() {
    const features = [
        {
            image: '/images/agents/Agent-soap.jpg',
            title: 'よく使う言葉は辞書登録で\n選択するだけ',
            description: '定型文をワンクリックで入力'
        },
        {
            image: '/images/agents/Agent-invoice.jpg',
            title: 'カルテから診断書・指示書などを\n自動生成。書き直す必要なし',
            description: 'AIが文書作成をサポート'
        },
        {
            image: '/images/agents/Agent-inyroduction.jpg',
            title: '紹介を決めた瞬間\n紹介状はもう完成している',
            description: '紹介状作成の時短を実現'
        }
    ]

    return (
        <section className="four-features-section">
            <div className="section-container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="section-title">
                        同じことを手打ちで何度も書いている…<br />
                        <span className="highlight">毎日行う業務がワンクリックで</span>
                    </h2>
                </motion.div>

                <div className="features-grid">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            className="feature-card"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="feature-image-wrapper">
                                <img
                                    src={feature.image}
                                    alt={feature.title}
                                    className="feature-image"
                                />
                            </div>
                            <div className="feature-content">
                                <h3 className="feature-title">{feature.title}</h3>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default FourFeaturesSection
