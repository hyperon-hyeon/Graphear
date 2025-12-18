from io import StringIO
from pdfminer.high_level import extract_text_to_fp
from .base import BaseExtractor

class PDFMinerExtractor(BaseExtractor):
    def extract(self, pdf_path):
        out = StringIO()
        with open(pdf_path, "rb") as fp:
            extract_text_to_fp(fp, out)
        text = out.getvalue()
        return text, {"engine": "pdfminer.six"}
