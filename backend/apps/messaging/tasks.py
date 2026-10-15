import subprocess
import os
import json
import uuid
import tempfile
import shutil
import logging
import time


from celery import shared_task
from django.core.files.base import ContentFile
from django.utils import timezone as django_tz
from django.conf import settings

from .models import Message
from .storage_backends import get_whatsapp_storage
from .utils import send_whatsapp_message, broadcast_message_status_update


from apps.messaging.models import Conversation
from apps.ai.chatbot.dispatcher import ChatbotDispatcher
from apps.automation.engine import AutomationEngine
from apps.ai.models import AIAgentSettings
from apps.automation.models import FlowExecution, ExecutionStatus



logger = logging.getLogger(__name__)

# Resolution-based encoding profiles: (max_height, crf, maxrate, bufsize, audio_bitrate)
# Ordered smallest -> largest; first match wins
ENCODING_TIERS = [
    (480,  26, "800k",  "1600k", "64k"),
    (720,  26, "1500k", "3000k", "96k"),
    (1080, 24, "2500k", "5000k", "128k"),
]
DEFAULT_TIER = (24, "3500k", "7000k", "128k")  # fallback for >1080p

def probe_video(path):
    """Return (width, height, duration) using ffprobe."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-show_entries', 'format=duration',
        '-of', 'json',
        path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(result.stdout)
    stream = data['streams'][0]
    duration = float(data.get('format', {}).get('duration', 0))
    return stream['width'], stream['height'], duration


def get_tier_for_height(height):
    for max_h, crf, maxrate, bufsize, abitrate in ENCODING_TIERS:
        if height <= max_h:
            return crf, maxrate, bufsize, abitrate
    crf, maxrate, bufsize, abitrate = DEFAULT_TIER
    return crf, maxrate, bufsize, abitrate


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def compress_chat_video(self, message_id):
    tmp_dir = tempfile.mkdtemp(prefix="chat_vid_")
    input_path = os.path.join(tmp_dir, "input.mp4")
    output_video = None

    try:
        msg = Message.objects.get(id=message_id)
        if msg.msg_type != 'video' or not msg.storage_path:
            return

        storage = get_whatsapp_storage()
        if not storage.exists(msg.storage_path):
            logger.error(f"Source video not found for Message {message_id}: {msg.storage_path}")
            _mark_failed(message_id, error="Source video not found.")
            return

        print(f'started processing chat video {message_id}..................')

        # Download / copy source
        with storage.open(msg.storage_path, 'rb') as f_in:
            with open(input_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)

        # Probe source to pick the right tier
        width, height, duration = probe_video(input_path)
        crf, maxrate, bufsize, abitrate = get_tier_for_height(height)
        print(f"Source: {width}x{height}, {duration:.1f}s -> crf={crf} maxrate={maxrate}")

        base_name = str(uuid.uuid4())
        output_video = os.path.join(tmp_dir, f"{base_name}.mp4")

        # Compress video
        target_height = min(720, height)
        cmd_video = [
            'ffmpeg', '-y',
            '-i', input_path,
            '-vf', f'scale=-2:{target_height}',
            '-c:v', 'libx264',
            '-crf', str(crf),
            '-preset', 'veryfast',
            '-maxrate', maxrate,
            '-bufsize', bufsize,
            '-profile:v', 'main',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', abitrate,
            '-movflags', '+faststart',
            output_video
        ]
        subprocess.run(cmd_video, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

        orig_size = os.path.getsize(input_path) / 1024 / 1024
        comp_size = os.path.getsize(output_video) / 1024 / 1024
        print(f"Original: {orig_size:.2f} MB -> Compressed: {comp_size:.2f} MB")

        if comp_size > orig_size and orig_size > 1:
            print("Compressed file larger than original, re-encoding at higher CRF...")
            cmd_retry = [
                'ffmpeg', '-y',
                '-i', input_path,
                '-vf', f'scale=-2:{target_height}',
                '-c:v', 'libx264',
                '-crf', str(crf + 6),
                '-preset', 'veryfast',
                '-maxrate', str(int(maxrate.rstrip('k')) // 2) + 'k',
                '-bufsize', bufsize,
                '-profile:v', 'main',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac',
                '-b:a', abitrate,
                '-movflags', '+faststart',
                output_video
            ]
            subprocess.run(cmd_retry, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            print(f"Re-encoded: {os.path.getsize(output_video) / 1024 / 1024:.2f} MB")

        final_comp_size = os.path.getsize(output_video) / 1024 / 1024
        if final_comp_size > 16:
            error_msg = f"Video is {final_comp_size:.1f}MB after compression, which exceeds WhatsApp's 16MB limit."
            print(error_msg)
            if msg.storage_path and storage.exists(msg.storage_path):
                storage.delete(msg.storage_path)
            _mark_failed(message_id, error=error_msg)
            return

        # Verify record still exists
        if not Message.objects.filter(id=message_id).exists():
            print("Message was deleted by user during processing. Canceling save.")
            return

        old_storage_path = msg.storage_path

        # Save compressed video to storage
        new_filename = f"{base_name}.mp4"
        dir_name = os.path.dirname(old_storage_path)
        new_storage_path = f"{dir_name}/{new_filename}" if dir_name else new_filename

        with open(output_video, 'rb') as vf:
            storage.save(new_storage_path, ContentFile(vf.read()))
            
        url = storage.url(new_storage_path)
        if url.startswith('http://') or url.startswith('https://'):
            file_url = url
        else:
            base_url = getattr(settings, 'BACKEND_PUBLIC_URL', '').rstrip('/')
            file_url = f"{base_url}{url}"

        # Update message with new storage path and url
        msg.storage_path = new_storage_path
        msg.media_url = file_url
        msg.save(update_fields=['storage_path', 'media_url'])

        # Now send to Meta
        conv = msg.conversation
        error_msg = None
        if conv.instance and conv.instance.is_active:
            try:
                reply_to_wa_id = msg.replied_to.wa_message_id if msg.replied_to else ""
                
                wa_response = send_whatsapp_message(
                    phone_number_id=conv.instance.phone_number_id,
                    access_token=conv.instance.access_token,
                    to_phone=conv.contact.wa_id,
                    message_text=msg.body,
                    msg_type=msg.msg_type,
                    media_url=file_url,
                    reply_to_wa_id=reply_to_wa_id,
                    filename=os.path.basename(new_storage_path),
                    storage_path=new_storage_path,
                )
                if 'messages' in wa_response and len(wa_response['messages']) > 0:
                    msg.wa_message_id = wa_response['messages'][0]['id']
                    msg.status = "sent"
                else:
                    msg.status = "failed"
                    error_msg = "Unknown error from Meta API."
            except Exception as e:
                logger.error(f"Failed to send compressed WhatsApp video: {e}")
                msg.status = "failed"
                error_msg = "WhatsApp API failed to process video."
        else:
            msg.status = "failed"
            error_msg = "WhatsApp instance not active."

        msg.save(update_fields=['wa_message_id', 'status'])
        
        # Delete old uncompressed file
        if old_storage_path and storage.exists(old_storage_path):
            storage.delete(old_storage_path)

        # Broadcast update
        from .utils import broadcast_message_update, broadcast_message_status_update
        if msg.status == 'sent':
            broadcast_message_update(conv, msg)
        else:
            broadcast_message_status_update(conv, msg.id, msg.status, error=error_msg)

        print(f'finished processing chat video {message_id}..................')

    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode('utf-8', errors='ignore') if e.stderr else str(e)
        print(f"ffmpeg failed for Message {message_id}: {stderr[-500:]}")
        _mark_failed(message_id, error="Video compression failed during encoding.")

    except Exception as e:
        print(f"Video processing failed for Message {message_id}: {e}")
        _mark_failed(message_id, error="Failed to process video.")

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

def _mark_failed(message_id, error=None):
    try:
        msg = Message.objects.get(id=message_id)
        msg.status = 'failed'
        msg.save(update_fields=['status'])
        if msg.conversation:
            from .utils import broadcast_message_status_update
            broadcast_message_status_update(msg.conversation, msg.id, 'failed', error=error)
    except Exception:
        pass



### this is automation
@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=15,
    name="messaging.process_inbound_message",
)
def process_inbound_message(self, conversation_id: int):
    """
    1. Checks Automation flows.
    2. If handled, stops.
    3. Otherwise, falls back to AI (honoring AI delays).
    """
    try:

        try:
            conv = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            logger.info(f"[Task] Conversation {conversation_id} no longer exists.")
            return

        dispatcher = ChatbotDispatcher(conv)
        ctx = dispatcher._build_context()
        if not ctx:
            return

        #  Evaluate Automation Engine
        auto_engine = AutomationEngine(conv)
        reply = auto_engine.generate_reply(ctx)
        if reply and not reply.is_empty:
            dispatcher._persist_and_broadcast(reply)
            logger.info(f"[Task] Conv {conversation_id}: Handled by AutomationEngine.")
            return  

        if FlowExecution.objects.filter(contact=conv.contact, status__in=[ExecutionStatus.RUNNING, ExecutionStatus.WAITING]).exists():
             logger.info(f"[Task] Conv {conversation_id}: Automation flow is active. Skipping AI fallback.")
             return

        #  Evaluate AI Engine fallback
        if not conv.ai_active:
            logger.info(f"[Task] Conv {conversation_id}: ai_active is False, skipping AI fallback.")
            return

        ai_settings = AIAgentSettings.objects.filter(is_active=True).first()
        if not ai_settings:
            logger.info(f"[Task] Conv {conversation_id}: No active AIAgentSettings, skipping AI fallback.")
            return

        if ai_settings.auto_reply_delay:
            time.sleep(ai_settings.auto_reply_delay)

            # Re-check after sleep — human agent might have taken over
            conv.refresh_from_db()
            if not conv.ai_active:
                logger.info(f"[Task] Conv {conversation_id}: ai_active toggled off during delay.")
                return

        # Dispatch AI
        sent = dispatcher.dispatch()
        logger.info(f"[Task] Conv {conversation_id}: AI dispatch sent={sent}")

    except Exception as exc:
        logger.exception(f"[Task] Unhandled error for conv {conversation_id}: {exc}")
        
        if self.request.retries >= self.max_retries:
            try:
                conv = Conversation.objects.filter(id=conversation_id).first()
                if conv:
                    
                    # Mark any running execution as FAILED so it doesn't get stuck
                    running_execution = FlowExecution.objects.filter(
                        contact=conv.contact, 
                        status__in=[ExecutionStatus.RUNNING, ExecutionStatus.WAITING]
                    ).first()
                    
                    if running_execution:
                        running_execution.status = ExecutionStatus.FAILED
                        running_execution.save(update_fields=['status'])
                        logger.info(f"[Task] Conv {conversation_id}: FlowExecution {running_execution.id} marked as FAILED after max retries.")
                    
                    # Send a fallback message to the user
                    from apps.messaging.utils import send_and_save_message
                    send_and_save_message(
                        conv,
                        body_text="We're sorry, but an unexpected error occurred while processing your request. Please try again later.",
                        msg_type="text"
                    )
            except Exception as inner_exc:
                logger.error(f"[Task] Failed to handle max retries fallback: {inner_exc}")

        raise self.retry(exc=exc)


# Share tasks  (one per conversation / one per media item — never blocking)
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=1,
    name="messaging.initial_share_task",
)
def initial_share_task(
    self,
    conversation_id: int,       # single conv — parallelism via group() in dispatch
    rooms: list,
    filters: dict,
    share_options: dict,
    use_interactive: bool = True,
    available_room_uuids: list = None,
    user_id: int = None,
):
    """
    Executes the initial share for ONE conversation.
    dispatch_initial_share_async() calls this via group() for true parallelism.
    """
    from django.contrib.auth import get_user_model
    from apps.messaging.models import Conversation, PropertyShareConfig
    from apps.messaging.share.session import execute_initial_share

    try:
        conv = Conversation.objects.select_related(
            "contact", "instance", "assigned_agent"
        ).filter(id=conversation_id).first()
        if not conv:
            logger.warning("[initial_share_task] Conv %s not found", conversation_id)
            return

        User = get_user_model()
        user = User.objects.filter(id=user_id).first() if user_id else None
        config = PropertyShareConfig.get_effective_config(user=user)

        execute_initial_share(
            conversation=conv,
            rooms=rooms,
            filters=filters,
            share_options=share_options,
            config=config,
            use_interactive=use_interactive,
            available_room_uuids=available_room_uuids,
            sent_by=user,
        )
    except Exception as err:
        logger.error("[initial_share_task] Error for conv %s: %s", conversation_id, err)
        raise self.retry(exc=err)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=5,
    name="messaging.send_media_item_task",
)
def send_media_item_task(
    self,
    conversation_id: int,
    raw_url: str,
    msg_type: str,
    room_uuid: str,
    is_initial: bool = False,
):
    """
    Sends a single image or video message.
    Scheduled with Celery countdown instead of time.sleep() — worker is free
    between items; delivery ordering is maintained via staggered countdowns.
    """
    from apps.messaging.models import Conversation
    from apps.messaging.utils import send_and_save_message, process_external_media_url

    try:
        conv = Conversation.objects.select_related("contact", "instance").get(
            id=conversation_id
        )
        phone = conv.contact.phone if conv.contact else ""
        proc_url, proc_path = process_external_media_url(raw_url, msg_type, phone=phone)

        raw_meta = {"original_url": raw_url}
        if is_initial:
            raw_meta["is_initial_share"] = True

        send_and_save_message(
            conv,
            msg_type=msg_type,
            media_url=proc_url,
            storage_path=proc_path,
            related_room_uuid=room_uuid,
            raw_data=raw_meta,
        )
        logger.info(
            "[send_media_item_task] Sent %s to conv %s room %s",
            msg_type, conversation_id, room_uuid,
        )
    except Conversation.DoesNotExist:
        logger.warning("[send_media_item_task] Conv %s not found", conversation_id)
    except Exception as exc:
        logger.error("[send_media_item_task] Failed %s for conv %s: %s", msg_type, conversation_id, exc)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=5,
    name="messaging.send_share_card_task",
)
def send_share_card_task(
    self,
    conversation_id: int,
    body_text: str,
    options: list,
    room_uuid: str,
    is_interactive: bool = True,
    is_initial: bool = False,
    session_time_str: str = None,
    sent_by_id: int = None,
):
    """
    Sends the interactive card (or plain text) for a room.
    Scheduled with countdown so it fires after all associated media tasks.
    """
    from apps.messaging.models import Conversation
    from apps.messaging.utils import send_and_save_interactive_buttons, send_and_save_message

    try:
        conv = Conversation.objects.select_related("contact", "instance").get(
            id=conversation_id
        )

        sent_by = None
        if sent_by_id:
            from django.contrib.auth import get_user_model
            sent_by = get_user_model().objects.filter(id=sent_by_id).first()

        raw_meta = {"room_uuid": room_uuid}
        if is_initial:
            raw_meta["is_initial_share"] = True
        if session_time_str:
            raw_meta["share_session_time"] = session_time_str

        safe_body = body_text.strip()[:1024] or "Room details"

        if is_interactive and options:
            send_and_save_interactive_buttons(
                conv,
                body_text=safe_body,
                options=options,
                sent_by=sent_by,
                related_room_uuid=room_uuid,
            )
        else:
            send_and_save_message(
                conv,
                msg_type="text",
                body=safe_body,
                sent_by=sent_by,
                related_room_uuid=room_uuid,
                raw_data=raw_meta,
            )

        logger.info(
            "[send_share_card_task] Card sent to conv %s room %s",
            conversation_id, room_uuid,
        )
    except Conversation.DoesNotExist:
        logger.warning("[send_share_card_task] Conv %s not found", conversation_id)
    except Exception as exc:
        logger.error("[send_share_card_task] Failed for conv %s: %s", conversation_id, exc)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=1,
    name="messaging.share_button_reply_task",
)
def share_button_reply_task(self, conversation_id: int, button_id: str, button_title: str = ""):
    """
    Handle a WhatsApp interactive button click from the share flow.
    Media scheduling is done via countdown inside the handler — no sleep here.
    """
    from apps.messaging.models import Conversation
    from apps.messaging.share.handlers import handle_share_button_reply

    try:
        conv = Conversation.objects.select_related(
            "contact", "instance", "assigned_agent"
        ).filter(id=conversation_id).first()
        if conv:
            handle_share_button_reply(conv, button_id, button_title)
    except Exception as exc:
        logger.error(
            "[share_button_reply_task] Error handling button %s for conv %s: %s",
            button_id, conversation_id, exc,
        )
        raise self.retry(exc=exc)

