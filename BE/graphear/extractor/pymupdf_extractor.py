import fitz  # PyMuPDF
from .base import BaseExtractor

class PyMuPDFExtractor(BaseExtractor):
    def extract(self, pdf_path):
        doc = fitz.open(pdf_path)
        texts = []
        for page in doc:
            texts.append(page.get_text("text"))
        return "\n".join(texts), {"engine": "pymupdf", "pages": len(doc)}
