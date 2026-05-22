import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'

const Home = () => {
  const navigate = useNavigate()
  const { token } = useContext(AppContext)

  const features = [
    { icon: 'fa-bolt', title: 'Lightning Fast', desc: 'Generate complete websites in under 10 seconds with AI.' },
    { icon: 'fa-wand-magic-sparkles', title: 'AI Powered', desc: 'Powered by Google Gemini for stunning, unique designs.' },
    { icon: 'fa-code', title: 'Clean Code', desc: 'Export production-ready HTML, CSS & JS instantly.' },
    { icon: 'fa-mobile-screen', title: 'Responsive', desc: 'Every generated site is fully mobile-responsive.' },
    { icon: 'fa-palette', title: 'Beautiful Design', desc: 'Modern UI with animations, gradients and effects.' },
    { icon: 'fa-cloud-arrow-down', title: 'One-Click Export', desc: 'Download your site as a complete HTML file.' },
  ]

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="min-h-screen flex items-center justify-center text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-full text-sm mb-8">
            <i className="fas fa-sparkles"></i>
            Powered by Google Gemini AI
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight">
            Build Websites with{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI Magic
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Describe your dream website in plain English and watch AI build it in seconds.
            No coding required. Professional results guaranteed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(token ? '/projects/new' : '/auth')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition transform hover:scale-105 animate-pulse-glow"
            >
              <i className="fas fa-wand-magic-sparkles mr-2"></i>
              Start Building Free
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold transition border border-white/20"
            >
              View Pricing
            </button>
          </div>

          <p className="text-gray-500 text-sm mt-6">
            <i className="fas fa-gift mr-1 text-green-400"></i>
            1 free credit on signup • No credit card required
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-[#111]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4">Why SiteForge AI?</h2>
          <p className="text-gray-400 text-center mb-16">Everything you need to launch your website instantly</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300 group hover:transform hover:scale-[1.02]">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition">
                  <i className={`fas ${f.icon} text-blue-400 text-xl`}></i>
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-16">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Describe', desc: 'Tell AI what website you want in plain English', icon: 'fa-keyboard' },
              { step: '2', title: 'Generate', desc: 'AI creates a complete, stunning website instantly', icon: 'fa-wand-magic-sparkles' },
              { step: '3', title: 'Download', desc: 'Export your website as a ready-to-deploy HTML file', icon: 'fa-download' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className={`fas ${item.icon} text-white text-2xl`}></i>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Step {item.step}: {item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-2xl mx-auto bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-white/10 rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to build?</h2>
          <p className="text-gray-400 mb-8">Join thousands of creators using SiteForge AI</p>
          <button
            onClick={() => navigate(token ? '/projects/new' : '/auth')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-xl text-lg font-semibold transition transform hover:scale-105"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-gray-500 text-sm">
        <p>© 2026 SiteForge AI. Built with React + Node.js + Google Gemini</p>
      </footer>
    </div>
  )
}

export default Home