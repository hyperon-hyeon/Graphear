from .pymupdf_extractor import PyMuPDFExtractor
from .pdfminer_extractor import PDFMinerExtractor

def get_extractor(prefer: str = "pymupdf"):
    return PyMuPDFExtractor() if prefer == "pymupdf" else PDFMinerExtractor()
