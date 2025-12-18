# extractor/question_parser.py

import re
from typing import List, Dict

# [문항 1] 처럼 생긴 헤더를 찾는 정규식
QUESTION_HEADER_PATTERN = re.compile(
    r"^\s*\[문항\s+(\d+)\]\s*(.*)$",
    re.MULTILINE,
)


def parse_questions_from_accessible_text(text: str) -> List[Dict]:
    """
    Gemini에서 받은 accessible_text(여러 페이지 합친 것)를
    [문항 N] 단위로 잘라서 리스트로 반환한다.

    반환 예:
    [
        {"number": 1, "header": "[문항 1]", "body": "..."},
        {"number": 2, "header": "[문항 2]", "body": "..."},
        ...
    ]
    """
    if not text:
        return []

    # 정규식으로 [문항 N] 헤더들 모두 찾기
    matches = list(QUESTION_HEADER_PATTERN.finditer(text))

    if not matches:
        # 문항 헤더를 전혀 못 찾으면, 전체를 하나의 "0번 문항"으로 반환
        return [
            {
                "number": 0,
                "header": "",
                "body": text.strip(),
            }
        ]

    questions: List[Dict] = []

    for idx, match in enumerate(matches):
        number_str = match.group(1)  # "1", "2", ...
        header_rest = match.group(2)  # [문항 1] 바로 뒤에 붙은 글자들 (있으면)

        try:
            number = int(number_str)
        except ValueError:
            number = -1

        # 현재 헤더의 시작 위치
        start_pos = match.end()

        # 마지막 문항이면, 텍스트 끝까지
        if idx + 1 < len(matches):
            end_pos = matches[idx + 1].start()
        else:
            end_pos = len(text)

        body = text[start_pos:end_pos].strip()

        full_header_line = match.group(0).strip()
        if header_rest:
            # [문항 1] 뒤에 내용이 이어지면 body 앞에 붙여주기
            body = (header_rest + "\n" + body).strip()

        questions.append(
            {
                "number": number,
                "header": full_header_line,
                "body": body,
            }
        )

    return questions
