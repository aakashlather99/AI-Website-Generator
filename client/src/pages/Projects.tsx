import { useState, useContext, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { AppContext } from '../context/AppContext'
import CodeEditor from '../components/CodeEditor'
import PreviewFrame from '../components/PreviewFrame'
import VersionTimeline from '../components/VersionTimeline'
import { useAIJobPolling } from '../hooks/useAIJobPolling'
import type { Version } from '../types'

const FRAMEWORKS = [
  { id: 'html', label: 'HTML/CSS/JS', icon: 'fa-code' },
  { id: 'react', label: 'React', icon: 'fa-react fab' },
  { id: 'nextjs', label: 'Next.js', icon: 'fa-n' },
]

const Projects = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user, updateCredits } = useContext(AppContext)
  const { result, error, startPolling } = useAIJobPolling()
  const [prompt, setPrompt] = useState('')
  const [htmlCode, setHtmlCode] = useState('')
  const [editableCode, setEditableCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(projectId || null)
  const [framework, setFramework] = useState('html')
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [currentVersion, setCurrentVersion] = useState(1)
  const [improvementMode, setImprovementMode] = useState(false)
  const [improvementPrompt, setImprovementPrompt] = useState('')
  const [projectTitle, setProjectTitle] = useState('')

  const loadProject = async (id: string) => {
    try {
      const { data } = await api.get(`/api/projects/${id}`)
      if (data.success) {
        setHtmlCode(data.project.html_code || '')
        setPrompt(data.project.prompt || '')
        setCurrentProjectId(data.project.id.toString())
        setFramework(data.project.framework || 'html')
        setVersions(data.project.versions || [])
        setCurrentVersion(data.project.current_version || 1)
        setProjectTitle(data.project.title || '')
      }
    } catch {
      toast.error('Failed to load project')
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error('Enter a prompt')
    if (user && user.credits <= 0) { toast.error('No credits! Purchase more.'); navigate('/pricing'); return }

    setLoading(true)
    try {
      // Send generation request and get job ID
      const { data } = await api.post('/api/ai/generate', { prompt, projectId: currentProjectId, framework })
      if (data.success) {
        toast.success('Generation started... Processing your request')
        toast.loading('⏳ Generating website (usually 30-60 seconds)')
        // Start polling for job completion
        startPolling(data.jobId)
      } else {
        toast.error(data.message || 'Failed to queue generation')
        setLoading(false)
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Generation request failed')
      setLoading(false)
    }
  }

  const handleImprove = async () => {
    if (!improvementPrompt.trim() || !currentProjectId) return
    if (user && user.credits <= 0) { toast.error('No credits!'); return }

    setLoading(true)
    try {
      const { data } = await api.post('/api/ai/improve', { projectId: currentProjectId, improvementPrompt })
      if (data.success) {
        setHtmlCode(data.htmlCode)
        updateCredits(data.credits)
        setImprovementPrompt('')
        setImprovementMode(false)
        toast.success('Design improved!')
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || 'Improvement failed')
    }
    finally { setLoading(false) }
  }

  // Handle job completion
  useEffect(() => {
    if (result && result.success) {
      setHtmlCode(result.htmlCode)
      setCurrentProjectId(result.project.id.toString())
      updateCredits(result.credits)
      setActiveTab('preview')
      setProjectTitle(result.project.title)
      toast.success('Website generated successfully!')
      if (!projectId || projectId === 'new') navigate(`/projects/${result.project.id}`, { replace: true })
      if (result.project.id) {
        api.get(`/api/projects/${result.project.id}/versions`)
          .then(vr => {
            if (vr.data.success) { setVersions(vr.data.versions); setCurrentVersion(result.project.current_version) }
          })
          .catch(() => {})
      }
      setLoading(false)
    } else if (error) {
      toast.error(error)
      setLoading(false)
    }
  }, [result, error, projectId, navigate, updateCredits])

  useEffect(() => {
    if (projectId && projectId !== 'new') {
      loadProject(projectId)
    }
  }, [projectId])

  useEffect(() => {
    setEditableCode(htmlCode)
  }, [htmlCode])

  const handleRollback = async (versionId: number) => {
    if (!currentProjectId) return
    try {
      const { data } = await api.post(`/api/projects/${currentProjectId}/rollback/${versionId}`)
      if (data.success) { setHtmlCode(data.htmlCode); toast.success('Rolled back!'); loadProject(currentProjectId) }
    } catch { toast.error('Rollback failed') }
  }

  const handleDownload = async () => {
    if (!currentProjectId) {
      const blob = new Blob([htmlCode], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'website.html'; a.click()
      URL.revokeObjectURL(url); toast.success('Downloaded!'); return
    }
    try {
      const response = await api.get(`/api/projects/${currentProjectId}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a'); a.href = url; a.download = `${projectTitle || 'website'}.zip`; a.click()
      URL.revokeObjectURL(url); toast.success('ZIP downloaded!')
    } catch { toast.error('Download failed') }
  }

  const handleSaveCode = async () => {
    if (!currentProjectId || editableCode === htmlCode) return
    try {
      await api.put(`/api/projects/${currentProjectId}`, { html_code: editableCode })
      setHtmlCode(editableCode)
      toast.success('Code saved!')
    } catch { toast.error('Save failed') }
  }

  const handlePublish = async () => {
    if (!currentProjectId) return
    try {
      await api.post(`/api/projects/${currentProjectId}/publish`)
      toast.success('Published to community!')
    } catch { toast.error('Publish failed') }
  }

  return (
    <div className="flex flex-col h-screen pt-16 bg-[#0a0a0f]">
      {/* Prompt Bar */}
      <div className="p-4 border-b border-white/10 bg-[#0f0f18]">
        <div className="max-w-6xl mx-auto">
          {/* Framework selector */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-500 text-xs">Framework:</span>
            {FRAMEWORKS.map((fw) => (
              <button key={fw.id} onClick={() => setFramework(fw.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${framework === fw.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'}`}>
                <i className={`${fw.icon.includes('fab') ? fw.icon : `fas ${fw.icon}`} mr-1`}></i>{fw.label}
              </button>
            ))}
          </div>

          {improvementMode ? (
            <div className="flex gap-3">
              <textarea value={improvementPrompt} onChange={(e) => setImprovementPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleImprove() } }}
                placeholder="Describe improvements... e.g. 'Make the hero section more impactful with a video background'"
                rows={2} className="flex-1 bg-white/5 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none text-sm" />
              <div className="flex flex-col gap-1.5 self-end">
                <button onClick={handleImprove} disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                  {loading ? <><i className="fas fa-spinner fa-spin mr-1"></i>Improving...</> : <><i className="fas fa-magic mr-1"></i>Improve</>}
                </button>
                <button onClick={() => setImprovementMode(false)} className="text-gray-400 hover:text-white text-xs transition">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate() } }}
                placeholder="Describe your website... e.g. 'A modern SaaS landing page for a project management tool with dark theme, pricing cards, and testimonials'"
                rows={2} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none text-sm" />
              <button onClick={handleGenerate} disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50 flex items-center gap-2 self-end shadow-lg shadow-blue-500/20">
                {loading ? (<><i className="fas fa-spinner fa-spin"></i>Generating...</>) : (<><i className="fas fa-wand-magic-sparkles"></i>Generate</>)}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs + Actions */}
      {htmlCode && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0f0f18]">
          <div className="flex gap-1.5">
            {(['preview', 'code'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <i className={`fas ${tab === 'preview' ? 'fa-eye' : 'fa-code'} mr-1.5`}></i>{tab}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {!improvementMode && htmlCode && (
              <button onClick={() => setImprovementMode(true)} className="bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 px-3 py-1.5 rounded-lg text-xs transition">
                <i className="fas fa-magic mr-1"></i>Improve
              </button>
            )}
            <button onClick={() => setShowVersions(!showVersions)} className="bg-white/10 text-gray-300 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs transition">
              <i className="fas fa-clock-rotate-left mr-1"></i>v{currentVersion}
            </button>
            {activeTab === 'code' && editableCode !== htmlCode && (
              <button onClick={handleSaveCode} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1.5 rounded-lg text-xs transition">
                <i className="fas fa-save mr-1"></i>Save
              </button>
            )}
            <button onClick={handlePublish} className="bg-white/10 text-gray-300 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs transition">
              <i className="fas fa-share mr-1"></i>Publish
            </button>
            <button onClick={handleDownload} className="bg-green-600/20 text-green-400 hover:bg-green-600/30 px-3 py-1.5 rounded-lg text-xs transition">
              <i className="fas fa-download mr-1"></i>Download ZIP
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden">
          {!htmlCode ? (
            <div className="flex items-center justify-center h-full text-center px-4">
              <div>
                <div className="w-28 h-28 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-float border border-blue-500/20">
                  <i className="fas fa-wand-magic-sparkles text-blue-400 text-5xl"></i>
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Start Building</h2>
                <p className="text-gray-400 max-w-md mx-auto mb-4">
                  Describe your dream website above and let our 5-agent AI pipeline create it for you in seconds.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {['SaaS Landing Page', 'Portfolio', 'Restaurant', 'E-commerce', 'Blog'].map((s) => (
                    <button key={s} onClick={() => setPrompt(`Create a modern ${s.toLowerCase()} website with dark theme, animations, and responsive design`)}
                      className="bg-white/5 border border-white/10 text-gray-400 px-3 py-1.5 rounded-full text-xs hover:border-blue-500/30 hover:text-blue-400 transition">
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-yellow-400 text-sm mt-6">
                  <i className="fas fa-coins mr-1"></i>{user?.credits} credit{user?.credits !== 1 ? 's' : ''} remaining
                </p>
              </div>
            </div>
          ) : activeTab === 'preview' ? (
            <PreviewFrame code={htmlCode} className="w-full h-full" />
          ) : (
            <CodeEditor code={editableCode} onChange={setEditableCode} language={framework === 'react' ? 'jsx' : 'html'} />
          )}
        </div>

        {/* Versions sidebar */}
        {showVersions && (
          <div className="w-72 border-l border-white/10 bg-[#0f0f18] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Version History</h3>
              <button onClick={() => setShowVersions(false)} title="Close version history" className="text-gray-500 hover:text-white transition">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <VersionTimeline versions={versions} currentVersion={currentVersion} onRollback={handleRollback} />
          </div>
        )}
      </div>
    </div>
  )
}

export default Projects