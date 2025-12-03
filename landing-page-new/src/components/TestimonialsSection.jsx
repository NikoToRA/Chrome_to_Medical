import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '../utils/animations'
import { TESTIMONIALS } from '../utils/constants'
import './TestimonialsSection.css'

function TestimonialsSection() {
    return (
        <section className="testimonials-section section-lg">
            <div className="container">
                <motion.div
                    className="section-header text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={slideUp}
                >
                    <h2 className="section-title">導入クリニックの声</h2>
                    <p className="section-subtitle">
                        実際にKarte AI+を使用している医師の方々からの評価
                    </p>
                </motion.div>

                <motion.div
                    className="testimonials-grid-layout"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    {TESTIMONIALS.map((testimonial) => (
                        <motion.div
                            key={testimonial.id}
                            className="testimonial-card-grid"
                            variants={staggerItem}
                        >
                            <div className="testimonial-header">
                                {/* Doctor Photo Placeholder */}
                                <div className="doctor-photo-placeholder">
                                    <span className="placeholder-text">写真</span>
                                </div>
                                <div className="testimonial-info">
                                    <div className="author-name">{testimonial.author}</div>
                                    <div className="author-role">{testimonial.specialty}</div>
                                </div>
                            </div>

                            <div className="speech-bubble-grid">
                                <div className="bubble-tail-grid"></div>
                                <div className="testimonial-stars-small">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <span key={i} className="star-small">⭐</span>
                                    ))}
                                </div>
                                <blockquote className="testimonial-quote-small">
                                    「{testimonial.quote}」
                                </blockquote>
                                <div className="impact-badge-small">
                                    {testimonial.timeSaved}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}

export default TestimonialsSection
