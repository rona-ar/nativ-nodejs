const express = require('express');
const app = express();
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const port = 3000;

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const settings = {
    subscriptionKey : 'f8a7186927bd4c23b8464cccca835ed6',
    serviceRegion : 'eastus',
    language : 'en-US'
}

app.use(bodyParser.json({ limit: '10mb' }));
app.get('/', (req, res) => {
  res.send("Hello From Speech Recognition");
});
app.post('/test', multer({ storage: diskStorage }).single("audio"), (req, res) => {
  
  const file = req.file.path;
  const ref_text = req.body.reference_text;
  
  const audio = req.file;
  const audioFilename = new Date().getTime()+".wav";

  fs.writeFileSync('text.txt', ref_text);

  const result = fs.readFileSync('return.json');
  const jsonData = JSON.parse(result)
  res.json(jsonData)
});

app.post('/', multer({ storage: diskStorage }).single("audio"), (req, res) => {
  const file = req.file.path;
  const ref_text = req.body.reference_text;
  
  const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(file));
  const speechConfig = sdk.SpeechConfig.fromSubscription(settings.subscriptionKey, settings.serviceRegion);

  const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
      ref_text,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true
  );

  speechConfig.speechRecognitionLanguage = settings.language;

  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  pronunciationAssessmentConfig.applyTo(recognizer);

  recognizer.recognizeOnceAsync((result) => {
    const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);

    // Proses hasil penilaian pengucapan
    const evaluationResult = {
      accuracyScore: pronunciationResult.accuracyScore,
      pronunciationScore: pronunciationResult.pronunciationScore,
      completenessScore: pronunciationResult.completenessScore,
      fluencyScore: pronunciationResult.fluencyScore,
      wordLevelDetails: pronunciationResult.detailResult.Words.map((word, idx) => ({
        index: idx + 1,
        word: word.Word,
        accuracyScore: word.PronunciationAssessment.AccuracyScore,
        errorType: word.PronunciationAssessment.ErrorType,
      })),
    };

    res.json(evaluationResult);

    recognizer.close();
    // fs.unlinkSync(audioFilename);
  });
});

app.listen(port, function(){
  console.log(`server running on port ${port}`);
});
