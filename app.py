# app.py
from pathlib import Path
import io

from flask import Flask, render_template, request, jsonify, Response

from storage.files import save_pdf, get_paths
from extractor.gemini_pdf import extract_full_pdf
from gtts import gTTS

app = Flask(__name__)
app.config.from_object("config.Config")


# ---------------------------
# 1. 기본 페이지
# ---------------------------
@app.get("/")
def home():
    return render_template("index.html")


# ---------------------------
# 2. PDF 업로드 (파일 저장 + pdf_id 반환)
# ---------------------------
@app.post("/upload")
def upload():
    f = request.files.get("file")
    if not f:
        return jsonify({"ok": False, "error": "no file"}), 400

    try:
        pdf_id = save_pdf(f)  # 파일 저장 후 uuid 같은 문자열 반환
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400

    return jsonify({"ok": True, "pdf_id": pdf_id}), 201


# ---------------------------
# 3. PDF 분석 → Gemini Vision 사용해서 JSON 반환
# ---------------------------
@app.post("/convert")
def convert():
    body = request.get_json(silent=True) or {}
    pdf_id = body.get("pdf_id")

    if not pdf_id:
        return jsonify({"ok": False, "error": "no pdf_id"}), 400

    try:
        paths = get_paths(pdf_id)
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400

    pdf_path = paths["pdf"]

    try:
        result = extract_full_pdf(pdf_path)
    except Exception as e:
        # 여기서 에러 나면 프론트에서 디버깅하기 좋게 메시지 내려주기
        return jsonify({"ok": False, "error": f"extract_full_pdf failed: {e}"}), 500

    # result = {"meta": {...}, "questions": [...]}
    return jsonify(
        {
            "ok": True,
            "meta": result.get("meta", {}),
            "questions": result.get("questions", []),
        }
    ), 200


# ---------------------------
# 4. TTS: 텍스트 → mp3 스트림 반환
# ---------------------------
@app.post("/tts")
def tts():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({"ok": False, "error": "no text"}), 400

    try:
        # 한국어로 TTS 생성
        tts_obj = gTTS(text=text, lang="ko")
        buf = io.BytesIO()
        tts_obj.write_to_fp(buf)
        buf.seek(0)
    except Exception as e:
        return jsonify({"ok": False, "error": f"tts failed: {e}"}), 500

    # 바로 mp3 바이너리 스트림으로 응답
    return Response(buf.read(), mimetype="audio/mpeg")


if __name__ == "__main__":
    app.run(debug=True)
