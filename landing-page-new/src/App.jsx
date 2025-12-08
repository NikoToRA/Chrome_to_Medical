import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import LegalPage from './pages/LegalPage'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/legal" element={<LegalPage />} />
            </Routes>
        </Router>
    )
}

export default App
