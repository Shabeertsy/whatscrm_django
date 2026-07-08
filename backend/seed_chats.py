import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from apps.messaging.models import Contact, Conversation, Message
from apps.whatsapp.models import WhatsappInstance

User = get_user_model()

def seed_data():
    # 1. Get or create a superuser for assigning agents
    admin = User.objects.filter(is_superuser=True).first()
    if not admin:
        admin = User.objects.create_superuser('admin@whatsacrm.local', 'admin', 'password123')

    # 2. Get or create a WhatsApp Instance
    instance, _ = WhatsappInstance.objects.get_or_create(
        phone_number_id="1234567890",
        defaults={
            "user": admin,
            "display_name": "Main Sales Line",
            "whatsapp_business_account_id": "WABA123",
            "access_token": "mock_token"
        }
    )

    # 3. Create a saved Contact
    contact1, _ = Contact.objects.get_or_create(
        wa_id="919876543210",
        defaults={
            "phone": "+91 98765 43210",
            "name": "Sarah Jenkins",
            "is_saved": True,
            "source": "manual",
            "tags": ["vip", "hotel-guest"]
        }
    )

    # 4. Create an unsaved Contact (ghost contact from inbound message)
    contact2, _ = Contact.objects.get_or_create(
        wa_id="447911123456",
        defaults={
            "phone": "+44 7911 123456",
            "name": "Alex", # From WhatsApp profile name
            "is_saved": False,
            "source": "inbound",
        }
    )

    now = timezone.now()

    # 5. Create Conversation 1
    conv1, _ = Conversation.objects.get_or_create(
        contact=contact1,
        instance=instance,
        defaults={
            "assigned_agent": admin,
            "status": "open",
            "unread_count": 0,
            "last_message_at": now
        }
    )

    if conv1.messages.count() == 0:
        Message.objects.create(
            conversation=conv1,
            direction="inbound",
            msg_type="text",
            body="Hello! I'd like to book a room for this weekend.",
            status="read",
            timestamp=now - timedelta(minutes=15)
        )
        Message.objects.create(
            conversation=conv1,
            direction="outbound",
            msg_type="text",
            body="Hi Sarah! I'd be happy to help. What dates are you looking at?",
            sent_by=admin,
            status="delivered",
            timestamp=now - timedelta(minutes=14)
        )
        Message.objects.create(
            conversation=conv1,
            direction="inbound",
            msg_type="text",
            body="Friday to Sunday.",
            status="read",
            timestamp=now - timedelta(minutes=5)
        )

    # 6. Create Conversation 2 (Unread)
    conv2, _ = Conversation.objects.get_or_create(
        contact=contact2,
        instance=instance,
        defaults={
            "status": "open",
            "unread_count": 2,
            "last_message_at": now
        }
    )

    if conv2.messages.count() == 0:
        Message.objects.create(
            conversation=conv2,
            direction="outbound",
            msg_type="template",
            body="Your booking is confirmed. Reply YES to accept.",
            status="read",
            timestamp=now - timedelta(days=1)
        )
        Message.objects.create(
            conversation=conv2,
            direction="inbound",
            msg_type="text",
            body="YES",
            status="delivered",
            timestamp=now - timedelta(minutes=2)
        )
        Message.objects.create(
            conversation=conv2,
            direction="inbound",
            msg_type="text",
            body="Can I get early check-in?",
            status="delivered",
            timestamp=now
        )
    
    print("✅ Mock chat data seeded successfully!")

if __name__ == "__main__":
    seed_data()
