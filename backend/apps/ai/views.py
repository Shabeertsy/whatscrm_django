from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AIAgentSettings, AIProviderSettings
from .serializers import AIAgentSettingsSerializer, AIProviderSettingsSerializer


from .chatbot.base import ChatbotContext
from .chatbot.ai_engine import AIEngine
from rest_framework.views import APIView


class AIProviderSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = AIProviderSettingsSerializer
    permission_classes = [IsAuthenticated]
    queryset = AIProviderSettings.objects.all()


class AIAgentSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = AIAgentSettingsSerializer
    permission_classes = [IsAuthenticated]
    queryset = AIAgentSettings.objects.all()

    def create(self, request, *args, **kwargs):
        existing_instance = AIAgentSettings.objects.first()
        if existing_instance:
            serializer = self.get_serializer(existing_instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        return super().create(request, *args, **kwargs)


class TestAIAgentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        messages = request.data.get('messages', [])
        config = request.data.get('agent_config', {})

        provider_id = config.get('provider')
        if not provider_id:
            return Response({"error": "No AI Provider selected. Please configure a provider first."}, status=400)
            
        try:
            provider = AIProviderSettings.objects.get(id=provider_id)
        except AIProviderSettings.DoesNotExist:
            return Response({"error": "Invalid provider selected."}, status=400)

        if not provider.ai_provider_api_key:
            return Response({"error": "Selected provider is missing an API key."}, status=400)

        # Fetch the real agent to get the uploaded knowledge base file if it exists
        real_agent = AIAgentSettings.objects.filter(is_active=True).first()
        kb_file = real_agent.knowledge_base if real_agent else None

        agent = AIAgentSettings(
            provider=provider,
            model_name=config.get('model_name', 'gpt-4o-mini'),
            system_prompt=config.get('system_prompt', ''),
            temperature=float(config.get('temperature', 0.7) or 0.7),
            knowledge_base=kb_file
        )

        if not messages:
            return Response({"reply": "Hello! I am ready to test your system instructions. How can I help you today?"})

        last_message = messages[-1].get('text', '')
        
        history = []
        for m in messages[:-1]:
            history.append({
                "role": "user" if m.get("sender") == "user" else "assistant",
                "content": m.get("text", "")
            })

        ctx = ChatbotContext(
            conversation_id=0,
            contact_name="Test Sandbox User",
            contact_wa_id="0000000000",
            inbound_message_body=last_message,
            inbound_message_type="text",
            history=history
        )

        engine = AIEngine(agent)
        try:
            reply = engine.generate_reply(ctx)
            if reply and reply.messages:
                reply_text = reply.messages[0].get("body", "")
                return Response({"reply": reply_text})
            else:
                return Response({"reply": "[No reply generated]"})
        except Exception as e:
            import logging
            logging.getLogger(__name__).exception("AI Test Error")
            return Response({"error": str(e)}, status=500)

