import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import LegalPage from './pages/LegalPage'
import SuccessPage from './pages/SuccessPage'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/legal" element={<LegalPage />} />
                <Route path="/success" element={<SuccessPage />} />
            </Routes>
        </Router>
    )
}

export default App
