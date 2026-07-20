import logging
from typing import Optional

from .base import BaseChatbotEngine, ChatbotContext, ChatbotReply

logger = logging.getLogger(__name__)


class AIEngine(BaseChatbotEngine):
    """
    Calls the configured LLM provider and returns a text reply.
    """

    MAX_HISTORY_MESSAGES = 15
    MAX_TOKENS_REPLY = 512

    def __init__(self, settings):
        """
        settings: AIAgentSettings instance (already validated by dispatcher)
        """
        self.settings = settings
        

    # Public API
    # ------------------------------------------------------------------
    def generate_reply(self, ctx: ChatbotContext) -> Optional[ChatbotReply]:
        if not ctx.inbound_message_body and ctx.inbound_message_type != "text":
            # Non-text message with no body — send a polite nudge
            ctx = ChatbotContext(
                **{**ctx.__dict__,
                   "inbound_message_body": f"[The user sent a {ctx.inbound_message_type} message]"}
            )

        history = ctx.history[-self.MAX_HISTORY_MESSAGES:]
        
        # Append the current inbound message to the end of the history
        if ctx.inbound_message_body:
            history.append({
                "role": "user",
                "content": ctx.inbound_message_body
            })
            
        provider = self.settings.provider.ai_provider_name
        api_key  = self.settings.provider.ai_provider_api_key

        system_prompt = self.settings.system_prompt or ""
        
        # Extract and append knowledge base
        if getattr(self.settings, 'knowledge_base', None) and self.settings.knowledge_base.name:
            kb_text = _extract_text_from_file(self.settings.knowledge_base)
            if kb_text:
                system_prompt += (
                    "\n\n--- COMPANY KNOWLEDGE BASE ---\n"
                    "Use the following information to answer the user's queries. "
                    "Prioritize this information over your general knowledge:\n"
                    f"{kb_text}\n"
                    "------------------------------\n"
                )

        if system_prompt:
            system_prompt += (
                "\n\n--- FORMATTING RULES ---\n"
                "You are communicating via WhatsApp. DO NOT use standard Markdown (**bold** or ## headings).\n"
                "1. Use *text* for bold (e.g., *Hello*).\n"
                "2. Use _text_ for italics.\n"
                "3. Use ~text~ for strikethrough.\n"
                "4. Use plain text dashes (-) for bullet points.\n"
                "5. Keep your messages concise, plain, and professional. Avoid excessive emojis."
            )

        try:
            model_name = _get_fallback_model(provider, self.settings.model_name)

            if provider == "openai":
                text = self._call_openai(api_key, history, ctx, model_name, system_prompt)
            elif provider == "claude":
                text = self._call_claude(api_key, history, ctx, model_name, system_prompt)
            elif provider == "gemini":
                text = self._call_gemini(api_key, history, ctx, model_name, system_prompt)
            else:
                logger.error(f"Unknown AI provider: {provider}")
                return None

        except Exception as exc:
            err_msg = str(exc)
            if "NOT_FOUND" in err_msg or "not found" in err_msg.lower():
                raise ValueError(f"Model '{self.settings.model_name}' is invalid or not supported by {provider}. Please check the model name.")
            logger.exception(f"[AIEngine] Provider '{provider}' raised: {exc}")
            raise ValueError(f"Provider Error: {exc}")

        if not text:
            return None
        return ChatbotReply().add_text(text)


    # Provider implementations
    # ------------------------------------------------------------------
    def _call_openai(self, api_key: str, history: list, ctx: ChatbotContext, model_name: str, system_prompt: str) -> str:
        import openai

        client = openai.OpenAI(api_key=api_key)
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)

        response = client.chat.completions.create(
            model=model_name or "gpt-4o-mini",
            messages=messages,
            temperature=self.settings.temperature,
            max_tokens=self.MAX_TOKENS_REPLY,
        )
        return (response.choices[0].message.content or "").strip()

    def _call_claude(self, api_key: str, history: list, ctx: ChatbotContext, model_name: str, system_prompt: str) -> str:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        # Claude strictly alternates user/assistant; collapse consecutive same-role messages
        claude_history = _normalize_history_for_claude(history)

        response = client.messages.create(
            model=model_name or "claude-3-haiku-20240307",
            system=system_prompt,
            messages=claude_history,
            temperature=self.settings.temperature,
            max_tokens=self.MAX_TOKENS_REPLY,
        )
        return (response.content[0].text or "").strip()

    def _call_gemini(self, api_key: str, history: list, ctx: ChatbotContext, model_name: str, system_prompt: str) -> str:
        import google.generativeai as genai

        genai.configure(api_key=api_key)

        # Gemini uses "user" and "model" roles
        gemini_history = [
            {"role": "user" if h["role"] == "user" else "model",
             "parts": [h["content"]]}
            for h in history
        ]
        
        model = genai.GenerativeModel(
            model_name=model_name or "gemini-2.5-flash",
            system_instruction=system_prompt,
        )

        # All but the last message go as history; the last is the prompt
        chat_history = gemini_history[:-1] if len(gemini_history) > 1 else []
        last_user_msg = gemini_history[-1]["parts"][0] if gemini_history else ctx.inbound_message_body

        chat = model.start_chat(history=chat_history)
        response = chat.send_message(last_user_msg)
        return (response.text or "").strip()


# Helpers
# ------------------------------------------------------------------
def _normalize_history_for_claude(history: list[dict]) -> list[dict]:
    """
    Claude requires strictly alternating user/assistant turns.
    Merge consecutive messages from the same role.
    """
    if not history:
        return []
    normalized = []
    for msg in history:
        if normalized and normalized[-1]["role"] == msg["role"]:
            normalized[-1]["content"] += "\n" + msg["content"]
        else:
            normalized.append({"role": msg["role"], "content": msg["content"]})
    return normalized


def _get_fallback_model(provider: str, model_name: str) -> str:
    """
    Auto-corrects the model name if it obviously belongs to a different provider.
    This prevents 404s when switching providers in the UI but forgetting to change the model.
    """
    if not model_name:
        model_name = ""
        
    lower_model = model_name.lower()
    
    if provider == "gemini" and ("gpt" in lower_model or "claude" in lower_model):
        return "gemini-2.5-flash"
    elif provider == "openai" and ("gemini" in lower_model or "claude" in lower_model):
        return "gpt-4o-mini"
    elif provider == "claude" and ("gpt" in lower_model or "gemini" in lower_model):
        return "claude-3-haiku-20240307"
        
    return model_name

def _extract_text_from_file(file_field) -> str:
    """Reads a PDF or TXT file directly from Django's storage (including S3)."""
    if not file_field or not file_field.name:
        return ""
    
    try:
        ext = file_field.name.lower().split('.')[-1]
        
        with file_field.open('rb') as f:
            content = f.read()
            
        if not content:
            return ""
            
        if ext == 'pdf':
            import fitz  # PyMuPDF
            doc = fitz.open(stream=content, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text() + "\n"
            return text.strip()
        elif ext in ['txt', 'csv', 'md']:
            return content.decode('utf-8', errors='replace').strip()
        else:
            return ""
            
    except Exception as e:
        logger.error(f"[KnowledgeBase] Failed to parse file {file_field.name}: {e}")
        return ""
