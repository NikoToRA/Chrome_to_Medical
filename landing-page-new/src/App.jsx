import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import LegalPage from './pages/LegalPage'
import SuccessPage from './pages/SuccessPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import CancelPage from './pages/CancelPage'
import ManagePage from './pages/ManagePage' // Added import for ManagePage
import './index.css' // Ensure index styles are applied 

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/legal" element={<LegalPage />} />
                <Route path="/success" element={<SuccessPage />} />
                <Route path="/cancel" element={<CancelPage />} />
                <Route path="/manage" element={<ManagePage />} /> {/* Added /manage route */}
            </Routes>
        </Router>
    )
}

export default App
