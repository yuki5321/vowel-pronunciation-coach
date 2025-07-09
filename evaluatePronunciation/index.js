const SpeechSDK = require("microsoft-cognitiveservices-speech-sdk");
const fs = require("fs"); // ローカルテスト用に一時的に使用

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(process.env.SPEECH_KEY, process.env.SPEECH_REGION);
    const referenceText = req.body.referenceText;

    if (!referenceText || !req.body.audioBase64) {
        context.res = {
            status: 400,
            body: "Please provide referenceText and audioBase64 in the request body."
        };
        return;
    }

    // Base64デコードして一時ファイルに保存
    const audioData = Buffer.from(req.body.audioBase64, 'base64');
    const tempFilePath = `/tmp/audio.wav`; // Azure Functionsの書き込み可能ディレクトリ
    fs.writeFileSync(tempFilePath, audioData);

    // 発音評価の設定
    const pronunciationAssessmentConfig = new SpeechSDK.PronunciationAssessmentConfig(
        referenceText,
        SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
        true
    );
    pronunciationAssessmentConfig.enableProsodyAssessment = true;

    // 音声ファイルから評価
    const audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(fs.readFileSync(tempFilePath));
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    recognizer.pronunciationAssessmentConfig = pronunciationAssessmentConfig;

    try {
        const result = await new Promise((resolve, reject) => {
            recognizer.recognizeOnceAsync(result => {
                resolve(result);
            }, error => {
                reject(error);
            });
        });

        recognizer.close();
        fs.unlinkSync(tempFilePath); // 一時ファイルを削除

        const pronunciationResult = SpeechSDK.PronunciationAssessmentResult.fromResult(result);

        context.res = {
            // status: 200, /* Defaults to 200 */
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
    } catch (error) {
        context.log.error(error);
        context.res = {
            status: 500,
            body: "Error processing the audio."
        };
    }
};