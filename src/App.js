import React, { useState, useEffect } from "react";
import axios from "axios"; // API呼び出しのためにaxiosをインストールしてください (npm install axios)

// --- アイコンコンポーネント（変更なし） ---
const MicIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" /></svg> );
const CheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> );
const CrossIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg> );
// ---

const PRACTICE_ITEMS = [
    { type: 'pair', wordS: 'sea', ipaS: '/siː/', wordSh: 'she', ipaSh: '/ʃiː/', translation: '海 / 彼女' },
    { type: 'pair', wordS: 'seat', ipaS: '/siːt/', wordSh: 'sheet', ipaSh: '/ʃiːt/', translation: '席 / シーツ' },
    { type: 'pair', wordS: 'sell', ipaS: '/sel/', wordSh: 'shell', ipaSh: '/ʃel/', translation: '売る / 貝殻' },
    { type: 'pair', wordS: 'self', ipaS: '/self/', wordSh: 'shelf', ipaSh: '/ʃelf/', translation: '自己 / 棚' },
    { type: 'sentence', text: 'She sells seashells by the seashore.', ipa: '/ʃiː selz ˈsiːʃelz baɪ ðə ˈsiːʃɔːr/', translation: '彼女は海岸で貝殻を売る' },
];

// ✅ 修正点 1: 音声録音の仕組みを変更
const AudioRecorder = {
    recorder: null,
    stream: null,
    audioChunks: [],

    start: async function() {
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            throw new Error("Media Devices API not supported.");
        }
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioChunks = [];
        this.recorder = new MediaRecorder(this.stream);
        
        this.recorder.ondataavailable = event => {
            this.audioChunks.push(event.data);
        };

        this.recorder.start();
    },

    stop: function() {
        return new Promise(resolve => {
            if (!this.recorder) {
                return resolve(null);
            }
            this.recorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.stream?.getTracks().forEach(track => track.stop());
                resolve(audioBlob);
            };
            this.recorder.stop();
        });
    }
};

const App = () => {
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [status, setStatus] = useState('idle');
    const [activeWord, setActiveWord] = useState(null);
    const [feedback, setFeedback] = useState(null); // Azureからの評価結果を保持
    const [error, setError] = useState('');

    // ✅ 修正点 2: Azure Functions APIを呼び出す関数
    const analyzeWithAzure = async (referenceText, audioBlob) => {
        setStatus('analyzing');
        setError('');
        setFeedback(null);

        // BlobをBase64文字列に変換
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onloadend = async () => {
            const audioBase64 = reader.result.split(',')[1];
            const apiUrl = 'http://localhost:7071/api/evaluatePronunciation'; // ローカルAPIのエンドポイント

            try {
                const response = await axios.post(apiUrl, {
                    referenceText: referenceText,
                    audioBase64: audioBase64,
                });
                
                // Azureからの結果をfeedback stateに保存
                setFeedback(response.data);
                setStatus('result');
            } catch (err) {
                console.error("API Error:", err);
                const errorMessage = err.response?.data?.details || err.message || "An unknown error occurred.";
                setError(`API Error: ${errorMessage}`);
                setStatus('idle');
            }
        };
    };
    
    // ✅ 修正点 3: 録音開始・停止のハンドラーを修正
    const handleRecordStart = async (word) => {
        try {
            await AudioRecorder.start();
            setActiveWord(word);
            setStatus('recording');
            setError('');
            setFeedback(null);
        } catch (err) {
            setError("Could not start recording. Please check microphone permissions.");
            setStatus('idle');
        }
    };
    
    const handleRecordStop = async (word, ipa) => {
        // 同じボタンをもう一度押した場合に停止
        if (status === 'recording' && activeWord === word) {
            const audioBlob = await AudioRecorder.stop();
            if (audioBlob) {
                await analyzeWithAzure(word, audioBlob);
            } else {
                setStatus('idle');
            }
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

    // UI部分のロジックをAzureのfeedbackに合わせて調整
    const isCorrect = feedback ? feedback.accuracyScore > 80 : false;

    // --- UI部分は元のコードとほぼ同じですが、一部ロジックを修正 ---
    return (
        <div className="main-container">
            <header className="header">
                <h1 className="app-title">S/SH Pronunciation Coach (Azure Ver.)</h1>
                <p className="app-subtitle">Practice your /s/ and /ʃ/ sounds</p>
            </header>
            <main className="coach-card">
                 {/* ... (表示部分は元のコードを参考に、ロジックを調整) ... */}
                 {/* 以下は簡略化した表示の例 */}
                 {status === 'result' && feedback && (
                    <div className={`feedback-header ${isCorrect ? 'correct' : 'incorrect'}`}>
                        {isCorrect ? <CheckIcon/> : <CrossIcon/>}
                        <span>{isCorrect ? "Excellent!" : "Needs Practice"}</span>
                        <p>Accuracy: {feedback.accuracyScore}</p>
                        <p>Fluency: {feedback.fluencyScore}</p>
                    </div>
                 )}

                 {/* エラー表示 */}
                 {error && <p className="error-message">{error}</p>}
                 
                 {/* ボタンなど（元のコードを参考に実装） */}
            </main>
        </div>
    );
};

export default App;