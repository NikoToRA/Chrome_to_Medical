import React from 'react'
import { Link } from 'react-router-dom'
import { SITE_NAME } from '../utils/constants'
import './Header.css'

function Header() {
    return (
        <header className="header-wrapper">
            <div className="header-container">
                {/* Logo Section */}
                <Link to="/" className="header-logo-link group">
                    <div className="header-logo-bg">
                        <img src="/logo.png" alt={SITE_NAME} className="header-logo-img" />
                    </div>
                    <span className="header-site-name">
                        {SITE_NAME}
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="header-nav">
                    {['機能', '料金', 'よくある質問'].map((item, i) => (
                        <a
                            key={i}
                            href={`/#${['features', 'price', 'faq'][i]}`}
                            className="header-nav-link group"
                        >
                            {item}
                            <span className="header-nav-line"></span>
                        </a>
                    ))}
                    <a
                        href="https://wonder-drill.com/contact"
                        className="header-nav-link group"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        お問い合わせ
                        <span className="header-nav-line"></span>
                    </a>
                </nav>

                {/* Action Buttons */}
                <div className="header-actions">
                    <a
                        href="/login"
                        className="header-login-btn"
                    >
                        ログイン
                    </a>
                    <a
                        href="/register"
                        className="header-cta-btn"
                    >
                        無料で始める
                    </a>
                </div>
            </div>
        </header>
    )
}

export default Header
