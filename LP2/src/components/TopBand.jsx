import React from 'react'

/**
 * TopBand Component
 * Displays the corporate branding "Wonder Drill Inc." at the very top of the page.
 */
function TopBand() {
    return (
        <div className="w-full relative z-50" style={{ backgroundColor: '#000000', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="container mx-auto px-6 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300 cursor-default">
                    <span className="text-[9px] font-medium text-gray-400 tracking-[0.3em] uppercase" style={{ fontFamily: '"Inter", sans-serif' }}>
                        Presented by Wonder Drill
                    </span>
                </div>
            </div>
        </div>
    )
}

export default TopBand
