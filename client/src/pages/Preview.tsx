import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

const Preview = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [htmlCode, setHtmlCode] = useState('')
  const [loading, setLoading] = useState(true)

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
      // Silently fail - show empty
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-blue-600 text-4xl mb-4 block"></i>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen">
      {/* Minimal floating toolbar */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => navigate(-1)}
          className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs hover:bg-black/80 transition"
        >
          <i className="fas fa-times mr-1"></i>Close
        </button>
      </div>

      <iframe
        srcDoc={htmlCode}
        className="w-full h-full border-0"
        title="Full Preview"
        sandbox="allow-scripts allow-forms allow-popups"
      />
    </div>
  )
}

export default Preview