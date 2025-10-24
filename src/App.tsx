import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import CanvasZoom from './CanvasZoom'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <CanvasZoom />
    </div>
  )
}

export default App
