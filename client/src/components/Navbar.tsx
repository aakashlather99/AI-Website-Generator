import { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

const Navbar = () => {
  const { user, logout, token } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const navLink = (to: string, label: string, icon?: string) => (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      className={`flex items-center gap-1.5 text-sm transition-colors ${isActive(to) ? 'text-blue-400' : 'text-gray-300 hover:text-white'}`}
    >
      {icon && <i className={`fas ${icon} text-xs`}></i>}
      {label}
    </Link>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f0f]/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
              <i className="fas fa-wand-magic-sparkles text-white text-sm"></i>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">SiteForge <span className="text-blue-400">AI</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            {token ? (
              <>
                {navLink('/projects/new', 'Builder', 'fa-hammer')}
                {navLink('/projects', 'My Projects', 'fa-folder')}
                {navLink('/templates', 'Templates', 'fa-layer-group')}
                {navLink('/community', 'Community', 'fa-users')}
                {navLink('/settings', 'Settings', 'fa-gear')}
                {user?.role === 'admin' && navLink('/admin', 'Admin', 'fa-shield-halved')}
                <Link to="/pricing" className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-yellow-500/30 hover:border-yellow-500/50 transition" onClick={() => setMenuOpen(false)}>
                  <i className="fas fa-coins"></i>
                  {user?.credits ?? 0} Credits
                </Link>
                <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                  <div className="flex items-center gap-2">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full border border-white/20" />
                    ) : (
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-gray-400 text-sm max-w-[100px] truncate">{user?.name}</span>
                  </div>
                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="text-gray-500 hover:text-red-400 transition text-sm"
                    title="Logout"
                  >
                    <i className="fas fa-right-from-bracket"></i>
                  </button>
                </div>
              </>
            ) : (
              <>
                {navLink('/community', 'Community', 'fa-users')}
                {navLink('/pricing', 'Pricing', 'fa-tags')}
                <Link to="/auth" className="text-gray-300 hover:text-white text-sm transition">Login</Link>
                <Link to="/auth" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden text-gray-300 cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>
            <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-3 border-t border-white/10 pt-4 animate-fade-in">
            {token ? (
              <>
                {navLink('/projects/new', 'Builder', 'fa-hammer')}
                {navLink('/projects', 'My Projects', 'fa-folder')}
                {navLink('/templates', 'Templates', 'fa-layer-group')}
                {navLink('/community', 'Community', 'fa-users')}
                {navLink('/settings', 'Settings', 'fa-gear')}
                {user?.role === 'admin' && navLink('/admin', 'Admin', 'fa-shield-halved')}
                <Link to="/pricing" className="text-yellow-400 text-sm" onClick={() => setMenuOpen(false)}>
                  <i className="fas fa-coins mr-1"></i>{user?.credits} Credits
                </Link>
                <button onClick={() => { logout(); navigate('/'); setMenuOpen(false); }} className="text-red-400 text-sm text-left cursor-pointer">
                  <i className="fas fa-right-from-bracket mr-1"></i>Logout
                </button>
              </>
            ) : (
              <>
                {navLink('/community', 'Community')}
                {navLink('/pricing', 'Pricing')}
                <Link to="/auth" className="text-gray-300 text-sm" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/auth" className="text-blue-400 text-sm font-semibold" onClick={() => setMenuOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
