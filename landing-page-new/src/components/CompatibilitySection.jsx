import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import './CompatibilitySection.css'

const LOGOS = [
    { name: 'エムスリーデジカル', src: '/images/logos/logo-1.svg', alt: 'エムスリーデジカル' },
    { name: 'CLINICSカルテ', src: '/images/logos/logo-2.png', alt: 'CLINICSカルテ' },
    { name: 'モバカル', src: '/images/logos/logo-3.png', alt: 'モバカル' },
]

function CompatibilitySection() {
    return (
        <section className="compatibility-section">
            <div className="container">
                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="compatibility-title">
                        対応電子カルテ
                    </h2>
                    <p className="compatibility-subtitle">
                        Webブラウザ型クラウドカルテに全対応
                    </p>
                </motion.div>

                <motion.div
                    className="logos-grid"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    {LOGOS.map((logo, index) => (
                        <motion.div
                            key={index}
                            className="logo-item"
                            variants={staggerItem}
                        >
                            <div className="logo-wrapper">
                                <img src={logo.src} alt={logo.alt} className="emr-logo" />
                            </div>
                            <span className="logo-name">{logo.name}</span>
                        </motion.div>
                    ))}
                </motion.div>

                <p className="compatibility-note">
                    ※ Google Chromeで動作するクラウド電子カルテであれば対応可能です
                </p>
            </div>
        </section>
    )
}

export default CompatibilitySection
