import React from 'react';
import './StudentHeader.css';

function StudentHeader({ studentName }) { 
  return (
    <header className="student-header">
      <h1 className="header-greeting">
          {studentName}님 안녕하세요!
      </h1>
    </header>
  );
}

export default StudentHeader;