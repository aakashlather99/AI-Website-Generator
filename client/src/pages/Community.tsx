import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import api from '../services/api'

const Community = () => {
  const navigate = useNavigate()
  const { token } = useContext(AppContext)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCommunity() }, [])

  const fetchCommunity = async () => {
    try {
      const { data } = await api.get('/api/projects/community')
      if (data.success) setProjects(data.projects)
    } catch { /* silent — show empty */ }
    finally { setLoading(false) }
  }

  const placeholders = [
    { id: 'p1', title: 'Modern Portfolio', author: 'Alice', prompt: 'A sleek dark portfolio for designers', framework: 'html' },
    { id: 'p2', title: 'SaaS Dashboard', author: 'Bob', prompt: 'Analytics dashboard with charts', framework: 'react' },
    { id: 'p3', title: 'Restaurant Site', author: 'Carol', prompt: 'Elegant restaurant with menu', framework: 'html' },
    { id: 'p4', title: 'Fitness Tracker', author: 'Dave', prompt: 'Dark-themed fitness landing page', framework: 'html' },
    { id: 'p5', title: 'Startup Landing', author: 'Eve', prompt: 'Modern startup hero sections', framework: 'nextjs' },
    { id: 'p6', title: 'Photography', author: 'Frank', prompt: 'Minimal photography portfolio', framework: 'html' },
  ]

  const displayProjects = projects.length > 0 ? projects : placeholders

  return (
    <div className="min-h-screen pt-24 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Community Showcase</h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Explore amazing websites built by the SiteForge AI community.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400"><i className="fas fa-spinner fa-spin text-3xl"></i></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProjects.map((project: any) => (
              <div key={project.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-blue-500/30 transition-all duration-300 hover:scale-[1.02]">
                <div className="h-40 bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center relative">
                  <i className="fas fa-globe text-white/20 text-5xl group-hover:text-blue-400/40 transition"></i>
                  <span className="absolute top-2 left-2 bg-black/50 text-gray-300 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm capitalize">{project.framework || 'html'}</span>
                </div>
                <div className="p-5">
                  <h3 className="text-white font-semibold text-base mb-1">{project.title}</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{project.prompt || project.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs flex items-center gap-1">
                      {project.avatar_url ? (
                        <img src={project.avatar_url} className="w-4 h-4 rounded-full" alt="" />
                      ) : (
                        <i className="fas fa-user"></i>
                      )}
                      {project.author || project.name || 'Anonymous'}
                    </span>
                    {project.id && typeof project.id === 'number' && (
                      <button onClick={() => navigate(`/view/${project.id}`)} className="text-blue-400 text-xs hover:text-blue-300 transition">
                        <i className="fas fa-eye mr-1"></i>Preview
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <button onClick={() => navigate(token ? '/projects/new' : '/auth')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition shadow-lg shadow-blue-500/20">
            <i className="fas fa-wand-magic-sparkles mr-2"></i>Build Your Own
          </button>
        </div>
      </div>
    </div>
  )
}

export default Community