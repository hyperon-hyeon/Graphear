# extractor/pdf_images.py

import fitz  # PyMuPDF

def extract_full_pdf(pdf_path: str) -> str:

    doc = fitz.open(pdf_path)

    texts = []
    for page_index in range(len(doc)):
        page = doc.load_page(page_index)
        # 페이지에서 텍스트만 추출
        page_text = page.get_text("text")

        # 페이지 구분선 넣어 주면 나중에 TTS 할 때도 편함
        header = f"\n\n===== Page {page_index + 1} =====\n\n"
        texts.append(header + page_text)

    doc.close()

    full_text = "".join(texts).strip()
    return full_text


# 이미지 + 캡션 추출용(나중에 젬니니 붙일 때 쓸 거면 여기 구현)
# 지금은 일단 빈 껍데기로 둬도 되고, 안 쓰면 무시해도 됨.
def extract_images_with_captions(pdf_path: str):

    return []
