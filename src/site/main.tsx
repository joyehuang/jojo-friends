import '@fontsource-variable/fraunces/index.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './site.css'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App'
import { loadPage } from './pages'
import { setServerUrl } from './router'
import { matchRoute } from './routes'

// Pages are prerendered to HTML at build time; the client loads the current
// page's chunk and then hydrates the same markup (same path the build used).
const root = document.getElementById('root')!
setServerUrl(location.pathname)
history.scrollRestoration = 'manual'
loadPage(matchRoute(location.pathname).kind).then(() => {
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  )
  if (root.firstElementChild) hydrateRoot(root, app)
  else createRoot(root).render(app)
})
