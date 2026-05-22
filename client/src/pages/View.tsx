import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

const View = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [htmlCode, setHtmlCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      loadProject()
    }
  }, [id])

  const loadProject = async () => {
    try {
      const { data } = await api.get(`/api/projects/community/${id}`)
      if (data.success) {
        setHtmlCode(data.project.html_code)
      }
    } catch {
      setError('Project not found or access denied')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-blue-400 text-4xl mb-4 block"></i>
          <p className="text-gray-400">Loading website...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-red-400 text-4xl mb-4 block"></i>
          <p className="text-white font-semibold mb-2">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-400 hover:text-blue-300 text-sm transition"
          >
            ← Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 bg-[#0f0f0f]">
      {/* Toolbar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-[#111] border-b border-white/10 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white text-sm transition"
        >
          <i className="fas fa-arrow-left mr-2"></i>Back
        </button>
        <button
          onClick={() => {
            const blob = new Blob([htmlCode], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'website.html'
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="bg-green-600/20 text-green-400 hover:bg-green-600/30 px-4 py-1.5 rounded-lg text-sm transition"
        >
          <i className="fas fa-download mr-1.5"></i>Download
        </button>
      </div>

      {/* Website Preview */}
      <div className="pt-12 h-screen">
        <iframe
          srcDoc={htmlCode}
          className="w-full h-full border-0"
          title="Website View"
          sandbox="allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  )
}

export default View