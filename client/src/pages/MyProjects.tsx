import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

interface ProjectItem {
  id: number; title: string; prompt: string; framework: string;
  is_published: boolean; current_version: number; updated_at: string; created_at: string;
}

const MyProjects = () => {
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const navigate = useNavigate()

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/api/projects')
      if (data.success) setProjects(data.projects)
    } catch { toast.error('Failed to load projects') }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    try {
      await api.delete(`/api/projects/${id}`)
      setProjects((prev) => prev.filter((p) => p.id !== id))
      toast.success('Project deleted')
    } catch { toast.error('Failed to delete') }
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.framework === filter)

  const fwColors: Record<string, string> = { html: 'text-orange-400 bg-orange-500/10', react: 'text-cyan-400 bg-cyan-500/10', nextjs: 'text-white bg-white/10' }

  return (
    <div className="min-h-screen pt-24 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Projects</h1>
            <p className="text-gray-400 mt-1">{projects.length} website{projects.length !== 1 ? 's' : ''} created</p>
          </div>
          <button onClick={() => navigate('/projects/new')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-blue-500/20">
            <i className="fas fa-plus mr-2"></i>New Project
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'html', 'react', 'nextjs'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-400 bg-white/5 hover:bg-white/10'}`}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-20"><i className="fas fa-spinner fa-spin text-3xl mb-4 block"></i>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-folder-open text-gray-500 text-3xl"></i>
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first AI website</p>
            <button onClick={() => navigate('/projects/new')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">Start Building</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 cursor-pointer hover:border-blue-500/40 transition-all duration-300 group hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl flex items-center justify-center">
                      <i className="fas fa-globe text-blue-400"></i>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fwColors[p.framework] || 'text-gray-400 bg-white/10'}`}>
                      {p.framework?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    {p.is_published && <span className="text-green-400 text-xs" title="Published"><i className="fas fa-globe"></i></span>}
                    <button onClick={(e) => handleDelete(p.id, e)} className="text-gray-500 hover:text-red-400 transition">
                      <i className="fas fa-trash text-sm"></i>
                    </button>
                  </div>
                </div>
                <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">{p.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-gray-500 text-xs">
                    {new Date(p.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <span className="text-gray-600 text-xs">v{p.current_version}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyProjects