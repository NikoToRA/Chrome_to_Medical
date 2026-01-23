import { useState } from 'react'
import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import { DEFAULT_DAILY_HOURS_SAVED, calculateYearlySavings } from '../utils/constants'
import './TimeSavingsSection.css'

function TimeSavingsSection() {
    const [dailyHours, setDailyHours] = useState(DEFAULT_DAILY_HOURS_SAVED)
    const yearlySavings = calculateYearlySavings(dailyHours)

    const handleSliderChange = (e) => {
        setDailyHours(parseFloat(e.target.value))
    }

    return (
        <section className="time-savings-section section-lg">
            <div className="container">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                >
                    <motion.div className="section-header" variants={staggerItem}>
                        <h2 className="section-title">
                            1日<span className="gradient-text">2時間</span>削減で
                            <br />
                            年間<span className="gradient-text">730時間</span>の自由時間
                        </h2>
                        <p className="section-subtitle">
                            カルテ入力時間を劇的に削減。あなたの時間を取り戻します。
                        </p>
                    </motion.div>

                    <motion.div className="calculator-container glass" variants={staggerItem}>
                        <div className="calculator-header">
                            <h3>あなたの時間削減効果を計算</h3>
                            <p>スライダーを動かして、削減できる時間を確認してください</p>
                        </div>

                        <div className="calculator-body">
                            <div className="slider-container">
                                <label htmlFor="daily-hours">1日の削減時間</label>
                                <div className="slider-wrapper">
                                    <input
                                        type="range"
                                        id="daily-hours"
                                        min="0.5"
                                        max="4"
                                        step="0.5"
                                        value={dailyHours}
                                        onChange={handleSliderChange}
                                        className="time-slider"
                                    />
                                    <div className="slider-value">
                                        <motion.span
                                            key={dailyHours}
                                            initial={{ scale: 1.2 }}
                                            animate={{ scale: 1 }}
                                            className="value-number gradient-text"
                                        >
                                            {dailyHours}
                                        </motion.span>
                                        <span className="value-unit">時間</span>
                                    </div>
                                </div>
                            </div>

                            <div className="results-grid">
                                <div className="result-card">
                                    <div className="result-icon">📅</div>
                                    <div className="result-content">
                                        <div className="result-label">1週間</div>
                                        <motion.div
                                            key={`week-${dailyHours}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="result-value gradient-text"
                                        >
                                            {(dailyHours * 7).toFixed(1)}時間
                                        </motion.div>
                                    </div>
                                </div>

                                <div className="result-card">
                                    <div className="result-icon">📆</div>
                                    <div className="result-content">
                                        <div className="result-label">1ヶ月</div>
                                        <motion.div
                                            key={`month-${dailyHours}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="result-value gradient-text"
                                        >
                                            {(dailyHours * 30).toFixed(0)}時間
                                        </motion.div>
                                    </div>
                                </div>

                                <div className="result-card highlight">
                                    <div className="result-icon">🎯</div>
                                    <div className="result-content">
                                        <div className="result-label">1年間</div>
                                        <motion.div
                                            key={`year-${dailyHours}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="result-value gradient-text"
                                        >
                                            {yearlySavings}時間
                                        </motion.div>
                                        <div className="result-note">
                                            = 約{Math.floor(yearlySavings / 24)}日分
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="impact-message">
                                <p>
                                    <strong>この時間で何ができる？</strong>
                                </p>
                                <div className="impact-examples">
                                    <div className="impact-item">
                                        <span className="impact-icon">👨‍⚕️</span>
                                        <span>より多くの患者さんと向き合う</span>
                                    </div>
                                    <div className="impact-item">
                                        <span className="impact-icon">📚</span>
                                        <span>最新の医学知識を学ぶ</span>
                                    </div>
                                    <div className="impact-item">
                                        <span className="impact-icon">👨‍👩‍👧‍👦</span>
                                        <span>家族との時間を増やす</span>
                                    </div>
                                    <div className="impact-item">
                                        <span className="impact-icon">🏃</span>
                                        <span>趣味や健康管理に使う</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div className="time-breakdown" variants={staggerItem}>
                        <h3>どこで時間を削減できる？</h3>
                        <div className="breakdown-grid">
                            <div className="breakdown-card">
                                <div className="breakdown-header">
                                    <span className="breakdown-icon">⚡</span>
                                    <h4>定型文入力</h4>
                                </div>
                                <p className="breakdown-time">約30分/日</p>
                                <p className="breakdown-desc">
                                    よく使う診断名や処方、説明文をボタンひとつで入力
                                </p>
                            </div>

                            <div className="breakdown-card">
                                <div className="breakdown-header">
                                    <span className="breakdown-icon">🤖</span>
                                    <h4>AIエージェント</h4>
                                </div>
                                <p className="breakdown-time">約60分/日</p>
                                <p className="breakdown-desc">
                                    SOAP記録、紹介状作成を自動化
                                </p>
                            </div>

                            <div className="breakdown-card">
                                <div className="breakdown-header">
                                    <span className="breakdown-icon">⌨️</span>
                                    <h4>キーボード操作削減</h4>
                                </div>
                                <p className="breakdown-time">約30分/日</p>
                                <p className="breakdown-desc">
                                    タイピング時間を最小限に
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}

export default TimeSavingsSection
