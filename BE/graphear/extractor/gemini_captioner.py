import os
import google.generativeai as genai

# ----------------------------------
# API KEY 확인
# ----------------------------------
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("환경변수 GEMINI_API_KEY가 설정되지 않음. setx GEMINI_API_KEY \"키값\" 으로 설정하세요.")

genai.configure(api_key=API_KEY)

# ----------------------------------
# 사용할 모델 (v1beta에서 작동이 확실한 모델)
# ----------------------------------
MODEL_NAME = "models/gemini-pro-latest"
model = genai.GenerativeModel(MODEL_NAME)

# ----------------------------------
# 이미지 분석 프롬프트
# ----------------------------------
PROMPT = """
당신은 시각장애인 수험생을 위한 수학 시험지 접근성 변환 전문가입니다.
이미지를 분석하여 JSON으로 구조화하여 출력하세요.
"""

# ----------------------------------
# 이미지 → JSON 분석 함수
# ----------------------------------
def describe_image(image_path: str) -> str:
    """이미지 파일을 분석하여 JSON 설명 반환"""
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()

        response = model.generate_content(
            [
                PROMPT,
                {
                    "mime_type": "image/png",
                    "data": image_bytes,
                },
            ]
        )

        # response.text가 있는 경우
        if hasattr(response, "text") and response.text:
            return response.text

        # candidates 기반 백업
        if getattr(response, "candidates", None):
            parts = response.candidates[0].content.parts
            texts = [p.text for p in parts if hasattr(p, "text")]
            if texts:
                return "".join(texts)

        return "[AI 설명 실패: 응답에서 텍스트를 찾을 수 없음]"

    except Exception as e:
        return f"[AI 설명 실패: {str(e)}]"
