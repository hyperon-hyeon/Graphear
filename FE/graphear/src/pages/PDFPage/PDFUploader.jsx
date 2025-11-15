import React, { useState, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';
import './PDFUploader.css'; 

const API_URL = 'http://localhost:3001/api/extract-text';

const ExtractedTextDisplay = ({ text }) => (
    // **수정된 클래스**: pdf-display-panel
    <div className="pdf-display-panel">
        <h2 className="display-title">
            추출된 텍스트
        </h2>
        {text ? (
            <pre className="extracted-text-content">
                {text}
            </pre>
        ) : (
            <p className="display-placeholder">텍스트 추출 결과가 여기에 표시됩니다.</p>
        )}
    </div>
);

const PDFUploader = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = useCallback((event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
            setError('');
            setExtractedText('');
        } else {
            setSelectedFile(null);
            setError('PDF 파일(.pdf)만 선택할 수 있습니다.');
        }
    }, []);

    const navigate = useNavigate(); 

    const handleGoBack = () => {
        navigate('/home');
    };

    const handleConvert = useCallback(async () => {
        if (!selectedFile) {
            setError('업로드할 PDF 파일을 선택해 주세요.');
            return;
        }

        setIsLoading(true);
        setError('');
        setExtractedText('');

        try {
            const formData = new FormData();
            formData.append('pdfFile', selectedFile); 

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setExtractedText(data.text);
            } else {
                // HTTP 오류 응답 처리 (404, 500 등)
                const errorData = await response.json().catch(() => ({ 
                    error: `서버 오류: ${response.status} ${response.statusText}`, 
                    details: '응답 본문 없음'
                }));
                
                let detailedMessage = errorData.error || `알 수 없는 서버 오류 (${response.status})`;
                if (errorData.details) {
                    // 서버에서 발생한 외부 모델 오류 상세 정보를 클라이언트에게 표시
                    detailedMessage += ` (상세: ${errorData.details.replace(/"/g, '')})`; 
                }

                setError(detailedMessage);
            }
        } catch (err) {
            console.error('클라이언트 측 네트워크 오류:', err);
            setError(`네트워크 오류가 발생했습니다. 서버(${API_URL})가 실행 중인지 확인하세요.`);
        } finally {
            setIsLoading(false);
        }
    }, [selectedFile]);

    return (
        // **전체 페이지 컨테이너**: pdf-page-container
        <div className="pdf-page-container"> 
            {/* 왼쪽(업로더)과 오른쪽(결과 표시) 영역을 담는 컨테이너 */}
            <div className="pdf-content-area">
                {/* **왼쪽 영역**: pdf-uploader-panel */}
                <div className="pdf-uploader-panel">
                    <header className="uploader-header">
                        <h1 className="header-title">PDF 텍스트 추출기</h1>
                    </header>
                    <main className="uploader-main">
                        <div className="upload-area-container">
                            
                            {/* 파일 입력 필드 영역 */}
                            <div className="file-input-wrapper">
                                <label 
                                    htmlFor="pdf-upload" 
                                    className={`file-label ${selectedFile ? 'file-label-selected' : 'file-label-unselected'}`}
                                >
                                    <p className="file-status-text">
                                        {selectedFile ? (
                                            <span className="file-name"><span role="img" aria-label="pdf-icon">📄</span> {selectedFile.name}</span>
                                        ) : (
                                            <>
                                                <span className="file-action-text">클릭하거나 드래그하여 PDF 파일을 선택</span>하세요.

                                            </>
                                        )}
                                    </p>
                                    <input 
                                        id="pdf-upload" 
                                        type="file" 
                                        className="hidden-file-input" // 숨겨진 파일 인풋
                                        accept="application/pdf"
                                        onChange={handleFileChange} 
                                    />
                                </label>
                            </div>
                        </div>
                        {error && (
                            <div className="error-message">
                                <span role="img" aria-label="warning-icon">⚠️</span> {error}
                            </div>
                        )}
                    </main>
                </div>
                
                <ExtractedTextDisplay text={extractedText} />

            </div>
            
            <div className="pdf-action-buttons">
                <div className="button-group">
                    <button className="btn-primary" onClick={handleGoBack}>돌아가기</button>
                    <button 
                        onClick={handleConvert} 
                        disabled={!selectedFile || isLoading} /* 파일이 선택되지 않았거나 로딩 중일 때 비활성화 */
                        className={`btn-primary ${(!selectedFile || isLoading) ? 'upload-button-disabled' : 'upload-button-active'}`}
                    >
                        {isLoading ? (
                            <><span className="loading-spinner"></span> 텍스트 추출 중...</>
                        ) : (
                            <>텍스트 추출 및 변환</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PDFUploader;