from abc import ABC, abstractmethod
from typing import Tuple, Dict

class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, pdf_path: str) -> Tuple[str, Dict]:
        ...
