# storage/files.py
import uuid
from pathlib import Path
from werkzeug.datastructures import FileStorage

from config import Config


# 업로드 기본 경로: config.Config.UPLOAD_DIR 사용
BASE_UPLOAD_DIR = Path(Config.UPLOAD_DIR)


def _ensure_upload_dir():
    BASE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_pdf(file: FileStorage) -> str:
    """
    업로드된 PDF 파일을 저장하고, 식별용 pdf_id(문자열)를 반환한다.
    - pdf_id는 uuid4 기반
    - 실제 파일 경로: <UPLOAD_DIR>/<pdf_id>.pdf
    """
    if not file or file.filename == "":
        raise ValueError("파일이 없습니다.")

    # 간단하게 확장자 체크
    if not file.filename.lower().endswith(".pdf"):
        raise ValueError("PDF 파일만 업로드할 수 있습니다.")

    _ensure_upload_dir()

    pdf_id = str(uuid.uuid4())
    save_path = BASE_UPLOAD_DIR / f"{pdf_id}.pdf"
    file.save(save_path)

    return pdf_id


def get_paths(pdf_id: str) -> dict:
    """
    pdf_id 로부터 실제 파일 경로를 돌려준다.
    필요하면 나중에 JSON, 로그 파일 등도 여기에서 관리 가능.
    """
    _ensure_upload_dir()

    pdf_path = BASE_UPLOAD_DIR / f"{pdf_id}.pdf"

    if not pdf_path.exists():
        raise ValueError(f"PDF 파일을 찾을 수 없습니다: {pdf_id}")

    return {
        "pdf": str(pdf_path),
    }
