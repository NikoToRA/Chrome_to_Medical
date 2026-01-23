import { SITE_NAME, COMPANY_INFO, CONTACT_URL, PRICING } from '../utils/constants'
import { motion } from 'framer-motion'
import { fadeIn } from '../utils/animations'
import './LegalPage.css' // We will assume a basic CSS file or reuse existing styles if possible, but let's make a new one or inline styles for simplicity? No, let's make a basic css file or use Main layout. 
// Actually, let's replicate the structure of a simple page.

function LegalPage() {
    return (
        <div className="legal-page section-lg">
            <div className="container">
                <motion.div
                    className="legal-content"
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                >
                    <h1 className="page-title">特定商取引法に基づく表記</h1>

                    <div className="legal-table-container">
                        <table className="legal-table">
                            <tbody>
                                <tr>
                                    <th>販売業者</th>
                                    <td>{COMPANY_INFO.name}</td>
                                </tr>
                                <tr>
                                    <th>代表責任者</th>
                                    <td>{COMPANY_INFO.representative}</td>
                                </tr>
                                <tr>
                                    <th>所在地</th>
                                    <td>
                                        北海道札幌市中央区南5条西15丁目2-3 リズム医大前503号室
                                    </td>
                                </tr>
                                <tr>
                                    <th>電話番号</th>
                                    <td>
                                        080-4075-6779<br />
                                        <span className="small-text">※お問い合わせはメールにてお願い致します。</span>
                                    </td>
                                </tr>
                                <tr>
                                    <th>メールアドレス</th>
                                    <td>support@wonder-drill.com</td>
                                </tr>
                                <tr>
                                    <th>販売価格</th>
                                    <td>各プランの申し込みページに記載されています。</td>
                                </tr>
                                <tr>
                                    <th>商品代金以外の必要料金</th>
                                    <td>インターネット接続料金、通信料金等はお客様の負担となります。</td>
                                </tr>
                                <tr>
                                    <th>お支払方法</th>
                                    <td>クレジットカード決済</td>
                                </tr>
                                <tr>
                                    <th>支払時期</th>
                                    <td>
                                        初回申し込み時、および毎月の更新時に決済されます。<br />
                                        （14日間の無料トライアル期間中は課金されません）
                                    </td>
                                </tr>
                                <tr>
                                    <th>商品の引渡時期</th>
                                    <td>決済完了後（またはトライアル申し込み後）、直ちにご利用いただけます。</td>
                                </tr>
                                <tr>
                                    <th>返品・交換・キャンセル等</th>
                                    <td>
                                        デジタルコンテンツの性質上、返品・返金はお受けできません。<br />
                                        解約はいつでもマイページまたは設定画面から行うことができ、次回の決済は発生しません。<br />
                                        無料トライアル期間中に解約された場合、料金は発生しません。
                                    </td>
                                </tr>
                                <tr>
                                    <th>動作環境</th>
                                    <td>Google Chrome 最新版が動作するPC環境</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default LegalPage
