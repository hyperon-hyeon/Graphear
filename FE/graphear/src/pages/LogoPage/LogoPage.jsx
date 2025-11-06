import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import './LogoPage.css'; 

function LogoPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    console.log('버튼이 클릭되었습니다. 홈 페이지로 이동합니다.');
    navigate('/home');
  };

  return (
    <div className="logo-page-container" onClick={handleClick}>
      <div className="logo-content">
        <div className="logo-image">
          <img src={logo} alt="앱 로고" />
        </div>
        <div className='logo-text'>
          <h2> Graphear </h2>
          <h1> 그래피어 </h1>
        </div>
      </div>
    </div>
  );
}

export default LogoPage;