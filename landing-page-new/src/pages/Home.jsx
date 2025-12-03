import HeroSection from '../components/HeroSection'
import PainPointsSection from '../components/PainPointsSection'
import SolutionSection from '../components/SolutionSection'
import TemplateFeatureSection from '../components/TemplateFeatureSection'
import AgentFeatureSection from '../components/AgentFeatureSection'
import UsageSceneSection from '../components/UsageSceneSection'
import SecuritySection from '../components/SecuritySection'
import ThreeStepsSection from '../components/ThreeStepsSection'
import TestimonialsSection from '../components/TestimonialsSection'
import FAQSection from '../components/FAQSection'
import PricingSection from '../components/PricingSection'
import CTASection from '../components/CTASection'
import Footer from '../components/Footer'

function Home() {
    return (
        <div className="home-page">
            <HeroSection />
            <PainPointsSection />
            <SolutionSection />
            <TemplateFeatureSection />
            <AgentFeatureSection />
            <UsageSceneSection />
            <SecuritySection />
            <ThreeStepsSection />
            <TestimonialsSection />
            <FAQSection />
            <PricingSection />
            <CTASection />
            <Footer />
        </div>
    )
}

export default Home
