import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import { CTA_URL } from '../utils/constants'
import './CompatibilitySection.css'

const LOGOS = [
    { name: 'm3 Digikar', src: '/images/logos/logo-1.svg', alt: 'エムスリーデジカル' },
    { name: 'CLINICS', src: '/images/logos/logo-2.png', alt: 'CLINICSカルテ' },
    { name: 'Mobacal', src: '/images/logos/logo-3.png', alt: 'モバカル' },
]

function CompatibilitySection() {
    return (
        <section className="compatibility-section section-lg">
            <div className="container">
                <motion.div
                    className="demo-video-wrapper"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                    transition={{ delay: 0.3 }}
                >
                    <div className="video-container-framed">
                        <video
                            src="/images/usage/compatibility-demo.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="demo-video"
                        />
                        <div className="video-caption">実際の連携動作イメージ</div>
                    </div>
                </motion.div>

                <motion.div
                    className="compatibility-cta"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                    transition={{ delay: 0.5 }}
                >
                    <a href={CTA_URL} className="btn btn-primary btn-lg">
                        実際に試してみる
                    </a>
                </motion.div>

                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="section-title">
                        主要な<span className="highlight-blue">クラウド電子カルテ</span>に<br />
                        完全対応
                    </h2>
                    <p className="section-subtitle">
                        Google Chromeで動作する電子カルテなら、<br />
                        どのシステムでもすぐにご利用いただけます。
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
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}

export default CompatibilitySection
