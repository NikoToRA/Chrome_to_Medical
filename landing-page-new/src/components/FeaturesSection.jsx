import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import { FEATURES } from '../utils/constants'
import './FeaturesSection.css'

function FeaturesSection() {
    // Reorder features to prioritize Templates (id: templates) then Agents
    const templateFeature = FEATURES.find(f => f.id === 'templates')
    const agentFeatures = FEATURES.filter(f => f.id !== 'templates' && f.id !== 'compatibility')
    const compatibilityFeature = FEATURES.find(f => f.id === 'compatibility')

    const orderedFeatures = [templateFeature, ...agentFeatures, compatibilityFeature]

    return (
        <section className="features-section section-lg">
            <div className="container">
                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="section-title">
                        <span className="gradient-text">定型文</span>と<span className="gradient-text">AI</span>の<br />
                        強力なコンビネーション
                    </h2>
                    <p className="section-subtitle">
                        あなたの診療スタイルに合わせて、最適なツールを選べます
                    </p>
                </motion.div>

                <motion.div
                    className="features-grid"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    {orderedFeatures.map((feature) => (
                        <motion.div
                            key={feature.id}
                            className={`feature-card ${feature.id === 'templates' ? 'highlight-card' : ''}`}
                            variants={staggerItem}
                            whileHover={{ y: -10 }}
                        >
                            <div className="feature-icon-wrapper">
                                <span className="feature-icon">{feature.icon}</span>
                            </div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>

                            <ul className="feature-benefits">
                                {feature.benefits.map((benefit, index) => (
                                    <li key={index}>
                                        <span className="check-icon">✓</span>
                                        {benefit}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}

export default FeaturesSection
