import { motion } from 'framer-motion'
import { slideUp } from '../utils/animations'
import './SolutionSection.css'

function SolutionSection() {
    const solutions = [
        {
            target: '患者さん',
            future: '「お待たせしました」\nのない診療へ',
            image: '/images/future/dostor_waiting.png',
            imageAlt: '笑顔で帰る患者さん'
        },
        {
            target: 'スタッフ',
            future: '書類の山が消え、\n本来の仕事に集中できる',
            image: '/images/future/Nurse_happy.png',
            imageAlt: 'スムーズに働くスタッフ'
        },
        {
            target: '紹介先',
            future: '紹介を決めた瞬間、\n紹介状はもう完成している',
            image: '/images/future/ivitation_future2.png',
            imageAlt: 'スムーズな病院連携'
        },
        {
            target: '家族',
            future: '「今日は早く帰れるよ」が\n日常になる',
            image: '/images/future/family_future.png',
            imageAlt: '家族との団らん'
        }
    ]

    return (
        <section className="solution-section section-lg">
            <div className="container">
                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="section-title">
                        その悩み、<span className="highlight-blue">Karte AI+</span>が解決します
                    </h2>
                </motion.div>

                <div className="solutions-list">
                    {solutions.map((solution, index) => (
                        <motion.div
                            key={index}
                            className={`solution-row ${index % 2 === 1 ? 'reverse' : ''}`}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={slideUp}
                        >
                            <div className="solution-image">
                                <img src={solution.image} alt={solution.imageAlt} />
                            </div>

                            <div className="solution-content">
                                <span className="solution-label">{solution.target}を待たせない</span>
                                <h3 className="solution-future">{solution.future}</h3>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </section>
    )
}

export default SolutionSection
