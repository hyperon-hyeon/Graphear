# Graphear — Week 1 Skeleton (Flask + PDF → Text)

이 레포는 1주차 목표(스켈레톤) 달성을 위한 **최소 기능**만 담고 있습니다.

- `/upload` : PDF 파일 업로드(로컬 저장, UUID 반환)
- `/convert` : 업로드된 PDF를 텍스트로 변환하여 길이/메타정보 반환
- (프런트) `/` : 업로드 & 변환을 테스트할 수 있는 최소 페이지

## 0) 사전 준비

```bash
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

## 1) 실행

### macOS/Linux
```bash
bash run.sh
```

### Windows (PowerShell)
```powershell
./run.bat
```

서버가 뜨면 브라우저에서 http://127.0.0.1:5000 으로 접속하세요.

## 2) 폴더 구조

```
graphear/
  app.py
  config.py
  extractor/
    __init__.py
    base.py
    pdfminer_extractor.py
    pymupdf_extractor.py
  storage/
    __init__.py
    files.py
  templates/
    index.html
  uploads/
  extracted/
  tests/
  requirements.txt
  run.sh
  run.bat
  README.md
```

## 3) 테스트

```bash
pytest -q
```

## 4) 주의사항(Week 1)

- 변환 결과는 `extracted/<uuid>.txt`로 저장됩니다.
- 대용량/비PDF 업로드는 400/413으로 에러 처리합니다.
- 2주차에 TTS(`/convert_tts`) 라우트 추가 예정.
"# BE" 
