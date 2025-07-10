import React, { useState, useRef } from 'react';
import axios from 'axios';

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
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    const analyzeWithAzure = async (audioBlob) => {
        const referenceText = PRACTICE_ITEMS[currentItemIndex].type === 'pair' 
            ? (activeWord === PRACTICE_ITEMS[currentItemIndex].wordS ? PRACTICE_ITEMS[currentItemIndex].wordS : PRACTICE_ITEMS[currentItemIndex].wordSh)
            : PRACTICE_ITEMS[currentItemIndex].text;

        setStatus('analyzing');
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const audioBase64 = reader.result.split(',')[1];
            const apiUrl = 'http://localhost:7071/api/evaluatePronunciation';
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

    const [activeWord, setActiveWord] = useState(null);

    const handleRecord = async (word) => {
        setActiveWord(word);
        setError('');
        setFeedback(null);
        if (status === 'recording') {
            mediaRecorder.current.stop();
            setStatus('idle');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = event => {
                audioChunks.current.push(event.data);
            };
            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                analyzeWithAzure(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.current.start();
            setStatus('recording');
        } catch (err) {
            setError("マイクの許可を確認してください。");
            setStatus('idle');
        }
    };

    const handleNextItem = () => {
        setCurrentItemIndex((prevIndex) => (prevIndex + 1) % PRACTICE_ITEMS.length);
        setStatus('idle');
        setFeedback(null);
        setError('');
        setActiveWord(null);
    };

    const currentItem = PRACTICE_ITEMS[currentItemIndex];
    const isAnalyzingOrRecording = status === 'analyzing' || status === 'recording';
    const isCorrect = feedback ? feedback.accuracyScore > 80 : false;

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
                                    className={`record-btn ${status === 'recording' && activeWord === currentItem.wordS ? 'recording' : ''}`}
                                    onClick={() => handleRecord(currentItem.wordS)}
                                    disabled={isAnalyzingOrRecording && activeWord !== currentItem.wordS}
                                    aria-label={`Record pronunciation for ${currentItem.wordS}`}
                                >
                                    <MicIcon />
                                </button>
                            </div>
                            <div className="word-card">
                                <h2 className="word">{currentItem.wordSh}</h2>
                                <p className="ipa">{currentItem.ipaSh}</p>
                                <button
                                    className={`record-btn ${status === 'recording' && activeWord === currentItem.wordSh ? 'recording' : ''}`}
                                    onClick={() => handleRecord(currentItem.wordSh)}
                                    disabled={isAnalyzingOrRecording && activeWord !== currentItem.wordSh}
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
                                    className={`record-btn ${status === 'recording' && activeWord === currentItem.text ? 'recording' : ''}`}
                                    onClick={() => handleRecord(currentItem.text)}
                                    disabled={isAnalyzingOrRecording && activeWord !== currentItem.text}
                                    aria-label={`Record pronunciation for the sentence`}
                                >
                                    <MicIcon />
                                </button>
                            </div>
                        </div>
                        <p className="translation">{currentItem.translation}</p>
                    </>
                )}
                <div className={`feedback-container ${status === 'result' ? `result ${isCorrect ? 'correct' : 'incorrect'}` : ''}`} aria-live="polite">
                    {status === 'idle' && <p>Press a mic to start recording.</p>}
                    {status === 'recording' && <p>Listening... Press the mic again to stop.</p>}
                    {status === 'analyzing' && <div className="loader" aria-label="Analyzing pronunciation"></div>}
                    {status === 'result' && feedback && (
                        <>
                            <div className={`feedback-header ${isCorrect ? 'correct' : 'incorrect'}`}>
                                {isCorrect ? <CheckIcon/> : <CrossIcon/>}
                                <span>{isCorrect ? "Excellent!" : "Needs Practice"}</span>
                            </div>
                            <p className="feedback-text">Accuracy Score: <strong>{feedback.accuracyScore}</strong></p>
                            <p className="feedback-text">Fluency Score: <strong>{feedback.fluencyScore}</strong></p>
                            <p className="feedback-text">Pronunciation Score: <strong>{feedback.pronunciationScore}</strong></p>
                        </>
                    )}
                </div>
                <button className="next-pair-btn" onClick={handleNextItem}>
                    Next Item &rarr;
                </button>
                {error && <p className="error-message">{error}</p>}
            </main>
        </div>
    );
};

export default App;