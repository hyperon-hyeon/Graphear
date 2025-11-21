import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import './AudioPage.css'; 

import PNG_ICON_PATH_PLAY from "../../assets/play.png";
import PNG_ICON_PATH_PAUSE from "../../assets/pause.png";
import PNG_ICON_PATH_REWIND from "../../assets/10rewind.png";
import PNG_ICON_PATH_FORWARD from "../../assets/10forward.png";
import PNG_ICON_PATH_BACKARROW from "../../assets/backArrow.png";

import LISTENING_TEST from "../../assets/listening/2026Listening.mp3"; 
import LISTENING_ANSWER from "../../assets/listening/2026_10.mp3"; 
import LISTEN_SOLVING from "../../assets/listening/2026_16,17.mp3";

const speeds = [1.0, 1.5, 2.0, 0.5];
const speedLabels = ["1x", "1.5x", "2x", "0.5x"];
const INITIAL_SPEED_INDEX = 1; 

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

const AudioPage = () => {
    const navigate = useNavigate();
    
    const audioRef = useRef(null);
    const progressContainerRef = useRef(null);
    const progressFillRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speedIndex, setSpeedIndex] = useState(INITIAL_SPEED_INDEX);
    const [isSeeking, setIsSeeking] = useState(false);
    
    const [problemTitle, setProblemTitle] = useState('문제 제목을 불러오는 중...'); 
    const [mainAudioSrc, setMainAudioSrc] = useState(LISTENING_TEST);
    const [answerAudioSrc, setAnswerAudioSrc] = useState(null); 
    const [solveAudioSrc, setSolveAudioSrc] = useState(null);
    const loadAndPlayAudio = (newSrc) => {
        if (!audioRef.current || !newSrc) {
            console.error("오디오 요소나 음원 경로가 유효하지 않습니다.");
            return;
        }

        if (!audioRef.current.paused) {
            audioRef.current.pause();
        }

        if (audioRef.current.src !== newSrc) {
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
    };
    
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

    const handleAnswerPlay = () => {
        loadAndPlayAudio(answerAudioSrc);
    };

    const handleSolvePlay = () => {
        loadAndPlayAudio(solveAudioSrc);
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
    const seekToPosition = useCallback((clientX) => { /* ... */ }, []);
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

                const data = {
                    title: "2026학년도 수능 영어 듣기 평가",
                    mainSrc: LISTENING_TEST, // 문제 음원
                    answerSrc: LISTENING_ANSWER, // 정답 음원
                    solveSrc: LISTEN_SOLVING // 해설 음원
                };
                
                setProblemTitle(data.title);
                setMainAudioSrc(data.mainSrc);
                setAnswerAudioSrc(data.answerSrc);
                setSolveAudioSrc(data.solveSrc);

                if (audioRef.current) {
                    audioRef.current.src = data.mainSrc;
                    audioRef.current.load();
                }

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
    }, []); 

    const PlayPauseIcon = ({ isPlaying }) => (
        <img 
            src={isPlaying ? PNG_ICON_PATH_PAUSE : PNG_ICON_PATH_PLAY} 
            alt={isPlaying ? "일시정지 아이콘" : "재생 아이콘"}
            className="icon-lg text-white" 
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
                className="icon-md text-white" 
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

    return (
        <div className="player-container">
            
            <header className="audio-header" >
                <button onClick={toggleGoHome} className="back-button" >
                    <BackIcon /> 
                </button>
                <span className="header-title">고등학교 3학년 수학 과목 수능 대비</span>
            </header>

            <div 
                ref={progressContainerRef} 
                id="progress-container" 
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div 
                    ref={progressFillRef} 
                    id="progress-fill" 
                    style={{
                        position: 'absolute', top: 0, left: 0, height: '100%', width: '0%', 
                        transition: isSeeking ? 'none' : 'width 0.3s linear',
                    }} 
                ></div>
                <span id="problem-title">{problemTitle}</span>
            </div>

            <audio 
                ref={audioRef} 
                id="my-audio" 
                src={mainAudioSrc} 
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

            <div className="action-area">
                
                <div className="action-row">
                    <div className="error-check-group">
                        <input type="checkbox" id="error-check" />
                        <label >오답 체크</label>
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
                    className="primary-btn explanation-play-btn"
                    disabled={!solveAudioSrc} 
                >
                    해설 재생하기
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