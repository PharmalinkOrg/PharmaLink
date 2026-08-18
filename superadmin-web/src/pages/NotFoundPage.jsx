import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section>
      <h2 className="page-title">Page not found</h2>
      <p className="page-copy">
        Return to the <Link to="/">dashboard</Link>.
      </p>
    </section>
  )
}

export default NotFoundPage
