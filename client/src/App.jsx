import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './modules/auth/AuthProvider'
import Layout from './components/Layout'
import ScannerPage from './pages/ScannerPage'
import ToolsPage from './pages/ToolsPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<ScannerPage />} />
            <Route path="/tools" element={<ToolsPage />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  )
}

export default App
