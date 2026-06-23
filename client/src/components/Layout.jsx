import { Link } from 'react-router-dom'

function Layout({ children }) {
  return (
    <div className="app">
      <nav className="main-nav">
        <div className="nav-brand">
          <Link to="/" className="nav-logo">DocScanner</Link>
        </div>
      </nav>
      {children}
    </div>
  )
}

export default Layout
