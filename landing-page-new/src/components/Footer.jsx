import { SITE_NAME, FOOTER_LINKS, COMPANY_INFO } from '../utils/constants'
import './Footer.css'

function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h3 className="brand-name">{SITE_NAME}</h3>
                        <p className="brand-tagline">あなたの診療にAIをプラス</p>
                        <p className="brand-description">
                            キーボード操作を極力減らし、AIエージェントで診療を効率化。
                            医師の時間を患者ケアに取り戻します。
                        </p>
                        <div className="company-profile">
                            <p className="company-name">{COMPANY_INFO.name}</p>
                            <p className="company-rep">{COMPANY_INFO.representative}</p>
                            <p className="company-mission">{COMPANY_INFO.mission}</p>
                        </div>
                    </div>

                    <div className="footer-links">
                        <div className="footer-column">
                            <h4>会社情報</h4>
                            <ul>
                                {FOOTER_LINKS.company.map((link, index) => (
                                    <li key={index}>
                                        <a href={link.href}>{link.label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="footer-column">
                            <h4>サポート</h4>
                            <ul>
                                {FOOTER_LINKS.support.map((link, index) => (
                                    <li key={index}>
                                        <a href={link.href}>{link.label}</a>
                                    </li>
                                ))}
                                <li>
                                    <a href="/manage">契約管理・解約</a>
                                </li>
                            </ul>
                        </div>

                        <div className="footer-column">
                            <h4>法的情報</h4>
                            <ul>
                                {FOOTER_LINKS.legal.map((link, index) => (
                                    <li key={index}>
                                        <a href={link.href}>{link.label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="copyright">
                        © {currentYear} {SITE_NAME}. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
