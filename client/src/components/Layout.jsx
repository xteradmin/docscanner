import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: 'Scanner', icon: '📷' },
  { path: '/tools', label: 'PDF Tools', icon: '🛠' }
]

function Layout({ children }) {
  const { pathname } = useLocation()

  return (
    <div className="app">
      <nav className="main-nav">
        <div className="nav-brand">
          <Link to="/" className="nav-logo">DocScanner</Link>
        </div>
        <div className="nav-links">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  )
}

export default Layout
