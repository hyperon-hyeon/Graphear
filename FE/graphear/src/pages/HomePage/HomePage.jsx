import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/StudentHeader.jsx'; 
import './HomePage.css';

function HomePage({ onLoginSuccess,studentName }) {
  const navigate = useNavigate();
  
  const handleClick = (path) => {
    console.log('버튼이 클릭되었습니다.');
    navigate(path);
  };

  return (
    <div>
      <Header studentName={studentName} />
      <div className="home-main-section">
        <div className="pdf-box full-width-box choose-box" onClick={() => handleClick('/pdf-converter')}>
            <h2>PDF 변환하기</h2>
          </div>

          <div className='solveNwrong'>
            <div className="half-width-box choose-box" onClick={() => handleClick('/solve')}>
              <h2>문제 풀기</h2>
            </div>
            <div className="half-width-box choose-box" onClick={() => handleClick('/wrong-review')}>
              <h2>오답 공부하기</h2>
            </div>

          </div>
      </div>
    </div>
  );
}

export default HomePage;