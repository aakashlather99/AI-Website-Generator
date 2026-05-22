import { useEffect, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { AppContext } from '../context/AppContext'

const Admin = () => {
  const { user } = useContext(AppContext)
  const navigate = useNavigate()
  const [tab, setTab] = useState<'overview' | 'users' | 'generations' | 'logs'>('overview')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [generations, setGenerations] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return }
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      const [s, a] = await Promise.all([api.get('/api/admin/stats'), api.get('/api/admin/analytics')])
      setStats(s.data.stats)
      setAnalytics(a.data.analytics)
    } catch { toast.error('Failed to load admin data') }
    finally { setLoading(false) }
  }

  const loadUsers = async (search = '') => {
    try {
      const { data } = await api.get(`/api/admin/users?search=${search}`)
      if (data.success) setUsers(data.users)
    } catch { /* silent */ }
  }

  const loadGenerations = async () => {
    try {
      const { data } = await api.get('/api/admin/generations')
      if (data.success) setGenerations(data.generations)
    } catch { /* silent */ }
  }

  const loadLogs = async () => {
    try {
      const { data } = await api.get('/api/admin/logs')
      if (data.success) setLogs(data.logs)
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (tab === 'users') loadUsers(searchQuery)
    if (tab === 'generations') loadGenerations()
    if (tab === 'logs') loadLogs()
  }, [tab])

  const handleBanUser = async (userId: number, ban: boolean) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { is_banned: ban })
      toast.success(ban ? 'User banned' : 'User unbanned')
      loadUsers(searchQuery)
    } catch { toast.error('Failed') }
  }

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { role })
      toast.success('Role updated')
      loadUsers(searchQuery)
    } catch { toast.error('Failed') }
  }

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: 'fa-users', color: 'blue' },
    { label: 'Total Projects', value: stats.totalProjects, icon: 'fa-folder', color: 'purple' },
    { label: 'Generations', value: stats.totalGenerations, icon: 'fa-wand-magic-sparkles', color: 'green' },
    { label: 'Failed', value: stats.failed, icon: 'fa-triangle-exclamation', color: 'red' },
  ] : []

  if (loading) return <div className="min-h-screen flex items-center justify-center"><i className="fas fa-spinner fa-spin text-blue-400 text-4xl"></i></div>

  return (
    <div className="min-h-screen pt-20 px-4 pb-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
            <i className="fas fa-shield-halved text-white"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">System overview and management</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 bg-white/5 p-1 rounded-xl w-fit">
          {(['overview', 'users', 'generations', 'logs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map((s, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className={`w-10 h-10 bg-${s.color}-500/20 rounded-xl flex items-center justify-center mb-3`}>
                    <i className={`fas ${s.icon} text-${s.color}-400`}></i>
                  </div>
                  <p className="text-2xl font-bold text-white">{s.value?.toLocaleString()}</p>
                  <p className="text-gray-500 text-sm">{s.label}</p>
                </div>
              ))}
            </div>

            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-white font-semibold mb-4">Top Frameworks</h3>
                  {analytics.topFrameworks?.map((fw: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-gray-300 text-sm capitalize">{fw.framework || 'html'}</span>
                      <span className="text-blue-400 font-semibold">{fw.count}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-white font-semibold mb-4">Recent Signups (30d)</h3>
                  {analytics.dailySignups?.slice(-7).map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-gray-400 text-sm">{new Date(d.date).toLocaleDateString()}</span>
                      <span className="text-green-400 font-semibold">+{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'users' && (
          <>
            <div className="mb-4">
              <input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); loadUsers(e.target.value) }}
                placeholder="Search users..." className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full max-w-sm text-sm" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">User</th>
                    <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Role</th>
                    <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Credits</th>
                    <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Tier</th>
                    <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Status</th>
                    <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{u.name}</p>
                        <p className="text-gray-500 text-xs">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-white/10 text-gray-300 text-xs rounded-lg px-2 py-1 border-0 focus:outline-none">
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-yellow-400 text-sm font-medium">{u.credits}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs capitalize">{u.subscription_tier}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_banned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {u.is_banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleBanUser(u.id, !u.is_banned)}
                          className={`text-xs px-2 py-1 rounded-lg transition ${u.is_banned ? 'text-green-400 hover:bg-green-500/10' : 'text-red-400 hover:bg-red-500/10'}`}>
                          {u.is_banned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'generations' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">User</th>
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Prompt</th>
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Framework</th>
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Status</th>
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Duration</th>
                  <th className="text-left text-gray-400 text-xs font-medium px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {generations.map(g => (
                  <tr key={g.id} className="border-b border-white/5">
                    <td className="px-4 py-3 text-white text-sm">{g.user_name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{g.prompt?.substring(0, 80)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs capitalize">{g.framework}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${g.status === 'completed' ? 'bg-green-500/20 text-green-400' : g.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{g.duration_ms ? `${(g.duration_ms / 1000).toFixed(1)}s` : '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(g.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'logs' && (
          <div className="space-y-2">
            {logs.map(l => (
              <div key={l.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm"><span className="text-blue-400">{l.admin_name}</span> — {l.action}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{l.target_type} #{l.target_id}</p>
                </div>
                <span className="text-gray-500 text-xs">{new Date(l.created_at).toLocaleString()}</span>
              </div>
            ))}
            {logs.length === 0 && <p className="text-center text-gray-500 py-10">No admin logs yet</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default Admin
