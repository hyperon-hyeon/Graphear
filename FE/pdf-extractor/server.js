const express = require('express');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path'); // 경로 처리를 위해 path 모듈 추가

dotenv.config();

const app = express();
const port = 3001;

// Gemini API 초기화
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// CORS 설정: 클라이언트 포트 5173 허용
app.use(cors({ origin: 'http://localhost:5173' }));

// 임시 파일 저장소 설정
const upload = multer({ dest: 'uploads/' });

// Base64 인코딩 함수 (PDF 파일을 API에 전송 가능한 형태로 변환)
function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType,
        },
    };
}

/**
 * Gemini API 호출에 지수 백오프(Exponential Backoff)를 적용하여 재시도합니다.
 * API 과부하(503) 및 할당량 오류(429)를 처리하여 안정성을 높입니다.
 */
async function retryGenerateContent(config) {
    const MAX_RETRIES = 5;
    const modelName = "gemini-2.5-flash";

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            // Gemini API 호출
            const response = await ai.models.generateContent({
                model: modelName,
                ...config
            });
            return response;
        } catch (error) {
            // error 객체에서 status 코드를 직접적으로 확인할 수 있도록 수정 (ApiError 구조 사용)
            const errorStatus = error.status;

            // 503 Service Unavailable (과부하) 또는 429 Too Many Requests (할당량)인 경우
            if ((errorStatus === 503 || errorStatus === 429) && i < MAX_RETRIES - 1) {
                // 지수 백오프 딜레이 계산: 2^i * 1000ms + 무작위 지터
                const delay = Math.pow(2, i) * 1000 + Math.random() * 500; 
                console.warn(`[API 재시도] ${modelName} 모델 과부하. ${i + 1}번째 재시도 (${(delay / 1000).toFixed(1)}초 후)...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // 재시도 횟수를 모두 사용했거나, 다른 종류의 치명적인 오류인 경우
                throw error;
            }
        }
    }
}

// PDF 텍스트 추출 API 엔드포인트
app.post('/api/extract-text', upload.single('pdfFile'), async (req, res) => {
    // 임시 파일 경로를 try 블록 밖에서 선언
    let tempFilePath; 

    if (!req.file) {
        return res.status(400).send({ error: '파일을 찾을 수 없습니다.' });
    }

    tempFilePath = req.file.path;
    const mimeType = req.file.mimetype;

    try {
        // uploads 폴더가 없으면 multer가 실패할 수 있으므로, 명시적으로 확인 후 생성 (안전장치)
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads');
        }

        const pdfPart = fileToGenerativePart(tempFilePath, mimeType);

        console.log('Gemini API 호출 중 (최대 5회 재시도)...');

        // 재시도 로직을 적용하여 모델 호출
        const response = await retryGenerateContent({
            // model은 retryGenerateContent 함수 내부에 정의됨
            contents: [
                pdfPart,
                {
                    text: "이 시험지 PDF 파일의 모든 텍스트를 정확하게 추출해야 합니다. 수식, 기호, 변수는 LaTeX 코드가 아닌, 구두로 읽는 한국어 설명으로 변환합니다. 추출된 내용 외에 어떠한 서론, 결론, 제목, 부연 설명, 감정 표현, 인사말도 절대 추가하지 마십시오. 오직 추출된 텍스트 내용만을 반환합니다. 다만 문서 마지막의 쪽 페이지랑 주의 문구가 있다면 그 점은 읽지 마십시오. 그림이나 표의 경우 부연설명 없이 표현하십시오. 지문 안에 **[A], ⓐ와 같은 특정 기호로 표시된 단락이나 밑줄이 구성되어 있다면, 해당 기호와 함께 '단락 시작' 또는 '밑줄 시작', 그리고 '단락 끝' 또는 '밑줄 끝'이라고 명확하게 표현하십시오.** 예시: [A] 단락 시작, ⓐ 밑줄 시작, [A] 단락 끝, ⓐ 밑줄 끝."
                }
            ],
            systemInstruction: {
                parts: [{
                    text: "당신은 전문적인 OCR 및 텍스트 추출기입니다. 사용자의 지시를 철저히 따르며, 추출된 텍스트의 문단 또는 문항 구분이 바뀔 때, 문장이 끝나는 문장 부호 (느낌표나 온점)마다 줄 바꿈 문자(\n)를 삽입하여 가독성을 높여야 합니다. **모든 텍스트 추출은 사용자가 지정한 형식([기호] 단락 시작/끝, [기호] 밑줄 시작/끝)에 엄격하게 맞추어 출력해야 합니다.**"
                }]
            }
        });

        const extractedText = response.text;
        console.log('API 응답 수신 완료.');

        res.json({ text: extractedText });

    } catch (error) {
        // 오류 메시지를 클라이언트로 전송하여 문제 진단을 돕습니다.
        console.error('API 호출 중 오류 발생:', error);
        
        // 오류 메시지 형식 수정 (JSON 문자열인 경우 파싱 시도)
        let errorMessage = error.message || '알 수 없는 오류';
        
        try {
            // 오류 메시지가 JSON 문자열인 경우 파싱하여 더 깔끔하게 전달
            const parsedError = JSON.parse(errorMessage);
            if (parsedError && parsedError.error && parsedError.error.message) {
                errorMessage = parsedError.error.message;
            }
        } catch (e) {
        }


        res.status(500).json({
            error: '텍스트 추출에 실패했습니다.',
            details: errorMessage 
        });
    } finally {
        // 임시 파일 삭제
        if (tempFilePath) {
            fs.unlink(tempFilePath, (err) => {
                if (err) console.error('임시 파일 삭제 실패:', err);
            });
        }
    }
});

// 서버 시작
app.listen(port, () => {
    console.log(`Node.js 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});