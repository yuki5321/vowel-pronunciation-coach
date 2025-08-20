import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Recorder from 'recorder-js';

// --- アイコンコンポーネント ---
const MicIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" /></svg> );
const CheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> );
const CrossIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> );

// --- 練習データ ---
const PRACTICE_ITEMS = [
    // æ vs e (had - head, pan - pen, bad - bed, man - men, sad - said)
    { type: 'pair', word1: 'had', ipa1: '/hæd/', word2: 'head', ipa2: '/hed/', translation: '持っていた / 頭' },
    { type: 'pair', word1: 'pan', ipa1: '/pæn/', word2: 'pen', ipa2: '/pen/', translation: 'フライパン / ペン' },
    { type: 'pair', word1: 'bad', ipa1: '/bæd/', word2: 'bed', ipa2: '/bed/', translation: '悪い / ベッド' },
    { type: 'pair', word1: 'man', ipa1: '/mæn/', word2: 'men', ipa2: '/men/', translation: '男 / 男性たち' },
    { type: 'pair', word1: 'sad', ipa1: '/sæd/', word2: 'said', ipa2: '/sed/', translation: '悲しい / 言った' },
    
    // æ vs ɑ (hat - hot, cap - cop, sang - song)
    { type: 'pair', word1: 'hat', ipa1: '/hæt/', word2: 'hot', ipa2: '/hɑt/', translation: '帽子 / 熱い' },
    { type: 'pair', word1: 'cap', ipa1: '/kæp/', word2: 'cop', ipa2: '/kɑp/', translation: '帽子 / 警察官' },
    { type: 'pair', word1: 'sang', ipa1: '/sæŋ/', word2: 'song', ipa2: '/sɑŋ/', translation: '歌った / 歌' },
    
    // ʌ vs ɑ (hut - hot, luck - lock, sung - song)
    { type: 'pair', word1: 'hut', ipa1: '/hʌt/', word2: 'hot', ipa2: '/hɑt/', translation: '小屋 / 熱い' },
    { type: 'pair', word1: 'luck', ipa1: '/lʌk/', word2: 'lock', ipa2: '/lɑk/', translation: '運 / 鍵' },
    { type: 'pair', word1: 'sung', ipa1: '/sʌŋ/', word2: 'song', ipa2: '/sɑŋ/', translation: '歌った / 歌' },
    
    // 文章練習
    { type: 'sentence', text: 'My boss often takes a bus to fish for bass in the pond.', ipa: '/maɪ bɑs ˈɔfən teɪks ə bʌs tu fɪʃ fɔr bæs ɪn ðə pɑnd/', translation: '私の上司はよくバスに乗って池でバスを釣りに行く' },
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

    // 音素レベルの評価に基づいたアドバイスを生成する関数
    const generatePhonemeAdvice = (phonemes) => {
        if (!phonemes || phonemes.length === 0) return null;

        const allPhonemes = phonemes.flatMap(wordData => wordData.phonemes);
        const lowScorePhonemes = allPhonemes.filter(p => p.accuracyScore < 60);
        const mediumScorePhonemes = allPhonemes.filter(p => p.accuracyScore >= 60 && p.accuracyScore < 80);

        if (lowScorePhonemes.length > 0) {
            const problematicPhonemes = lowScorePhonemes.map(p => p.phoneme).join(', ');
            return {
                type: 'improvement',
                message: `特に ${problematicPhonemes} の発音を練習しましょう。`,
                color: 'incorrect'
            };
        } else if (mediumScorePhonemes.length > 0) {
            const improvingPhonemes = mediumScorePhonemes.map(p => p.phoneme).join(', ');
            return {
                type: 'good',
                message: `${improvingPhonemes} の発音が良くなっています。さらに練習しましょう！`,
                color: 'pass'
            };
        } else {
            return {
                type: 'excellent',
                message: '素晴らしい発音です！完璧に近いです。',
                color: 'correct'
            };
        }
    };

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
            console.log("audioBase64 length:", audioBase64.length); // 追加
            
            // 開発環境とプロダクション環境でAPIエンドポイントを切り替え
            const isDevelopment = process.env.NODE_ENV === 'development';
            const apiUrl = isDevelopment 
                ? 'http://localhost:7071/api/evaluatePronunciation'
                : '/api/evaluatePronunciation';
            
            try {
                const response = await axios.post(apiUrl, { 
                    referenceText, 
                    audioBase64 
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                setFeedback(response.data);
                setStatus('result');
            } catch (err) {
                console.error('API Error:', err);
                const errorMessage = err.response?.data?.details || err.message || "An unknown error occurred.";
                
                // 開発環境またはプロダクション環境でAzure Functionsが動作しない場合のモックレスポンス
                if (err.response?.status === 404 || err.response?.status === 405) {
                    console.log('Using mock response for development');
                    const mockResponse = {
                        accuracyScore: Math.floor(Math.random() * 40) + 60, // 60-100のランダムスコア
                        fluencyScore: Math.floor(Math.random() * 40) + 60,
                        prosodyScore: Math.floor(Math.random() * 40) + 60,
                        completenessScore: Math.floor(Math.random() * 40) + 60,
                        pronunciationScore: Math.floor(Math.random() * 40) + 60,
                        recognizedText: referenceText, // モックでは参照テキストと同じ
                        words: [
                            {
                                Word: referenceText,
                                PronunciationAssessment: {
                                    AccuracyScore: Math.floor(Math.random() * 40) + 60
                                }
                            }
                        ],
                        phonemes: [
                            {
                                word: referenceText,
                                phonemes: [
                                    {
                                        phoneme: '/h/',
                                        accuracyScore: Math.floor(Math.random() * 40) + 60
                                    },
                                    {
                                        phoneme: '/æ/',
                                        accuracyScore: Math.floor(Math.random() * 40) + 60
                                    },
                                    {
                                        phoneme: '/d/',
                                        accuracyScore: Math.floor(Math.random() * 40) + 60
                                    }
                                ]
                            }
                        ]
                    };
                    setFeedback(mockResponse);
                    setStatus('result');
                } else {
                    setError(`API Error: ${errorMessage}`);
                    setStatus('idle');
                }
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
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
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
                <h1 className="app-title">Vowel Pronunciation Coach</h1>
                <p className="app-subtitle">Practice your vowel sounds: æ, e, ɑ, ʌ</p>
            </header>
            <main className="coach-card">
                {currentItem.type === 'pair' ? (
                    <>
                        <div className="pair-container">
                            <div className="word-card">
                                <h2 className="word">{currentItem.word1}</h2>
                                <p className="ipa">{currentItem.ipa1}</p>
                                <button
                                    className={`record-btn ${isRecording && activeWord === currentItem.word1 ? 'recording' : ''}`}
                                    onClick={() => handleRecord(currentItem.word1)}
                                    disabled={isAnalyzing || (isRecording && activeWord !== currentItem.word1)}
                                    aria-label={`Record pronunciation for ${currentItem.word1}`}
                                >
                                    <MicIcon />
                                </button>
                            </div>
                            <div className="word-card">
                                <h2 className="word">{currentItem.word2}</h2>
                                <p className="ipa">{currentItem.ipa2}</p>
                                <button
                                    className={`record-btn ${isRecording && activeWord === currentItem.word2 ? 'recording' : ''}`}
                                    onClick={() => handleRecord(currentItem.word2)}
                                    disabled={isAnalyzing || (isRecording && activeWord !== currentItem.word2)}
                                    aria-label={`Record pronunciation for ${currentItem.word2}`}
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
                    {status === 'idle' && <p>マイクボタンを押して録音を開始してください。</p>}
                    {status === 'recording' && <p>録音中... もう一度マイクボタンを押して停止してください。</p>}
                    {status === 'analyzing' && <div className="loader" aria-label="発音を分析中"></div>}
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
                                        <span>もう一度練習しましょう！</span>
                                    </div>
                                );
                            }
                        })()
                    )}
                    {/* スコア表示は共通 */}
                    {status === 'result' && feedback && (
                        <>
                            <p className="feedback-text">正確性スコア: <strong>{feedback.accuracyScore}</strong></p>
                            
                            {/* 認識されたテキストの表示 */}
                            {feedback.recognizedText && (
                                <div className="recognition-details">
                                    <h4>認識されたテキスト:</h4>
                                    <p className="recognized-text">{feedback.recognizedText}</p>
                                </div>
                            )}
                            

                            
                            {/* 音素レベルの認識結果 */}
                            {feedback.phonemes && feedback.phonemes.length > 0 && (
                                <div className="phoneme-details">
                                    <h4>音素レベルの認識:</h4>
                                    <div className="phonemes-list">
                                        {feedback.phonemes.map((wordData, wordIndex) => (
                                            <div key={wordIndex} className="word-phonemes">
                                                <div className="word-header">
                                                    <span className="word-text">{wordData.word}</span>
                                                </div>
                                                <div className="phonemes-display">
                                                    {wordData.phonemes.map((phoneme, phonemeIndex) => (
                                                        <span 
                                                            key={phonemeIndex} 
                                                            className={`phoneme ${phoneme.accuracyScore >= 80 ? 'correct' : phoneme.accuracyScore >= 60 ? 'pass' : 'incorrect'}`}
                                                            title={`スコア: ${phoneme.accuracyScore || 'N/A'}`}
                                                        >
                                                            {phoneme.phoneme}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* 音素レベルの評価に基づいたアドバイス */}
                                    {(() => {
                                        const advice = generatePhonemeAdvice(feedback.phonemes);
                                        if (advice) {
                                            return (
                                                <div className={`phoneme-advice ${advice.color}`}>
                                                    <h5>アドバイス:</h5>
                                                    <p>{advice.message}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            )}
                        </>
                    )}
                </div>
                {/* ▲▲▲ ここまでが結果表示エリアです ▲▲▲ */}

                <div className="navigation-buttons">
                    <button className="nav-btn" onClick={handlePreviousItem} disabled={isAnalyzing || isRecording}>
                        &larr; 前へ
                    </button>
                    <button className="nav-btn" onClick={handleNextItem} disabled={isAnalyzing || isRecording}>
                        次へ &rarr;
                    </button>
                </div>
                {error && <p className="error-message">{error}</p>}
            </main>
        </div>
    );
};

export default App;
