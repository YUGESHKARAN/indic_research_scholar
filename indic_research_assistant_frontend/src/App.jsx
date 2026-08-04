import React from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider } from '../src/AuthContext'
import { ProtectedRoute } from '../src/Protectedroute '
import Landing from '../src/components/Landing'
import Ingest from '../src/components/Ingest'
import Retrieval from '../src/components/Retrieval'
import Login from '../src/auth/Login'
import Register from '../src/auth/Register'
import { Analytics } from '@vercel/analytics/react'

function AppRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
    </AnimatePresence>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Analytics />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App