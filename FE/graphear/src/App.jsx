import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Logo from './pages/LogoPage/LogoPage.jsx';
import Home from './pages/HomePage/HomePage.jsx';
import PDF from './pages/PDFPage/PDFUploader.jsx';
import Audio from './pages/AudioPage/FinalAudioPage.jsx';

const ProtectedRoute = ({ children }) => {
  return children; 
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  //const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  
  const DUMMY_USER = {
    studentName: '김공부',
  };

  useEffect(() => {
      const handleInitialSetup = async () => {
      };
      handleInitialSetup();
    }, []);

    const handleLoginSuccess = () => {
      console.log('더미 로그인 성공 처리');
    };

    const handleLogout = () => {
      console.log('더미 로그아웃 처리');
    };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/wait" replace />} />
      
      <Route path="/wait" element={
        <ProtectedRoute>
          <Logo handleLogout={handleLogout} />
        </ProtectedRoute>
      } />

      <Route path="/home" element={
        <ProtectedRoute>
          <Home handleLogout={handleLogout} studentName={DUMMY_USER.studentName}/>
        </ProtectedRoute>
      } />

      <Route path="/pdf-extractor" element={
        <ProtectedRoute>
          <PDF handleLogout={handleLogout} />
        </ProtectedRoute>
      } />

      <Route path="/listen" element={
        <ProtectedRoute>
          <Audio handleLogout={handleLogout} />
        </ProtectedRoute>
      } />

      <Route path="/wrong-review" element={
        <ProtectedRoute>
          <Logo handleLogout={handleLogout} />
        </ProtectedRoute>
      } />
      
    </Routes>
  );
}

export default App;