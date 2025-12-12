import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import './AudioPage.css'; 

const PNG_ICON_PATH_PLAY = "../../assets/play.png";
const PNG_ICON_PATH_PAUSE = "../../assets/pause.png";
const PNG_ICON_PATH_REWIND = "../../assets/10rewind.png";
const PNG_ICON_PATH_FORWARD = "../../assets/10forward.png";
const PNG_ICON_PATH_BACKARROW = "../../assets/backArrow.png";

const LISTENING_TEST = null; 
const LISTENING_ANSWER = null; 
const LISTEN_SOLVING = null; 

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
        const errorData = await response.json();
        throw new Error(errorData.error || response.statusText);
    }

    const data = await response.json();
    if (!data.audioContent) {
        throw new Error('서버에서 오디오 콘텐츠를 받지 못했습니다.');
    }

    return `data:audio/mp3;base64,${data.audioContent}`;
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
    
    const audioRef = useRef(null);
    const progressContainerRef = useRef(null);
    const progressFillRef = useRef(null);

    // [상태 초기값 변경] 로컬 파일 대신 null로 초기화
    const [problemTitle, setProblemTitle] = useState('문제 제목을 불러오는 중...'); 
    const [mainAudioSrc, setMainAudioSrc] = useState(LISTENING_TEST); // 초기값 null
    const [answerAudioSrc, setAnswerAudioSrc] = useState(LISTENING_ANSWER); // 초기값 null
    const [solveAudioSrc, setSolveAudioSrc] = useState(LISTEN_SOLVING); // 초기값 null
    
    // [NEW TTS STATE]
    const [ttsText, setTtsText] = useState("여기에 PDF에서 추출된 해설 텍스트를 입력하거나 로드하여 음성으로 변환합니다.");
    const [ttsLoading, setTtsLoading] = useState(false);
    const [ttsError, setTtsError] = useState(null);
    const [currentPlayingSrc, setCurrentPlayingSrc] = useState(null); // 현재 재생 중인 소스 (TTS 또는 null)

    // [ORIGINAL STATE] 플레이어 상태
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

        if (!audioRef.current.paused) {
            audioRef.current.pause();
        }

        setCurrentPlayingSrc(newSrc);
        
        // 오디오 요소 업데이트가 완료될 시간을 주기 위해 약간 지연
        setTimeout(() => {
            if(audioRef.current.src !== newSrc) {
                 audioRef.current.src = newSrc;
            }
            audioRef.current.currentTime = 0;
            audioRef.current.load(); 
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => {
                    console.error("오디오 재생 실패:", e);
                    setIsPlaying(false);
                });
        }, 50);

    }, []);
    
    const togglePlayPause = () => {
        if (!audioRef.current) return;

        if (audioRef.current.paused) {
            audioRef.current.play().catch(e => console.error("오디오 재생 실패:", e));
            setIsPlaying(true);
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    // [ORIGINAL] 답 재생 (로컬 파일 대신 answerAudioSrc 상태 사용)
    const handleAnswerPlay = () => {
        loadAndPlayAudio(answerAudioSrc);
    };

    // [MODIFIED] 해설 재생 (TTS 기능 사용)
    const handleSolvePlay = async () => {
        if (!ttsText) {
             console.error("변환할 텍스트가 없습니다.");
             return;
        }
        if (ttsLoading) return;
        
        setTtsLoading(true);
        setTtsError(null);
        
        try {
            const audioDataUrl = await fetchTtsAudio(ttsText);
            // TTS 결과를 currentPlayingSrc에 저장하여 재생
            loadAndPlayAudio(audioDataUrl); 

        } catch (e) {
            console.error('TTS 변환 및 재생 오류:', e);
            setTtsError("음성 변환 실패: " + e.message);
            setIsPlaying(false);
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
    const seekToPosition = useCallback(() => { /* ... */ }, []);
    const handleMouseDown = (e) => { /* ... */ };
    const handleMouseMove = useCallback((e) => { /* ... */ }, [isSeeking, seekToPosition]);
    const handleMouseUp = () => { /* ... */ };
    const handleTouchMove = (e) => { /* ... */ };
    const handleTouchStart = (e) => { /* ... */ };
    const handleTouchEnd = () => { /* ... */ };

    useEffect(() => {
        const touchOptions = { passive: false }; 
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove, touchOptions); 
        document.addEventListener('touchend', handleTouchEnd);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove, touchOptions);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUp]); 

    useEffect(() => {
        const fetchProblemData = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 1000)); 

                // NOTE: 로컬 파일을 사용하지 않으므로 초기값은 null 상태 유지
                const data = {
                    title: "PDF 해설 음성 플레이어",
                    mainSrc: LISTENING_TEST, // null
                    answerSrc: LISTENING_ANSWER, // null
                    solveSrc: LISTEN_SOLVING // null
                };
                
                setProblemTitle(data.title);
                setMainAudioSrc(data.mainSrc);
                setAnswerAudioSrc(data.answerSrc);
                setSolveAudioSrc(data.solveSrc);
                setCurrentPlayingSrc(data.mainSrc); 

            } catch (error) {
                console.error("문제 데이터를 불러오는 데 실패했습니다:", error);
                setProblemTitle("데이터 로드 실패");
            }
        };
        fetchProblemData();
        
        const audio = audioRef.current;
        if (!audio) return;

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
    }, [currentPlayingSrc]); 


    return (
        <div className="player-container">
            
            <header className="audio-header" >
                <button onClick={toggleGoHome} className="back-button" >
                    <BackIcon /> 
                </button>
                <span className="header-title">{problemTitle}</span>
            </header>

            <div className="tts-input-area">
                <label className="tts-input-label">
                    📥 해설 텍스트 (TTS 입력)
                </label>
                <textarea 
                    value={ttsText} 
                    onChange={(e) => setTtsText(e.target.value)}
                    rows="4" 
                    className="tts-textarea"
                    placeholder="PDF에서 추출된 해설 텍스트가 표시됩니다."
                />
            </div>

            <div 
                ref={progressContainerRef} 
                id="progress-container" 
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div 
                    ref={progressFillRef} 
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
                        id="answer-play-btn" 
                        onClick={handleAnswerPlay} 
                        className="primary-btn answer-play-btn"
                        disabled={!answerAudioSrc} 
                    >
                        답 재생하기
                    </button>
                </div>

                <button 
                    id="explanation-play-btn" 
                    onClick={handleSolvePlay}
                    className={`primary-btn explanation-play-btn ${ttsLoading ? 'is-loading' : ''}`}
                    disabled={ttsLoading || !ttsText} 
                >
                    {ttsLoading ? '음성 변환 중...' : '해설 재생하기 (TTS)'}
                </button>

                {/* TTS 다운로드 링크 추가 */}
                <div className="action-row action-row-full">
                    <button 
                        id="download-tts-btn" 
                        className="secondary-btn prev-next-btn download-btn"
                        disabled={!currentPlayingSrc || !currentPlayingSrc.startsWith('data:audio')}
                    >
                        <a 
                            href={currentPlayingSrc && currentPlayingSrc.startsWith('data:audio') ? currentPlayingSrc : '#'} 
                            download="해설_음성_TTS.mp3"
                            className="download-link"
                        >
                            TTS 음원 다운로드
                        </a>
                    </button>
                </div>

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