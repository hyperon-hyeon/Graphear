from extractor import get_extractor

def test_choose():
    assert get_extractor("pymupdf").__class__.__name__ == "PyMuPDFExtractor"
    assert get_extractor("pdfminer").__class__.__name__ == "PDFMinerExtractor"
