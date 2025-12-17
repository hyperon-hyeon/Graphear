# app.py
from pathlib import Path
import io
import json

from flask import Flask, render_template, request, jsonify, Response

from storage.files import save_pdf, get_paths
from extractor.gemini_pdf import extract_full_pdf
from gtts import gTTS

# ---------------------------
# 기본 설정
# ---------------------------
app = Flask(__name__)
app.config.from_object("config.Config")

BASE_DATA_DIR = Path("data")
BASE_DATA_DIR.mkdir(exist_ok=True)


# ---------------------------
# 내부 유틸 함수
# ---------------------------
def get_result_path(pdf_id: str) -> Path:
    pdf_dir = BASE_DATA_DIR / pdf_id
    pdf_dir.mkdir(parents=True, exist_ok=True)
    return pdf_dir / "result.json"


def save_result(pdf_id: str, result: dict):
    path = get_result_path(pdf_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)


def load_result(pdf_id: str) -> dict:
    path = get_result_path(pdf_id)
    if not path.exists():
        raise FileNotFoundError("result not found")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def tts_from_text(text: str):
    tts_obj = gTTS(text=text, lang="ko")
    buf = io.BytesIO()
    tts_obj.write_to_fp(buf)
    buf.seek(0)
    return Response(buf.read(), mimetype="audio/mpeg")


# ---------------------------
# 1. 테스트용 기본 페이지 (유지)
# ---------------------------
@app.get("/")
def home():
    return render_template("index.html")


# ---------------------------
# 2. PDF 업로드
# ---------------------------
@app.post("/upload")
def upload():
    f = request.files.get("file")
    if not f:
        return jsonify({"ok": False, "error": "no file"}), 400

    try:
        pdf_id = save_pdf(f)
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400

    return jsonify({"ok": True, "pdf_id": pdf_id}), 201


# ---------------------------
# 3. PDF 분석 (Gemini → 결과 저장)
# ---------------------------
@app.post("/convert")
def convert():
    body = request.get_json(silent=True) or {}
    pdf_id = body.get("pdf_id")

    if not pdf_id:
        return jsonify({"ok": False, "error": "no pdf_id"}), 400

    try:
        paths = get_paths(pdf_id)
        pdf_path = paths["pdf"]
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400

    try:
        result = extract_full_pdf(pdf_path)
        save_result(pdf_id, result)
    except Exception as e:
        return jsonify({"ok": False, "error": f"convert failed: {e}"}), 500

    return jsonify({"ok": True, "pdf_id": pdf_id}), 200


# =====================================================
# 🔥 프론트엔드 전용 API (여기부터 핵심)
# =====================================================

# ---------------------------
# 4. 문제 목록 API
# ---------------------------
@app.get("/api/pdfs/<pdf_id>/problems")
def list_problems(pdf_id):
    try:
        result = load_result(pdf_id)
    except FileNotFoundError:
        return jsonify({"ok": False, "error": "result not found"}), 404

    problems = []
    for idx, q in enumerate(result.get("questions", []), start=1):
        problems.append({
            "id": idx,
            "title": f"{idx}번 문제",
            "preview": q.get("text", "")[:40]
        })

    return jsonify({
        "pdf_id": pdf_id,
        "problems": problems
    })


# ---------------------------
# 5. 문제 상세 API
# ---------------------------
@app.get("/api/pdfs/<pdf_id>/problems/<int:pid>")
def get_problem(pdf_id, pid):
    try:
        result = load_result(pdf_id)
        q = result["questions"][pid - 1]
    except Exception:
        return jsonify({"ok": False, "error": "problem not found"}), 404

    return jsonify({
        "id": pid,
        "title": f"{pid}번 문제",
        "text": q.get("text", ""),
        "choices": q.get("choices", []),
        "tts_url": f"/api/pdfs/{pdf_id}/problems/{pid}/tts"
    })


# ---------------------------
# 6. 문제별 TTS API
# ---------------------------
@app.get("/api/pdfs/<pdf_id>/problems/<int:pid>/tts")
def problem_tts(pdf_id, pid):
    try:
        result = load_result(pdf_id)
        q = result["questions"][pid - 1]
        text = q.get("text", "")
    except Exception:
        return jsonify({"ok": False, "error": "problem not found"}), 404

    if not text:
        return jsonify({"ok": False, "error": "no text"}), 400

    return tts_from_text(text)


# ---------------------------
# 실행
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True)