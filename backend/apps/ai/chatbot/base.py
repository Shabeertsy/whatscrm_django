from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ChatbotContext:
    """
    Immutable snapshot of everything an engine needs to generate a reply.
    Passed in by the dispatcher so engines never hit the DB themselves
    for basic context.
    """
    conversation_id: int
    contact_name: str
    contact_wa_id: str
    inbound_message_body: str
    inbound_message_type: str  # 'text', 'image', 'audio', …
    history: list[dict]        # [{"role": "user"|"assistant", "content": "..."}]


@dataclass
class ChatbotReply:
    messages: list[dict] = field(default_factory=list)
    # Each dict: {"msg_type": "text", "body": "...", "media_url": ""}

    def add_text(self, text: str) -> "ChatbotReply":
        self.messages.append({"msg_type": "text", "body": text, "media_url": ""})
        return self

    def add_media(self, msg_type: str, media_url: str, caption: str = "") -> "ChatbotReply":
        self.messages.append({"msg_type": msg_type, "body": caption, "media_url": media_url})
        return self

    @property
    def is_empty(self) -> bool:
        return not self.messages


class BaseChatbotEngine(ABC):
    """
    Abstract engine. Each subclass is one reply strategy.
    The __init__ may receive any engine-specific settings object.
    """

    @abstractmethod
    def generate_reply(self, ctx: ChatbotContext) -> Optional[ChatbotReply]:
        """
        Produce a reply for the given context.
        Return None to signal "no reply" (e.g. engine is off/misconfigured).
        """
        raise NotImplementedError
