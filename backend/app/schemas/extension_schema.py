from pydantic import BaseModel, HttpUrl
from typing import List, Optional

class FormInfo(BaseModel):
    action: str
    isMismatchedDomain: bool
    hasPasswordInput: bool

class ExtensionPayload(BaseModel):
    url: str
    domain: str
    title: str
    techStack: List[str]
    forms: List[FormInfo]
    links: List[str]
    suspiciousKeywords: List[str]
    urgencyKeywords: List[str]
    metaMetadata: Optional[dict] = {}
