const express = require('express');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const gTTS = require('node-gtts'); // 🔊 TTS 라이브러리 추가

dotenv.config();

const app = express();
const port = 3001;

// Gemini API 초기화
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// CORS 및 JSON 파싱 허용
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json()); // JSON 데이터 받기 위해 필수

// 📂 생성된 오디오 파일을 프론트엔드가 가져갈 수 있게 'uploads' 폴더를 공개
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 임시 파일 저장소 설정
const upload = multer({ dest: 'uploads/' });

// uploads 폴더 없으면 생성
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType,
        },
    };
}

// 1️⃣ PDF 텍스트 추출 API
app.post('/api/extract-text', upload.single('pdfFile'), async (req, res) => {
    let tempFilePath = req.file ? req.file.path : null;
    
    if (!req.file) return res.status(400).send({ error: '파일 없음' });

    try {
        const pdfPart = fileToGenerativePart(tempFilePath, req.file.mimetype);
        
        // Gemini에게 텍스트 추출 요청
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            
            // 👇 [수정 1] 여기에 'systemInstruction'을 새로 추가하세요! (AI의 역할 설정)
            // (이 줄이 없으면 그냥 추가하면 됩니다)
            config: {
                 systemInstruction: {
                    parts: [{ text: "당신은 전문적인 OCR 및 텍스트 추출기입니다. 사용자의 지시를 철저히 따르며, 추출된 텍스트의 문단 또는 문항 구분이 바뀔 때, 문장이 끝나는 문장 부호 (느낌표나 온점)마다 줄 바꿈 문자(\n)를 삽입하여 가독성을 높여야 합니다. **모든 텍스트 추출은 사용자가 지정한 형식([기호] 단락 시작/끝, [기호] 밑줄 시작/끝)에 엄격하게 맞추어 출력해야 합니다.**" }]
                 }
            },

            contents: [
                pdfPart,
                { 
                    // 👇 [수정 2] 여기가 '구체적인 명령'을 내리는 곳입니다.
                    // 원하시는 대로 내용을 싹 지우고 다시 적으세요.
                    text:`
                    당신은 시각장애인 수험생을 위해 수학 문제지를 읽어주는 'AI 성우'입니다. 
                    제공된 문제지 이미지를 분석하여, 별도의 포맷팅(JSON, 마크다운 코드블록 등) 없이 **처음부터 끝까지 쭉 읽을 수 있는 '구어체 대본(Script)' 형태**의 텍스트로 변환하십시오.

                    다음 규칙을 엄격히 준수하십시오:

                    # 1. 출력 형식 (Plain Text)
                    - JSON 형식이나 특수기호, 불필요한 서론/결론을 절대 포함하지 마십시오.
                    - 오직 문제의 내용만, 듣기 편한 줄글 형태로 출력하십시오.
                    - 문제와 문제 사이에는 줄바꿈을 두 번 넣어 구분하십시오.

                    # 2. 수식 및 기호 변환 규칙 (가장 중요)
                    - **모든 수식은 LaTeX 코드가 아닌, '한글 발음'으로 풀어서 작성하십시오.**
                    - 절대 '$' 기호를 사용하지 마십시오. (TTS가 '달러'라고 읽습니다.)
                    - 예시:
                    - $f(x) = x^2 + 3x$ → "함수 에프 엑스는, 엑스의 제곱 더하기 3엑스"
                    - $\frac{1}{2}$ → "2분의 1" (반드시 분모 먼저 읽기)
                    - $x^3$ → "엑스의 세제곱"
                    - $a_n$ → "수열 a n"
                    - $\lim_{n \to \infty}$ → "리미트 n이 무한대로 갈 때"
                    - $\sum_{k=1}^{n}$ → "시그마 k는 1부터 n까지"
                    - $\int_{0}^{1}$ → "인테그랄 0부터 1까지"
                    - $\le$, $\ge$ → "작거나 같다", "크거나 같다"
                    - $\overline{AB}$ → "선분 A B"

                    # 3. 문제 구조 및 읽는 순서
                    문항마다 다음 순서대로 서술하십시오:
                    1. **문항 번호:** "1번 문제," 와 같이 시작.
                    2. **시각 자료 묘사 (그래프/도형이 있는 경우만):** - 문제를 읽기 전에 그래프나 도형을 머릿속으로 그릴 수 있도록 먼저 묘사하십시오.
                    - 예: "좌표평면 위에 원점이 중심이고 반지름이 1인 원이 있습니다..."
                    3. **본문 읽기:** - 문장은 끊어 읽기 좋게 쉼표(,)와 마침표(.)를 적절히 사용하십시오.
                    - 밑줄이나 강조 표시가 있다면 "밑줄 시작", "밑줄 끝"이라고 언급하십시오.
                    4. **선택지(보기) 읽기:** - **규칙:** 선택지 번호 뒤에는 쉼표(,)를 찍고, **내용이 끝날 때마다 반드시 쉼표(,)를 찍고 줄을 바꾸십시오.**
                    - 이렇게 출력해야 합니다:
                    "1번, 정답내용, 2번, 정답내용, 3번, 정답내용, 4번, 정답내용, 5번, 정답내용,"
                    
                    # 4. 예외 처리
                    - 문제지의 손글씨(풀이 흔적)나 페이지 번호, '수학 영역' 같은 머리말/꼬리말은 읽지 말고 제외하십시오.
                    `
                }
            ]
        });

        const extractedText = response.text; 
        res.json({ text: extractedText });

    } catch (error) {
        console.error('OCR 실패:', error);
        res.status(500).json({ error: '변환 실패', details: error.message });
    } finally {
        if (tempFilePath) fs.unlinkSync(tempFilePath); 
    }
});

// 2️⃣ 🔊 오디오 생성 API (새로 추가된 부분!)
app.post('/api/synthesize-speech', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: '텍스트가 없습니다.' });
    }

    try {
        const pausedText = text.replace(/\n/g, ' . . . . . . . . . . ');  // 줄바꿈을 잠시 멈춤으로 대체

        const gtts = new gTTS('ko'); // 한국어 설정
        const fileName = `speech_${Date.now()}.mp3`; // 파일명 랜덤 생성
        const filePath = path.join(__dirname, 'uploads', fileName);

        console.log("🔊 오디오 생성 시작...");

        // gTTS로 파일 저장
        gtts.save(filePath, pausedText, function() {
            console.log("✅ 오디오 생성 완료:", fileName);
            
            // 프론트엔드에 "여기서 다운받아가라"고 주소(URL)를 줌
            const audioUrl = `http://localhost:${port}/uploads/${fileName}`;
            res.json({ audioUrl: audioUrl });
        });

    } catch (error) {
        console.error("TTS 오류:", error);
        res.status(500).json({ error: "오디오 생성 실패" });
    }
});

app.listen(port, () => {
    console.log(`🚀 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});