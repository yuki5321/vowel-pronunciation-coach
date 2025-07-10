import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Recorder from 'recorder-js'; // 追加

// --- アイコンコンポーネント ---
const MicIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" /></svg> );
const CheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> );
const CrossIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> );

// --- 練習データ ---
const PRACTICE_ITEMS = [
    { type: 'pair', wordS: 'sea', ipaS: '/siː/', wordSh: 'she', ipaSh: '/ʃiː/', translation: '海 / 彼女' },
    { type: 'pair', wordS: 'seat', ipaS: '/siːt/', wordSh: 'sheet', ipaSh: '/ʃiːt/', translation: '席 / シーツ' },
    { type: 'pair', wordS: 'sell', ipaS: '/sel/', wordSh: 'shell', ipaSh: '/ʃel/', translation: '売る / 貝殻' },
    { type: 'pair', wordS: 'self', ipaS: '/self/', wordSh: 'shelf', ipaSh: '/ʃelf/', translation: '自己 / 棚' },
    { type: 'sentence', text: 'She sells seashells by the seashore.', ipa: '/ʃiː selz ˈsiːʃelz baɪ ðə ˈsiːʃɔːr/', translation: '彼女は海岸で貝殻を売る' },
];

const App = () => {
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [status, setStatus] = useState('idle');
    const [feedback, setFeedback] = useState(null);
    const [error, setError] = useState('');
    const [activeWord, setActiveWord] = useState(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const audioContextRef = useRef(null);
    const recorderRef = useRef(null);

    const analyzeWithAzure = async (audioBlob) => {
        // APIに送るお手本テキストを決定
        const currentItem = PRACTICE_ITEMS[currentItemIndex];
        const referenceText = currentItem.type === 'sentence' ? currentItem.text : activeWord;

        if (!referenceText) {
            setError("Target word is not selected.");
            setStatus('idle');
            return;
        }

        setStatus('analyzing');
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const audioBase64 = reader.result.split(',')[1];
            const apiUrl = '/api/evaluatePronunciation';
            try {
                const response = await axios.post(apiUrl, { referenceText, audioBase64 });
                setFeedback(response.data);
                setStatus('result');
            } catch (err) {
                const errorMessage = err.response?.data?.details || err.message || "An unknown error occurred.";
                setError(`API Error: ${errorMessage}`);
                setStatus('idle');
            }
        };
    };

    const handleRecord = async (word) => {
        setActiveWord(word);
        setError('');
        setFeedback(null);
        if (status === 'recording') {
            recorderRef.current.stop().then(({ blob }) => {
                analyzeWithAzure(blob);
            });
            setStatus('idle');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            recorderRef.current = new Recorder(audioContextRef.current, { type: 'wav' });
            await recorderRef.current.init(stream);
            recorderRef.current.start();
            setStatus('recording');
        } catch (err) {
            setError("マイクの許可を確認してください。");
            setStatus('idle');
        }
    };

    const resetState = () => {
        setStatus('idle');
        setFeedback(null);
        setError('');
        setActiveWord(null);
    };

    const handlePreviousItem = () => {
        setCurrentItemIndex((prevIndex) => (prevIndex - 1 + PRACTICE_ITEMS.length) % PRACTICE_ITEMS.length);
        resetState();
    };

    const handleNextItem = () => {
        setCurrentItemIndex((prevIndex) => (prevIndex + 1) % PRACTICE_ITEMS.length);
        resetState();
    };

    useEffect(() => {
        if (feedback && status === 'result') {
            const score = feedback.accuracyScore;
            let soundFile = '';

            if (score >= 80) {
                soundFile = '/perfect.mp3'; // 完璧な音
            } else if (score >= 60) {
                soundFile = '/pass.mp3';    // 合格音
            } else {
                soundFile = '/fail.mp3';    // 不合格音
            }
            
            const audio = new Audio(soundFile);
            audio.play().catch(e => console.error("Error playing sound:", e));
        }
    }, [feedback, status]);

    const currentItem = PRACTICE_ITEMS[currentItemIndex];
    const isAnalyzing = status === 'analyzing';
    const isRecording = status === 'recording';

    return (
        <div className="main-container">
            <header className="header">
                <h1 className="app-title">S/SH Pronunciation Coach</h1>
                <p className="app-subtitle">Practice your /s/ and /ʃ/ sounds</p>
            </header>
            <main className="coach-card">
                {currentItem.type === 'pair' ? (
                    <>
                        <div className="pair-container">
                            <div className="word-card">
                                <h2 className="word">{currentItem.wordS}</h2>
                                <p className="ipa">{currentItem.ipaS}</p>
                                <button
                                    className={`record-btn ${isRecording && activeWord === currentItem.wordS ? 'recording' : ''}`}
                                    onClick={() => handleRecord(currentItem.wordS)}
                                    disabled={isAnalyzing || (isRecording && activeWord !== currentItem.wordS)}
                                    aria-label={`Record pronunciation for ${currentItem.wordS}`}
                                >
                                    <MicIcon />
                                </button>
                            </div>
                            <div className="word-card">
                                <h2 className="word">{currentItem.wordSh}</h2>
                                <p className="ipa">{currentItem.ipaSh}</p>
                                <button
                                    className={`record-btn ${isRecording && activeWord === currentItem.wordSh ? 'recording' : ''}`}
                                    onClick={() => handleRecord(currentItem.wordSh)}
                                    disabled={isAnalyzing || (isRecording && activeWord !== currentItem.wordSh)}
                                    aria-label={`Record pronunciation for ${currentItem.wordSh}`}
                                >
                                    <MicIcon />
                                </button>
                            </div>
                        </div>
                        <p className="translation">{currentItem.translation}</p>
                    </>
                ) : (
                    <>
                        <div className="sentence-container">
                            <div className="sentence-card">
                                <p className="sentence-text">{currentItem.text}</p>
                                <p className="ipa">{currentItem.ipa}</p>
                                <button
                                    className={`record-btn ${isRecording && activeWord === currentItem.text ? 'recording' : ''}`}
                                    onClick={() => handleRecord(currentItem.text)}
                                    disabled={isAnalyzing || (isRecording && activeWord !== currentItem.text)}
                                    aria-label={`Record pronunciation for the sentence`}
                                >
                                    <MicIcon />
                                </button>
                            </div>
                        </div>
                        <p className="translation">{currentItem.translation}</p>
                    </>
                )}
                
                {/* ▼▼▼ ここが結果表示エリアです ▼▼▼ */}
                <div className={`feedback-container ${status === 'result' ? 'result' : ''}`} aria-live="polite">
                    {status === 'idle' && <p>Press a mic to start recording.</p>}
                    {status === 'recording' && <p>Listening... Press the mic again to stop.</p>}
                    {status === 'analyzing' && <div className="loader" aria-label="Analyzing pronunciation"></div>}
                    {status === 'result' && feedback && (
                        (() => {
                            const score = feedback.accuracyScore;
                            if (score >= 80) {
                                return (
                                    <div className="feedback-header correct">
                                        <CheckIcon/>
                                        <span>完璧！ (Perfect!)</span>
                                    </div>
                                );
                            } else if (score >= 60) {
                                return (
                                    <div className="feedback-header pass">
                                        <CheckIcon/>
                                        <span>合格 (Pass)</span>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="feedback-header incorrect">
                                        <CrossIcon/>
                                        <span>Keep Trying!</span>
                                    </div>
                                );
                            }
                        })()
                    )}
                    {/* スコア表示は共通 */}
                    {status === 'result' && feedback && (
                        <p className="feedback-text">Accuracy Score: <strong>{feedback.accuracyScore}</strong></p>
                    )}
                </div>
                {/* ▲▲▲ ここまでが結果表示エリアです ▲▲▲ */}

                <div className="navigation-buttons">
                    <button className="nav-btn" onClick={handlePreviousItem} disabled={isAnalyzing || isRecording}>
                        &larr; Previous
                    </button>
                    <button className="nav-btn" onClick={handleNextItem} disabled={isAnalyzing || isRecording}>
                        Next &rarr;
                    </button>
                </div>
                {error && <p className="error-message">{error}</p>}
            </main>
        </div>
    );
};

export default App;
