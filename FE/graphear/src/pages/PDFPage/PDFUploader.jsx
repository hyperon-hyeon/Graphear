import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// 👇 1. react-pdf 라이브러리 import
import { Document, Page, pdfjs } from 'react-pdf';
import './PDFUploader.css';

// 👇 2. PDF Worker 설정 (필수: 화면에 PDF를 그리기 위한 엔진)
// CDN을 사용하여 워커를 로드합니다.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_URL = 'http://localhost:3001/api/extract-text';

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
                console.log('✅ PDF 추출 성공! 텍스트 내용:', data.text);
                setExtractedText(data.text);
                navigate('/solve', { state: { extractedText: data.text, problemTitle: selectedFile.name } });
            } else {
                const errorData = await response.json().catch(() => ({
                    error: `서버 오류: ${response.status} ${response.statusText}`,
                    details: '응답 본문 없음'
                }));

                let detailedMessage = errorData.error || `알 수 없는 서버 오류 (${response.status})`;
                if (errorData.details) {
                    detailedMessage += ` (상세: ${errorData.details.replace(/"/g, '')})`;
                }
                console.error('❌ PDF 추출 실패 오류:', detailedMessage);
                setError(detailedMessage);
            }
        } catch (err) {
            console.error('❌ 클라이언트 측 네트워크 오류:', err);
            setError(`네트워크 오류가 발생했습니다. 서버(${API_URL})가 실행 중인지 확인하세요.`);
        } finally {
            setIsLoading(false);
        }
    }, [selectedFile, navigate]);

    // 👇 3. FileUploadPanel 내부 수정
    // PDFUploader.jsx 내부의 FileUploadPanel 컴포넌트 전체를 이걸로 교체하세요.

    const FileUploadPanel = () => (
        <div className="pdf-uploader-panel full-width-panel">
            <main className="uploader-main">
                <div className="upload-area-container">
                    <div className="file-input-wrapper">
                        <label
                            htmlFor="pdf-upload"
                            className={`file-label ${selectedFile ? 'file-label-selected' : 'file-label-unselected'}`}
                        >
                            <div className="file-status-content">
                                {selectedFile ? (
                                    // ✅ 파일이 선택되었을 때의 화면 구성 (좌우 배치)
                                    <div className="pdf-preview-box">
                                        {/* 1. 왼쪽: PDF 미리보기 이미지 */}
                                        <div className="pdf-preview-left">
                                            <Document
                                                file={selectedFile}
                                                loading="로딩 중..."
                                                error="미리보기 불가"
                                            >
                                                <Page 
                                                    pageNumber={1} 
                                                    height={280} 
                                                    renderTextLayer={false} 
                                                    renderAnnotationLayer={false} 
                                                />
                                            </Document>
                                        </div>

                                        {/* 2. 오른쪽: 파일명 및 다시 선택 버튼 */}
                                        <div className="pdf-preview-right">
                                            <span className="file-name">{selectedFile.name}</span>
                                            
                                            {/* 클릭하면 label이 눌려서 파일 선택창이 다시 뜹니다 */}
                                            <div className="reselect-button">
                                                다시 선택하기
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // ❌ 파일이 없을 때: 기존 화면 유지
                                    <>
                                        <p className="file-status-text">
                                            <span className="file-action-text">클릭하거나 드래그하여 PDF 파일을 선택</span>하세요.
                                        </p>
                                    </>
                                )}
                            </div>
                            <input
                                id="pdf-upload"
                                type="file"
                                className="hidden-file-input"
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
    );

    return (
        <div className="pdf-page-container">
            <div className="pdf-content-area single-panel-layout">
                <FileUploadPanel />
            </div>

            <div className="pdf-action-buttons">
                <div className="button-group">
                    <button className="btn-primary" onClick={handleGoBack}>돌아가기</button>
                    <button
                        onClick={handleConvert}
                        disabled={!selectedFile || isLoading}
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