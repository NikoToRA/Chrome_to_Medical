import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import { CTA_URL, PRICING } from '../utils/constants'
import './PricingSection.css'

function PricingSection() {
    return (
        <section id="price" className="pricing-section section-lg">
            <div className="container">
                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="section-title">料金プラン</h2>
                    <p className="section-subtitle">
                        シンプルで透明な価格設定<br />
                        <span className="payment-note">※お支払いはクレジットカードのみとなります</span>
                    </p>
                </motion.div>

                <motion.div
                    className="pricing-grid"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    {/* Free Trial Plan */}
                    <motion.div className="pricing-card free" variants={staggerItem}>
                        <div className="plan-header">
                            <h3>無料トライアル</h3>
                            <div className="price">
                                <span className="currency">{PRICING.currency}</span>
                                <span className="amount">0</span>
                                <span className="period">/14日間</span>
                            </div>
                            <p className="plan-desc">まずは機能をお試し</p>
                        </div>

                        <ul className="plan-features">
                            <li>全ての機能が利用可能</li>
                            <li>基本AIエージェント4つ</li>
                            <li>定型文無制限</li>
                            <li>いつでもキャンセル可能</li>
                        </ul>

                        <a href={CTA_URL} className="btn btn-outline btn-full">
                            無料で始める
                        </a>
                    </motion.div>

                    {/* Standard Plan */}
                    <motion.div className="pricing-card standard" variants={staggerItem}>
                        <div className="plan-header">
                            <h3>スタンダードプラン</h3>
                            <div className="price">
                                <span className="currency">{PRICING.currency}</span>
                                <span className="amount">{PRICING.monthly.toLocaleString()}</span>
                                <span className="period">/月</span>
                            </div>
                            <p className="plan-desc">全ての機能が使い放題</p>
                        </div>

                        <ul className="plan-features">
                            <li>AIの使用無制限</li>
                            <li>基本エージェント4つ＋追加4つ可能</li>
                            <li>定型文無制限</li>
                            <li>Webブラウザ型クラウドカルテに全対応</li>
                            <li>メールサポート</li>
                            <li>14日間無料トライアル</li>
                        </ul>

                        <a href={CTA_URL} className="btn btn-primary btn-full">
                            14日間無料で試す
                        </a>
                    </motion.div>

                    {/* Support Plan */}
                    <motion.div className="pricing-card premium" variants={staggerItem}>
                        <div className="premium-badge">先着20名限定</div>
                        <div className="plan-header">
                            <h3>エージェント作成サポート</h3>
                            <div className="price-group">
                                <div className="old-price">¥80,000</div>
                                <div className="price">
                                    <span className="currency">{PRICING.currency}</span>
                                    <span className="amount">50,000</span>
                                    <span className="period">（一回のみ）</span>
                                </div>
                            </div>
                            <p className="plan-desc">あなたの専属コンシェルジュ</p>
                        </div>

                        <ul className="plan-features">
                            <li>1ヶ月優先メール対応</li>
                            <li>Web面談1回（期間中）</li>
                            <li>カスタムエージェント作成支援</li>
                            <li>定型文テンプレート提供</li>
                            <li>導入・設定完全サポート</li>
                        </ul>

                        <a href="https://wonder-drill.com/contact" className="btn btn-outline btn-full" target="_blank" rel="noopener noreferrer">
                            サポートを申し込む
                        </a>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}

export default PricingSection
