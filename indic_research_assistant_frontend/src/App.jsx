import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../src/AuthContext'
import { ProtectedRoute } from '../src/Protectedroute '
import Landing from '../src/components/Landing'
import Ingest from '../src/components/Ingest'
import Retrieval from '../src/components/Retrieval'
import Login from '../src/auth/Login'
import Register from '../src/auth/Register'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/ingest"
            element={
              <ProtectedRoute>
                <Ingest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ask"
            element={
              <ProtectedRoute>
                <Retrieval />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App