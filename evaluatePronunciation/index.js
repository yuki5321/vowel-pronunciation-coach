const SpeechSDK = require("microsoft-cognitiveservices-speech-sdk");
const fs = require("fs");
const os = require('os');
const path = require('path');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const referenceText = req.body.referenceText;
    if (!referenceText || !req.body.audioBase64) {
        context.res = {
            status: 400,
            body: "Please provide referenceText and audioBase64 in the request body."
        };
        return;
    }

    // Speech Serviceの設定
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(process.env.SPEECH_KEY, process.env.SPEECH_REGION);
    const pronunciationAssessmentConfig = new SpeechSDK.PronunciationAssessmentConfig(
        referenceText,
        SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
        true
    );
    pronunciationAssessmentConfig.enableProsodyAssessment(); // ← 修正

    // 一時ファイルパスの準備
    const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}.wav`);

    try {
        // Base64デコードして一時ファイルに保存
        const audioData = Buffer.from(req.body.audioBase64, 'base64');
        fs.writeFileSync(tempFilePath, audioData);

        // 音声ファイルから評価
        const audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(fs.readFileSync(tempFilePath));
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
        pronunciationAssessmentConfig.applyTo(recognizer); // ← 修正

        const result = await new Promise((resolve, reject) => {
            recognizer.recognizeOnceAsync(resolve, reject);
        });

        recognizer.close();

        // 評価結果が存在するかチェック
        if (result && result.reason === SpeechSDK.ResultReason.RecognizedSpeech && result.properties.getProperty(SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult)) {
            
            const pronunciationResult = SpeechSDK.PronunciationAssessmentResult.fromResult(result);
            
            context.res = {
                headers: { 'Content-Type': 'application/json' },
                body: {
                    accuracyScore: pronunciationResult.accuracyScore,
                    fluencyScore: pronunciationResult.fluencyScore,
                    prosodyScore: pronunciationResult.prosodyScore,
                    completenessScore: pronunciationResult.completenessScore,
                    pronunciationScore: pronunciationResult.pronunciationScore,
                    words: pronunciationResult.detailResult.Words,
                }
            };
        } else {
            // 評価結果が取得できなかった場合
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: { 
                    error: "Pronunciation assessment could not be performed.",
                    reason: result ? SpeechSDK.ResultReason[result.reason] : "Unknown",
                    details: "The audio might be silent, too different from the reference text, or of an unsupported format."
                }
            };
        }
    } catch (error) {
        // 予期せぬエラー全般をキャッチ
        context.log.error("An unexpected error occurred:", error);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: { 
                error: "An internal server error occurred while processing the audio.",
                details: error.message
            }
        };
    } finally {
        // 成功・失敗にかかわらず、一時ファイルが存在すれば削除
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
};