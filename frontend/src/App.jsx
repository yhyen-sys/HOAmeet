import { useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import Login from './pages/Login'

import Dashboard from './pages/Dashboard'
import CreateMeeting from './pages/CreateMeeting'

import AdminUsers from './pages/AdminUsers'
import Calendar from './pages/Calendar'
import ChaseUpList from './pages/ChaseUpList'
import AckPage from './pages/AckPage'

// Private Route Guard
const PrivateRoute = ({ children }) => {
  const isAuth = useAuthStore(state => state.isAuth)
  return isAuth ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Router>
      <div className="w-full min-h-screen font-inter text-stone-100 relative">
        {/* Background Blobs (Global) */}
        <div className="bg-blob bg-amber-500 top-[-10vw] right-[-10vw] w-[40vw] h-[40vw]"></div>
        <div className="bg-blob bg-amber-500 bottom-[-10vw] left-[-10vw] w-[40vw] h-[40vw]"></div>

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/ack" element={<AckPage />} />

          {/* Protected Routes */}
          <Route path="/" element={<PrivateRoute><Navigate to="/dashboard" replace /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/calendar/:uuid" element={<PrivateRoute><Calendar /></PrivateRoute>} />
          <Route path="/meetings/new" element={<PrivateRoute><CreateMeeting /></PrivateRoute>} />
          <Route path="/meetings/edit/:uuid" element={<PrivateRoute><CreateMeeting /></PrivateRoute>} />

          {/* Admin Routes - Should be protected by Role later */}
          <Route path="/admin/users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/chase-up/:uuid" element={<PrivateRoute><ChaseUpList /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
