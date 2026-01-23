import { motion } from 'framer-motion'
import './CompatibilitySection.css'

function CompatibilitySection() {
    const emrSystems = [
        { name: 'エムスリーデジカル', logo: '/images/logos/logo-1.svg' },
        { name: '次カル', logo: '/images/logos/logo-2.png' },
        { name: 'CLINICSカルテ', logo: '/images/logos/logo-3.png' },
        { name: 'その他Chromeで動作するクラウド型カルテ', logo: null }
    ]

    return (
        <section className="compatibility-section">
            <div className="section-container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="compatibility-title">対応電子カルテ</h2>
                </motion.div>

                <motion.div
                    className="emr-logos-grid"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    {emrSystems.map((emr, index) => (
                        <div key={index} className="emr-logo-item">
                            {emr.logo ? (
                                <img src={emr.logo} alt={emr.name} className="emr-logo" />
                            ) : (
                                <span className="emr-name">{emr.name}</span>
                            )}
                        </div>
                    ))}
                </motion.div>

                <motion.p
                    className="compatibility-note"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    ※ Google Chromeで動作するクラウド電子カルテであれば対応可能です
                </motion.p>
            </div>
        </section>
    )
}

export default CompatibilitySection
