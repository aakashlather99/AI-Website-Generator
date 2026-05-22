import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import TemplateCard from '../components/TemplateCard'
import type { Template } from '../types'

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchTemplates()
    fetchCategories()
  }, [])

  const fetchTemplates = async (category?: string) => {
    try {
      const params = category && category !== 'all' ? `?category=${category}` : ''
      const { data } = await api.get(`/api/templates${params}`)
      if (data.success) setTemplates(data.templates)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/api/templates/categories')
      if (data.success) setCategories(data.categories)
    } catch { /* silent */ }
  }

  const handleUseTemplate = (template: Template) => {
    navigate('/projects/new', { state: { templatePrompt: template.prompt_hint || `Create a ${template.title} website`, templateCode: template.html_code } })
  }

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat)
    setLoading(true)
    fetchTemplates(cat)
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Template Library</h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Start with a professionally designed template and customize it with AI.
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button onClick={() => handleCategoryChange('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeCategory === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 bg-white/5 hover:bg-white/10'}`}>
            All
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition capitalize ${activeCategory === cat ? 'bg-blue-600 text-white' : 'text-gray-400 bg-white/5 hover:bg-white/10'}`}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400"><i className="fas fa-spinner fa-spin text-3xl mb-4 block"></i>Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-layer-group text-gray-500 text-3xl"></i>
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-gray-400 text-sm">Templates will appear here once added by admins.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(t => (
              <TemplateCard key={t.id} template={t} onUse={handleUseTemplate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Templates
