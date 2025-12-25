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
  
  const DUMMY_USER = {
    studentName: '김공부',
  };

  useEffect(() => {
      const handleInitialSetup = async () => {
      };
      handleInitialSetup();
    }, []);

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

      {/* 🚨 수정됨: HomePage.jsx의 요청대로 주소 변경 (/pdf-extractor -> /pdf-converter) */}
      <Route path="/pdf-converter" element={
        <ProtectedRoute>
          <PDF handleLogout={handleLogout} />
        </ProtectedRoute>
      } />

      {/* 🚨 수정됨: HomePage.jsx의 요청대로 주소 변경 (/listen -> /solve) */}
      <Route path="/solve" element={
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