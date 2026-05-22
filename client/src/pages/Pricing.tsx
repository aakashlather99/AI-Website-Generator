import { useContext, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { AppContext } from '../context/AppContext'

const plans = [
  {
    id: 'basic', name: 'Basic', credits: 50, price: 9.99, color: 'blue',
    features: ['50 AI generations', 'All frameworks', 'Download ZIP', 'Email support'],
  },
  {
    id: 'pro', name: 'Pro', credits: 150, price: 19.99, color: 'purple', popular: true,
    features: ['150 AI generations', 'Priority support', 'Advanced AI prompts', 'Version history', 'Templates'],
  },
  {
    id: 'enterprise', name: 'Enterprise', credits: 500, price: 49.99, color: 'yellow',
    features: ['500 AI generations', '24/7 support', 'Multi-page generation', 'API access', 'Team features'],
  },
]

const Pricing = () => {
  const { user, fetchUser, token } = useContext(AppContext)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment successful! Credits added.')
      fetchUser()
    } else if (searchParams.get('canceled') === 'true') {
      toast.error('Payment canceled.')
    }
  }, [])

  const handleBuy = async (planId: string) => {
    if (!token) { navigate('/auth'); return }

    try {
      const { data } = await api.post('/api/payment/create-checkout-session', { plan: planId })
      if (!data.success) throw new Error(data.message)

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Payment failed')
    }
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-16">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-white mb-3">Buy Credits</h1>
        <p className="text-gray-400 mb-3">Each credit = 1 AI website generation</p>
        {token && (
          <p className="text-yellow-400 text-sm mb-12">
            <i className="fas fa-coins mr-1"></i>You have <strong>{user?.credits}</strong> credits remaining
          </p>
        )}
        {!token && <p className="text-gray-500 text-sm mb-12">Sign up to get 5 free generation credits!</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id}
              className={`relative bg-white/5 border rounded-2xl p-6 text-left transition-all duration-300 hover:scale-105 ${
                plan.popular ? 'border-purple-500/50 ring-1 ring-purple-500/30' : 'border-white/10'
              }`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                  MOST POPULAR
                </div>
              )}
              <h3 className="text-white text-xl font-bold mb-1">{plan.name}</h3>
              <div className="text-3xl font-bold text-white mb-1">${plan.price}</div>
              <p className="text-gray-400 text-sm mb-5">{plan.credits} credits</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-center gap-2">
                    <i className="fas fa-check text-green-400 text-xs"></i>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => handleBuy(plan.id)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}>
                Buy {plan.name}
              </button>
            </div>
          ))}
        </div>

        <p className="text-gray-500 text-xs mt-8">
          <i className="fas fa-lock mr-1"></i>Secure payment powered by Stripe. One-time purchase.
        </p>
      </div>
    </div>
  )
}

export default Pricing
