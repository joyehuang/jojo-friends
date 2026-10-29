import '@fontsource/ibm-plex-mono/600.css'
import { createRoot } from 'react-dom/client'
import { TownApp } from './ui/TownApp'
import './ui/styles.css'

createRoot(document.getElementById('root')!).render(<TownApp />)
