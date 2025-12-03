import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { slideUp } from '../utils/animations'
import './FAQSection.css'

const FAQS = [
    {
        question: "電子カルテメーカーへの連絡や調整は必要ですか？",
        answer: "いいえ、一切不要です。Karte AI+はブラウザ上で動作する拡張機能であり、電子カルテシステム自体には変更を加えないため、メーカーとの調整なしですぐにご利用いただけます。"
    },
    {
        question: 'どの電子カルテに対応していますか？',
        answer: 'Chromeブラウザで動作するクラウド型カルテであれば、基本的に全てのシステムに対応しています。'
    },
    {
        question: '導入にどのくらい時間がかかりますか？',
        answer: 'Chrome拡張機能のインストールは1分程度、初期設定を含めても5分程度で完了します。'
    },
    {
        question: 'セキュリティは大丈夫ですか？',
        answer: 'Microsoft Azureの堅牢なセキュリティ基盤を採用しており、医療情報も安全にお取り扱いいただけます。'
    },
    {
        question: '無料期間中に解約できますか？',
        answer: 'はい、14日間の無料期間中はいつでもキャンセル可能です。料金は一切かかりません。'
    },
    {
        question: 'サポートはありますか？',
        answer: 'メールサポートに加え、エージェント作成サポートプラン（別途）もご用意しています。'
    }
]

function FAQSection() {
    const [activeIndex, setActiveIndex] = useState(null)

    const toggleFAQ = (index) => {
        setActiveIndex(activeIndex === index ? null : index)
    }

    return (
        <section className="faq-section section-md">
            <div className="container">
                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="section-title">よくある質問</h2>
                </motion.div>

                <div className="faq-container">
                    {FAQS.map((faq, index) => (
                        <motion.div
                            key={index}
                            className={`faq-item ${activeIndex === index ? 'active' : ''}`}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={slideUp}
                            transition={{ delay: index * 0.1 }}
                        >
                            <button
                                className="faq-question"
                                onClick={() => toggleFAQ(index)}
                                aria-expanded={activeIndex === index}
                            >
                                <span className="q-mark">Q.</span>
                                <span className="q-text">{faq.question}</span>
                                <span className="q-toggle">{activeIndex === index ? '−' : '+'}</span>
                            </button>
                            <AnimatePresence>
                                {activeIndex === index && (
                                    <motion.div
                                        className="faq-answer"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="answer-content">
                                            <span className="a-mark">A.</span>
                                            <p>{faq.answer}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default FAQSection
