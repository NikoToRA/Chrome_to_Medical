import { motion } from 'framer-motion'
import { CTA_URL } from '../utils/constants'
import './PricingSection.css'

function PricingSection() {
    const plans = [
        {
            name: '無料トライアル',
            price: '0',
            period: '/14日間',
            description: 'まずは機能をお試し',
            features: [
                '全ての機能が利用可能',
                '基本AIエージェント4つ',
                '定型文無制限',
                'いつでもキャンセル可能'
            ],
            buttonText: '無料で始める',
            buttonStyle: 'outline'
        },
        {
            name: 'スタンダードプラン',
            price: '4,980',
            period: '/月',
            description: '全ての機能が使い放題',
            features: [
                'AIの使用無制限',
                '基本エージェント4つ＋追加4つ可能',
                '定型文無制限',
                'Webブラウザ型クラウドカルテに全対応',
                'メールサポート',
                '14日間無料トライアル'
            ],
            buttonText: '14日間無料で試す',
            buttonStyle: 'primary',
            highlight: true
        },
        {
            name: 'エージェント作成サポート',
            price: '50,000',
            period: '（税込）',
            description: 'あなたの専属コンシェルジュ',
            features: [
                '1ヶ月優先メール対応',
                'Web面談1回（期間中）',
                'カスタムエージェント作成支援',
                '定型文テンプレート提供',
                '導入・設定完全サポート'
            ],
            buttonText: 'サポートを申し込む',
            buttonStyle: 'outline'
        }
    ]

    return (
        <section id="pricing" className="pricing-section">
            <div className="section-container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="section-title">料金プラン</h2>
                    <p className="section-subtitle">
                        シンプルで便利な価格設定
                    </p>
                </motion.div>

                <div className="pricing-grid">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={index}
                            className={`pricing-card ${plan.highlight ? 'highlighted' : ''}`}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="plan-header">
                                <h3 className="plan-name">{plan.name}</h3>
                                <div className="price">
                                    <span className="currency">¥</span>
                                    <span className="amount">{plan.price}</span>
                                    <span className="period">{plan.period}</span>
                                </div>
                                <p className="plan-description">{plan.description}</p>
                            </div>

                            <div className="plan-divider"></div>

                            <ul className="plan-features">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx}>
                                        <span className="check">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <a
                                href={CTA_URL}
                                className={`plan-button ${plan.buttonStyle}`}
                            >
                                {plan.buttonText}
                            </a>
                        </motion.div>
                    ))}
                </div>

                <p className="payment-note">※お支払いはクレジットカードのみとなります</p>
            </div>
        </section>
    )
}

export default PricingSection
