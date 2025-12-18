import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import './AudioPage.css'; 

import PNG_ICON_PATH_PLAY from "../../assets/play.png";
import PNG_ICON_PATH_PAUSE from "../../assets/pause.png";
import PNG_ICON_PATH_REWIND from "../../assets/10rewind.png";
import PNG_ICON_PATH_FORWARD from "../../assets/10forward.png";
import PNG_ICON_PATH_BACKARROW from "../../assets/backArrow.png";

import LISTENING_TEST from "../../assets/listening/2026Listening.mp3"; 

const speeds = [1.0, 1.5, 2.0, 0.5];
const speedLabels = ["1x", "1.5x", "2x", "0.5x"];
const INITIAL_SPEED_INDEX = 1; 
const BACKEND_URL = 'http://localhost:3001';

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

// ----------------------------------------------------
// fetchTtsAudio 함수: 서버와 통신하여 TTS URL을 받아옴
// ----------------------------------------------------
const fetchTtsAudio = async (text) => {
    const response = await fetch(`${BACKEND_URL}/api/synthesize-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            text: text, 
            voiceName: 'ko-KR-Wavenet-B', 
            speakingRate: 0.95 
        }),
    });
    
    if (!response.ok) {
        let errorDetails = response.statusText;
        try {
            const errorData = await response.json();
            errorDetails = errorData.details || errorData.error || errorDetails;
        } catch (e) {
        }
        throw new Error(`서버 오류 (${response.status}): ${errorDetails}`);
    }

    try {
        const data = await response.json();
        
        if (!data.audioUrl) {
            throw new Error('서버 응답 형식 오류: audioUrl 필드를 받지 못했습니다.');
        }
        
        return data.audioUrl; 
    } catch (e) {
        // JSON 파싱 자체에 실패한 경우
        console.error("JSON 파싱 오류:", e);
        throw new Error('서버 응답을 JSON으로 처리하는 데 실패했습니다.');
    }
};


const PlayPauseIcon = ({ isPlaying }) => (
    <img 
        src={isPlaying ? PNG_ICON_PATH_PAUSE : PNG_ICON_PATH_PLAY} 
        alt={isPlaying ? "일시정지 아이콘" : "재생 아이콘"}
        className="icon-lg" 
    />
);

const TimeControlIcon = ({ isRewind, onClick }) => (
    <button 
        onClick={onClick}
        className="time-control-btn"
    >
        <img
            src={isRewind ? PNG_ICON_PATH_REWIND : PNG_ICON_PATH_FORWARD}
            alt={isRewind ? "10초 되감기 아이콘" : "10초 빨리 감기 아이콘"}
            className="icon-md" 
        />
    </button>
);

const BackIcon = () => (
    <img 
        src={PNG_ICON_PATH_BACKARROW} 
        alt="뒤로 가기"
        className="back-icon"
    />
);


const AudioPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Ref 선언
    const audioRef = useRef(null); 
    const progressContainerRef = useRef(null);
    const progressFillRef = useRef(null);
    const initialTtsAttempted = useRef(false); // TTS 자동 로드 추적용 Ref

    const initialProblemTitle = location.state?.problemTitle || '문제 제목을 불러오는 중...';
    const initialTtsText = location.state?.extractedText || "PDF에서 추출된 해설 텍스트가 없습니다. 기본 텍스트를 사용합니다.";

    // State 정의
    const [problemTitle, setProblemTitle] = useState(initialProblemTitle); 
    const [headerTitle, setHeaderTitle] = useState('문제 듣기');
    const [mainAudioSrc] = useState(LISTENING_TEST); // 더미 오디오는 상태가 아닌 상수로 유지
    const [ttsText, setTtsText] = useState(initialTtsText);
    const [ttsLoading, setTtsLoading] = useState(false);
    const [ttsError, setTtsError] = useState(null);
    
    //  초기 currentPlayingSrc를 null로 설정하여 더미 재생을 방지합니다.
    const [currentPlayingSrc, setCurrentPlayingSrc] = useState(null); 

    // 플레이어 상태
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speedIndex, setSpeedIndex] = useState(INITIAL_SPEED_INDEX);
    const [isSeeking, setIsSeeking] = useState(false);
    

// 오디오 로드 및 재생 유틸리티
const loadAndPlayAudio = useCallback((newSrc) => {
    if (!audioRef.current || !newSrc) {
        console.error("오디오 요소나 음원 경로가 유효하지 않습니다.");
        return;
    }

    // 기존 오디오 재생 정지
    if (!audioRef.current.paused) {
        audioRef.current.pause();
    }

    // 1. 새로운 소스 설정
    setCurrentPlayingSrc(newSrc);
    
    // audio 요소의 src를 직접 변경
    audioRef.current.src = newSrc;
    audioRef.current.currentTime = 0;
    audioRef.current.load();
    
    // play() 호출을 제거합니다. 
    setIsPlaying(false);
    
}, []);

// ----------------------------------------------------
// handleTtsPlay 함수 (자동 재생 로직 개선 및 URL 출력 제거)
// ----------------------------------------------------
const handleTtsPlay = useCallback(async () => {
    if (!ttsText || ttsLoading) return;

    if (ttsText === "PDF에서 추출된 해설 텍스트가 없습니다. 기본 텍스트를 사용합니다.") {
        setTtsError("재생할 해설 텍스트가 없습니다.");
        return;
    }

    setTtsLoading(true);
    setTtsError(null);

    try {
        // 1. 서버에서 TTS 음성 파일 URL(이미 절대 경로)을 받아옵니다.
        const fullAudioUrl = await fetchTtsAudio(ttsText);
        
        // 2. 새 URL로 오디오 로드
        loadAndPlayAudio(fullAudioUrl);

        console.log(`✅ TTS 음성 로드 성공!`); 

        // 3. 로드가 완료될 때까지 기다림 
        const audio = audioRef.current;
        await new Promise(resolve => {
            if (audio.readyState >= 1) { // HAVE_METADATA 이상이면 바로 resolve
                resolve();
            } else {
                audio.addEventListener('loadedmetadata', resolve, { once: true });
            }
        });

        // 4. 🚨 로드 완료 후 자동 재생 시작 및 상태 업데이트
        audio.play()
            .then(() => {
                setIsPlaying(true); 
                console.log(`✅ TTS 음성 재생 시작 (인라인)`);
            })
            .catch(e => {
                // 자동 재생 실패(NotAllowedError) 시 에러 처리
                const errorMessage = e.name === 'NotAllowedError' 
                    ? '자동 재생이 차단되었습니다. 메인 재생 버튼을 수동으로 눌러주세요.' 
                    : `재생 실패: ${e.message}.`;
                setTtsError(errorMessage);
                setIsPlaying(false);
                console.error('오디오 재생 실패 (브라우저 정책):', e);
            });

    } catch (e) {
        console.error('TTS 음성 생성 및 로드 오류:', e);
        // fetchTtsAudio에서 발생한 상세 오류 메시지를 바로 표시
        setTtsError(`TTS 생성 실패: ${e.message}`); 
        setIsPlaying(false);
    } finally {
        setTtsLoading(false);
    }
}, [ttsText, ttsLoading, loadAndPlayAudio]);

// ----------------------------------------------------
// togglePlayPause 함수 (순수 재생/일시정지 기능만 수행)
// ----------------------------------------------------
const togglePlayPause = () => {
    if (!currentPlayingSrc || !audioRef.current) {
        // TTS 로드가 완료되지 않았다면 아무것도 하지 않습니다. (자동 로드가 실패한 경우)
        setTtsError("TTS 음원 로드 중이거나 로드에 실패했습니다. 잠시 후 다시 시도하거나 재생 버튼을 다시 누르세요.");
        return; 
    }

    if (audioRef.current.paused) {
        audioRef.current.play().catch(e => {
            if (e.name === 'NotAllowedError') {
                 setTtsError("브라우저 정책으로 인해 자동 재생이 차단되었습니다. 수동으로 다시 눌러주세요.");
            }
            console.error("오디오 재생 실패:", e);
        });
        setIsPlaying(true);
    } else {
        audioRef.current.pause();
        setIsPlaying(false);
    }
};

// ----------------------------------------------------
// TTS 음원 다운로드 함수
// ----------------------------------------------------
const handleDownloadSolve = async () => {
    if (!ttsText || ttsText === "PDF에서 추출된 해설 텍스트가 없습니다. 기본 텍스트를 사용합니다.") {
        console.error("다운로드할 텍스트가 없습니다.");
        setTtsError("해설 텍스트가 없어 음원 다운로드를 시작할 수 없습니다.");
        return;
    }
    if (ttsLoading) return;
    
    setTtsLoading(true);
    setTtsError(null);
    
    if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
    }

    try {
        // 1. TTS 파일 URL(이미 절대 경로)을 서버에서 받아옵니다.
        const fullDownloadUrl = await fetchTtsAudio(ttsText); 

        // 2. 다운로드 링크 생성
        const link = document.createElement('a');
        link.href = fullDownloadUrl; // 서버에서 제공한 파일 URL을 다운로드 링크로 사용
        
        // 🚨 페이지 이동 방지: download 속성을 강제로 적용합니다.
        link.setAttribute('download', 'TTS_Solution.mp3'); 

        let filename = problemTitle.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_.]/g, '') || 'TTS_Solution';
        filename += '.mp3';

        link.download = filename; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`✅ 음성 파일 다운로드 시작: ${filename}`); 

    } catch (e) {
        console.error('TTS 음원 생성 및 다운로드 오류:', e);
        setTtsError("음원 생성/다운로드 실패: " + e.message);
    } finally {
        setTtsLoading(false);
    }
};


    const toggleGoHome = () => { navigate('/home'); };
    const seekBy = (seconds) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = Math.min(audioRef.current.duration, Math.max(0, audioRef.current.currentTime + seconds));
    };
    const toggleSpeed = () => {
        const newIndex = (speedIndex + 1) % speeds.length;
        setSpeedIndex(newIndex);
        if (audioRef.current) {
            audioRef.current.playbackRate = speeds[newIndex];
        }
    };
    const seekToPosition = useCallback(() => { /* TODO: Seeking 로직 구현 필요 */ }, []);
    const handleMouseDown = (e) => { /* TODO: Seeking 로직 구현 필요 */ };
    const handleMouseMove = useCallback((e) => { /* TODO: Seeking 로직 구현 필요 */ }, [isSeeking, seekToPosition]);
    const handleMouseUp = () => { /* TODO: Seeking 로직 구현 필요 */ };
    const handleTouchMove = (e) => { /* TODO: Seeking 로직 구현 필요 */ };
    const handleTouchStart = (e) => { /* TODO: Seeking 로직 구현 필요 */ };
    const handleTouchEnd = () => { /* TODO: Seeking 로직 구현 필요 */ };

    // ----------------------------------------------------
    // 초기 로드 및 TTS 자동 로드 트리거 Effect
    // ----------------------------------------------------
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // 1. 초기 데이터 설정 및 TTS 로드 트리거 함수
        const triggerInitialLoad = async () => {
            // 초기 데이터 설정 (TTS 텍스트가 location.state에서 넘어왔다고 가정)
            if (!location.state?.problemTitle) {
                setProblemTitle("기본 듣기 파일 제목 (데이터 로드됨)"); 
                setTtsText("기본 해설 텍스트입니다.");
            }
            
            setHeaderTitle("PDF 변환 결과 재생"); 

            // 🎯 TTS 텍스트가 유효하고, 아직 로드 시도를 하지 않았다면 (Ref 사용)
            const isTextValid = ttsText && ttsText !== "PDF에서 추출된 해설 텍스트가 없습니다. 기본 텍스트를 사용합니다.";
            
            if (isTextValid && !initialTtsAttempted.current) {
                 initialTtsAttempted.current = true; // 로드 시도 플래그 설정
                 
                 // TTS 로드 및 자동 재생 시작 (이것이 이제 기본 동작)
                 await handleTtsPlay(); 
            }
        };

        triggerInitialLoad();
        
        document.title = problemTitle; 
        
        // 2. 오디오 이벤트 리스너 설정 (기존 로직 유지)
        const onLoadedMetadata = () => {
            setDuration(audio.duration);
            audio.playbackRate = speeds[INITIAL_SPEED_INDEX];
        };

        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            if (audio.duration > 0 && progressFillRef.current) { 
                const percentage = (audio.currentTime / audio.duration) * 100;
                progressFillRef.current.style.width = `${percentage}%`;
            }
        };

        const onEnded = () => {
            audio.currentTime = 0;
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('ended', onEnded);
        };
        // ttsText가 변경되더라도 자동 로드가 다시 실행되도록 의존성 배열에 포함
    }, [currentPlayingSrc, problemTitle, location.state, ttsText, handleTtsPlay]); 

    return (
        <div className="player-container">
            
            <header className="audio-header" >
                <button onClick={toggleGoHome} className="back-button" >
                    <BackIcon /> 
                </button>
                <span className="header-title">{headerTitle}</span>
            </header>

            {/* 🚨 진행 바 컨테이너 */}
            <div 
                ref={progressContainerRef} 
                id="progress-container" 
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div 
                    ref={progressFillRef} // 👈 진행도 채움 바
                    id="progress-fill" 
                    className="progress-fill"
                    style={{
                        transition: isSeeking ? 'none' : 'width 0.3s linear',
                    }} 
                ></div>
                
                
                <span id="problem-title">
                    {ttsLoading ? '음원 생성 중...' : problemTitle}
                </span>
            </div>

            {/* 메인 오디오 소스는 currentPlayingSrc를 동적으로 사용 */}
            <audio 
                ref={audioRef} 
                id="my-audio" 
                src={currentPlayingSrc || undefined} 
                preload="metadata" 
            />

            <div className="audio-controls">
                
                <TimeControlIcon 
                    isRewind={true} 
                    onClick={() => seekBy(-10)} 
                />
                <button 
                    onClick={togglePlayPause} 
                    className="control-btn"
                >
                    <PlayPauseIcon isPlaying={isPlaying} />
                </button>
                
                <TimeControlIcon 
                    isRewind={false} 
                    onClick={() => seekBy(10)} 
                />

                <button 
                    id="speed-btn" 
                    onClick={toggleSpeed}
                    className="speed-button"
                >
                    배속: {speedLabels[speedIndex]}
                </button>
            </div>

            <div className="time-display">
                <span id="current-time">{formatTime(currentTime)}</span>
                <span id="duration">{formatTime(duration)}</span>
            </div>
            
            {ttsError && (
                <div className="tts-error-message">
                    TTS 오류: {ttsError}
                </div>
            )}

            <div className="action-area">
                
                <div className="action-row">
                    <div className="error-check-group">
                        <input type="checkbox" id="error-check" />
                        <label htmlFor="error-check">오답 체크</label>
                    </div>
                    
                    <button 
                    id="explanation-play-btn" 
                    onClick={handleTtsPlay}
                    className={`primary-btn answer-play-btn ${ttsLoading ? 'is-loading' : ''}`}
                    disabled={ttsLoading || !ttsText || ttsText === "PDF에서 추출된 해설 텍스트가 없습니다. 기본 텍스트를 사용합니다."} 
                >
                    {ttsLoading ? '음성 생성 중...' : '해설 음성 재생 (TTS)'}
                </button>
                </div>


                {/* 하단의 다운로드 버튼 (두 번째 다운로드 버튼) */}
                <button 
                    id="explanation-download-btn" 
                    onClick={handleDownloadSolve} 
                    className={`primary-btn explanation-play-btn ${ttsLoading ? 'is-loading' : ''}`}
                    disabled={ttsLoading || !ttsText || ttsText === "PDF에서 추출된 해설 텍스트가 없습니다. 기본 텍스트를 사용합니다."} 
                >
                    {ttsLoading ? '음성 생성 중...' : '해설 음성 다운로드'}
                </button>
                
                <div className="action-row">
                    <button id="prev-btn" className="secondary-btn prev-next-btn">
                        이전 문제
                    </button>
                    <button id="next-btn" className="secondary-btn prev-next-btn">
                        다음 문제
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AudioPage;