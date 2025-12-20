from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import torch

# 전역으로 한 번만 로드해서 재사용
_processor = None
_model = None


def load_blip(device=None):
    global _processor, _model

    # 이미 로드되어 있으면 그대로 사용
    if _processor is None or _model is None:
        _processor = BlipProcessor.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )
        _model = BlipForConditionalGeneration.from_pretrained(
            "Salesforce/blip-image-captioning-base"
        )

        # 디바이스 선택 (GPU 있으면 cuda, 없으면 cpu)
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"

        _model.to(device)
        # 나중에 꺼내 쓰기 위해 커스텀 속성으로 저장
        _model.device_name = device

    return _processor, _model


def describe_image(image_path: str, max_tokens: int = 40) -> str:
    """
    이미지 파일 경로를 받아 BLIP 모델로 캡션(설명 문장)을 생성하는 함수
    """
    processor, model = load_blip()
    device = model.device_name

    # 이미지 로드
    image = Image.open(image_path).convert("RGB")

    # 모델 입력 생성
    inputs = processor(image, return_tensors="pt").to(device)

    # 캡션 생성
    out = model.generate(**inputs, max_new_tokens=max_tokens)

    # 토큰을 문자열로 디코딩
    caption = processor.decode(out[0], skip_special_tokens=True)

    return caption.strip()  # ← 여기서는 # 주석 사용!
