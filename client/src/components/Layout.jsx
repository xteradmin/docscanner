import { Link } from 'react-router-dom'

function Layout({ children }) {
  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1>DocScanner</h1>
          <nav>
            <Link to="/" style={{ color: 'white', marginRight: '20px' }}>Scanner</Link>
            <Link to="/documents" style={{ color: 'white' }}>Documents</Link>
          </nav>
        </div>
      </header>
      <main className="container">
        {children}
      </main>
    </div>
  )
}

export default Layout
