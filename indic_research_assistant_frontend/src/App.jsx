import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './components/Landing'
import Ingest from './components/Ingest'
import Retrieval from './components/Retrieval'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/ingest" element={<Ingest />} />
        <Route path="/ask" element={<Retrieval />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App