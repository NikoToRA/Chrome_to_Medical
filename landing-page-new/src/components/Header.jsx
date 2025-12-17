import React from 'react'
import { Link } from 'react-router-dom'
import { SITE_NAME } from '../utils/constants'

function Header() {
    return (
        <header className="bg-white border-b border-gray-100 py-4">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-2 no-underline">
                    <img src="/logo.png" alt={SITE_NAME} className="h-8 w-auto" />
                    <span className="font-bold text-xl text-gray-800">{SITE_NAME}</span>
                </Link>
                <Link
                    to="/"
                    className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors"
                >
                    トップページへ戻る
                </Link>
            </div>
        </header>
    )
}

export default Header
