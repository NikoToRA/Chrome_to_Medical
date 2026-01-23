import { motion } from 'framer-motion'
import './FeatureDetailSection.css'

function FeatureDetailSection() {
    return (
        <section className="feature-detail-section">
            <div className="section-container">
                {/* 機能 01 - AIエージェント: 画像左、コンテンツ右 */}
                <motion.div
                    className="feature-block"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="feature-image-side">
                        <div className="feature-image-placeholder">
                            <span className="placeholder-text">デモ動画準備中</span>
                        </div>
                    </div>
                    <div className="feature-content-side">
                        <div className="feature-content-inner">
                            <p className="feature-number">機能 01</p>
                            <h3 className="feature-title underline">AIエージェント</h3>
                            <p className="feature-desc">
                                メモやスクショを渡すだけで紹介状や要約<br />
                                診断書を AI が自動生成。
                            </p>
                            <div className="feature-tags">
                                <span className="tag">SOAP記録</span>
                                <span className="tag">紹介状作成</span>
                                <span className="tag">翻訳</span>
                                <span className="tag">診断書作成</span>
                            </div>
                            <p className="feature-note">
                                4 機能を標準搭載。<br />
                                そのほか SOAP 分析などの機能をご自身で生成し<br />
                                追加することが可能です。（有料サポートあり）
                            </p>
                        </div>
                        <a href="#pricing" className="feature-link-button">
                            機能を詳しく見る→
                        </a>
                    </div>
                </motion.div>

                {/* 機能 02 - 定型文: コンテンツ左、画像右 */}
                <motion.div
                    className="feature-block"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <div className="feature-content-side">
                        <div className="feature-content-inner">
                            <p className="feature-number">機能 02</p>
                            <h3 className="feature-title underline">
                                定型文のワンクリック呼び出し
                            </h3>
                            <p className="feature-desc">
                                よく使う文章は定型文に登録。ボタンひとつで<br />
                                呼び出して、繰り返し入力から解放。
                            </p>
                            <div className="feature-tags">
                                <span className="tag">病名</span>
                                <span className="tag">薬剤名</span>
                                <span className="tag">簡単なテキスト</span>
                            </div>
                        </div>
                        <a href="#demo" className="feature-link-button">
                            使い方を見てみる→
                        </a>
                    </div>
                    <div className="feature-image-side">
                        <div className="feature-image-placeholder">
                            <span className="placeholder-text">デモ動画準備中</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default FeatureDetailSection
