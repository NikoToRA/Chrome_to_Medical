import { motion } from 'framer-motion'
import './TestimonialsSection.css'

function TestimonialsSection() {
    const placeholders = [
        { id: 1, label: '動画準備中' },
        { id: 2, label: '動画準備中' },
        { id: 3, label: '動画準備中' },
        { id: 4, label: '動画準備中' }
    ]

    return (
        <section className="testimonials-section">
            <div className="section-container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="section-title">導入クリニックの声</h2>
                </motion.div>

                <div className="testimonials-grid">
                    {placeholders.map((item, index) => (
                        <motion.div
                            key={item.id}
                            className="testimonial-placeholder"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <span className="placeholder-label">{item.label}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default TestimonialsSection
