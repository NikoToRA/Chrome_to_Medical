import { SITE_NAME, FOOTER_LINKS, SOCIAL_LINKS, COMPANY_INFO } from '../utils/constants'
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
                    <div className="social-links">
                        <a href={SOCIAL_LINKS.twitter} aria-label="Twitter" className="social-link">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                            </svg>
                        </a>
                        <a href={SOCIAL_LINKS.facebook} aria-label="Facebook" className="social-link">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                            </svg>
                        </a>
                        <a href={SOCIAL_LINKS.linkedin} aria-label="LinkedIn" className="social-link">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                                <circle cx="4" cy="4" r="2" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
