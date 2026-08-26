import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SignIn from '@/pages/auth/SignIn'
import { useEffect } from 'react'
import AdminAccessDenied from '@/pages/error/AdminAccessDenied'

const App = () => {
  useEffect(() => {

  }, [])
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/auth/login" element={<AdminAccessDenied />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App