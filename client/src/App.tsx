import { Routes, Route, Navigate } from 'react-router-dom'
import { useContext } from 'react'
import { AppContext } from './context/AppContext'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import Home from './pages/home'
import Auth from './pages/Auth'
import MyProjects from './pages/MyProjects'
import Projects from './pages/Projects'
import Pricing from './pages/Pricing'
import Community from './pages/Community'
import Templates from './pages/Templates'
import Admin from './pages/Admin'
import Settings from './pages/Settings'
import View from './pages/View'
import Preview from './pages/Preview'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useContext(AppContext)
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <i className="fas fa-spinner fa-spin text-blue-400 text-3xl"></i>
    </div>
  )
  return token ? <>{children}</> : <Navigate to="/auth" replace />
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user, loading } = useContext(AppContext)
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <i className="fas fa-spinner fa-spin text-blue-400 text-3xl"></i>
    </div>
  )
  if (!token) return <Navigate to="/auth" replace />
  if (user && user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

const App = () => {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/community" element={<Community />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/projects/new" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/projects/:projectId" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          <Route path="/view/:id" element={<View />} />
          <Route path="/preview/:id" element={<Preview />} />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}

export default App