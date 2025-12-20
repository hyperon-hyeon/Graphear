# extractor/gemini_pdf.py
import os
import json

import fitz  # PyMuPDF
from dotenv import load_dotenv
import google.generativeai as genai


# ------------------------------------------------------------------
# 1. Gemini 설정
# ------------------------------------------------------------------
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY 가 설정되어 있지 않습니다. "
        ".env 파일에 GOOGLE_API_KEY=... 를 추가해 주세요."
    )

genai.configure(api_key=GOOGLE_API_KEY)

generation_config = {
    "temperature": 0.0,
    "response_mime_type": "application/json",  # JSON만 받도록 강제
}

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",  # 1.5-flash 써도 되지만 2.5 추천
    generation_config=generation_config,
)

# ------------------------------------------------------------------
# 2. 프롬프트
# ------------------------------------------------------------------
SYSTEM_PROMPT = """
# 역할
너는 시각장애인 수험생을 위한 '수학 시험지 분석 보조 AI'이다.

# 입력
- 수학 시험지의 '한 페이지' 이미지가 주어진다.

# 출력 (반드시 아래 JSON 형식 하나만, 추가 설명 절대 금지)
{
  "page": <페이지 번호 정수>,
  "questions": [
    {
      "id": "1",               // 페이지 내에서의 문항 번호 (문자열)
      "body": "문제 본문 전체", // 시험지를 말로 읽기 편하도록 풀어서 쓰기
      "choices": [
        "① ...",
        "② ...",
        "③ ...",
        "④ ..."
      ]
    }
  ]
}

# 세부 규칙
- JSON 이외의 텍스트(설명, 사과 문구, 마크다운 등)는 절대 출력하지 마라.
- 선택지가 없는 서술형 문제면 "choices": [] 로 둔다.
- 수식은 LaTeX 스타일로 표현해도 되지만, 시각장애인이 듣는다고 생각하고 문장으로도 풀어서 써라.
- 보기 번호는 '①', '②', '③', '④' 처럼 그대로 적어도 되고, '(1)', '(2)' 등으로 적어도 된다.
- 한 페이지에 여러 문제가 있으면 "questions" 배열에 순서대로 넣어라.
"""


# ------------------------------------------------------------------
# 3. 내부 유틸: PDF 페이지 → PNG 바이트
# ------------------------------------------------------------------
def _page_to_png_bytes(page, dpi: int = 200) -> bytes:
    """
    PyMuPDF page 객체를 받아서 PNG 바이트로 변환한다.
    dpi를 높이면 인식률은 올라가지만 속도/용량이 커진다.
    """
    pix = page.get_pixmap(dpi=dpi)
    # 바로 PNG 바이트로 변환
    return pix.tobytes("png")


# ------------------------------------------------------------------
# 4. 메인 함수: 전체 PDF → 질문 JSON
# ------------------------------------------------------------------
def extract_full_pdf(pdf_path: str) -> dict:
    """
    pdf_path 에 있는 시험지 PDF를 페이지 단위로 Gemini Vision에 보내서
    전체 문항 정보를 JSON 형태로 반환한다.

    반환 형식:
    {
        "meta": {
            "engine": "gemini-2.5-flash",
            "page_count": 3
        },
        "questions": [
            {
                "id": "1",              # 페이지 기준 번호
                "global_id": "1-1",     # 전역 고유 ID (페이지-문항)
                "page": 1,              # 페이지 번호
                "body": "...",
                "choices": ["① ...", "② ..."]
            },
            ...
        ]
    }
    """
    doc = fitz.open(pdf_path)
    all_questions = []
    question_counter = 1  # 전체 문항 번호 (필요하면 사용)

    for page_index, page in enumerate(doc):
        page_no = page_index + 1

        # 1) 페이지를 이미지(PNG)로 렌더링
        png_bytes = _page_to_png_bytes(page, dpi=200)

        # 2) Gemini Vision 호출 (이미지 + 시스템 프롬프트)
        response = model.generate_content(
            [
                SYSTEM_PROMPT,
                f"이 이미지는 수학 시험지의 {page_no} 페이지이다.",
                {
                    "mime_type": "image/png",
                    "data": png_bytes,
                },
            ]
        )

        raw = response.text or ""

        try:
            page_json = json.loads(raw)
        except json.JSONDecodeError:
            # 혹시 JSON이 깨져 나오면 최소한 구조가 깨지지 않게 안전장치
            page_json = {
                "page": page_no,
                "questions": [],
                "raw_response": raw,
            }

        questions = page_json.get("questions", [])

        # 3) 각 문제에 전역 id / page 정보 붙여주기
        for q in questions:
            local_id = str(q.get("id", question_counter))
            q["id"] = local_id           # 페이지 기준 id
            q["page"] = page_no          # 몇 페이지에 있는 문제인지
            q["global_id"] = f"{page_no}-{local_id}"  # 전역 유니크 id

            # body / choices 필드 없으면 기본값
            q.setdefault("body", "")
            q.setdefault("choices", [])

            all_questions.append(q)
            question_counter += 1

    # 프론트에서 쓰기 편하도록 meta + questions 구조로 반환
    meta = {
        "engine": "gemini-2.5-flash",
        "page_count": len(doc),
    }

    return {
        "meta": meta,
        "questions": all_questions,
    }
