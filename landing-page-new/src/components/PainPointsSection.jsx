import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import './PainPointsSection.css'

function PainPointsSection() {
    return (
        <section className="pain-points-section section-md">
            <div className="container">
                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    <motion.h2 className="section-title" variants={slideUp}>
                        あなたは、<span className="highlight-text">タイピスト</span>ではありません。
                    </motion.h2>
                    <motion.p className="section-subtitle" variants={slideUp}>
                        終わりのない入力作業に、疲れていませんか？
                    </motion.p>
                </motion.div>

                <motion.div
                    className="pain-grid-compact"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    <motion.div className="pain-card-compact" variants={staggerItem}>
                        <h3>カルテ作成の疲弊</h3>
                        <p>1日何十人もの記録作業。数はこなさなければならないが、質も落とせないジレンマ。</p>
                    </motion.div>

                    <motion.div className="pain-card-compact" variants={staggerItem}>
                        <h3>タイピングの苦痛</h3>
                        <p>同じ内容を何度も打ち込む単純作業。キーボードに向かう時間が、患者との時間を奪う。</p>
                    </motion.div>

                    <motion.div className="pain-card-compact" variants={staggerItem}>
                        <h3>長文作成のコスト</h3>
                        <p>紹介状や返書など、形式的な長文作成にかかる時間。診療の合間に取り組むストレス。</p>
                    </motion.div>

                    <motion.div className="pain-card-compact" variants={staggerItem}>
                        <h3>診療後の記録残業</h3>
                        <p>患者が帰った後の孤独な入力作業。削られていくプライベートの時間。</p>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}

export default PainPointsSection
