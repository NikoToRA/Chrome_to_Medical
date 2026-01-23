import Header from '../components/Header'
import HeroSection from '../components/HeroSection'
import WhyNotEfficientSection from '../components/WhyNotEfficientSection'
import PersonaChallengesSection from '../components/PersonaChallengesSection'
import SolutionSection from '../components/SolutionSection'
import CompatibilitySection from '../components/CompatibilitySection'
import FourFeaturesSection from '../components/FourFeaturesSection'
import BenefitSection from '../components/BenefitSection'
import TestimonialsSection from '../components/TestimonialsSection'
import DemoVideoSection from '../components/DemoVideoSection'
import FeatureDetailSection from '../components/FeatureDetailSection'
import ThreeStepsSection from '../components/ThreeStepsSection'
import PricingSection from '../components/PricingSection'
import FAQSection from '../components/FAQSection'
import Footer from '../components/Footer'

function Home() {
    return (
        <div className="home-page">
            <Header />
            {/* 1. ヒーロー: 簡単AI導入で、記録時間を1/3に */}
            <HeroSection />
            {/* 2. 問題提起: カルテ・診断書・紹介状…記録作成が業務を圧迫 */}
            <WhyNotEfficientSection />
            {/* 3. ペインポイント3カード + 矢印 */}
            <PersonaChallengesSection />
            {/* 4. 解決策: その悩み、Karte AI+で解決！ */}
            <SolutionSection />
            {/* 5. 対応電子カルテ */}
            <CompatibilitySection />
            {/* 6. 3つの機能カード */}
            <FourFeaturesSection />
            {/* 7. ベネフィット: もう、誰も待たせない。AIが理想の経営を叶えます */}
            <BenefitSection />
            {/* 8. 導入クリニックの声（4カード） */}
            <TestimonialsSection />
            {/* 9. 機能紹介（デモ動画エリア） */}
            <DemoVideoSection />
            {/* 10. 機能詳細（AIエージェント + 定型文） */}
            <FeatureDetailSection />
            {/* 11. 導入3STEP */}
            <ThreeStepsSection />
            {/* 12. 料金プラン */}
            <PricingSection />
            {/* FAQ */}
            <FAQSection />
            <Footer />
        </div>
    )
}

export default Home
