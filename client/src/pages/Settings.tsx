import { useContext, useState, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import api from '../services/api'
import toast from 'react-hot-toast'

const Settings = () => {
  const { user } = useContext(AppContext)
  const [billing, setBilling] = useState<any>(null)
  const [loadingBilling, setLoadingBilling] = useState(false)

  useEffect(() => {
    const loadBilling = async () => {
      setLoadingBilling(true)
      try {
        const { data } = await api.get('/api/payment/status')
        if (data.success) setBilling(data.billing)
      } catch { toast.error('Failed to load billing') }
      finally { setLoadingBilling(false) }
    }

    loadBilling()
  }, [])

  return (
    <div className="min-h-screen pt-24 px-4 pb-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        {/* Profile */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-4">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-2xl border border-white/20" />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white font-semibold">{user?.name}</p>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full mt-1 inline-block capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Subscription</h2>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Current Plan</span>
            <span className="text-white font-medium capitalize">{user?.subscription_tier || 'Free'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Credits Remaining</span>
            <span className="text-yellow-400 font-bold">{user?.credits}</span>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Credit History</h2>
          {loadingBilling ? (
            <p className="text-gray-500 text-sm text-center py-4"><i className="fas fa-spinner fa-spin mr-2"></i>Loading...</p>
          ) : billing?.transactions?.length > 0 ? (
            <div className="space-y-2">
              {billing.transactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm">{t.description}</p>
                    <p className="text-gray-500 text-xs">{new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold text-sm ${t.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </span>
                    <p className="text-gray-500 text-xs">Bal: {t.balance_after}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings
