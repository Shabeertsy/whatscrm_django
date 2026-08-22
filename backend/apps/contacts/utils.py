import csv
import io
from .models import Contact
from .serializers import ContactSerializer
from apps.core.scoping import scope_by_owner, get_tenant_owner



def process_csv_import(csv_file, user):
    """
    Processes a CSV file for importing contacts.
    Returns a tuple (success, data_or_error_message, status_code).
    """
    try:
        content = csv_file.read().decode('utf-8-sig')  # utf-8-sig handles BOM
    except UnicodeDecodeError:
        try:
            csv_file.seek(0)
            content = csv_file.read().decode('latin-1')
        except Exception:
            return False, 'Could not decode file. Please use UTF-8 encoding.', 400

    reader = csv.DictReader(io.StringIO(content))

    # Normalize header names (strip whitespace, lowercase)
    if reader.fieldnames is None:
        return False, 'CSV file is empty or has no headers.', 400

    fieldnames_lower = {f.strip().lower(): f for f in reader.fieldnames}

    # Require at least 'name' and 'phone' columns
    name_col = fieldnames_lower.get('name')
    phone_col = fieldnames_lower.get('phone')

    if not name_col or not phone_col:
        return False, 'CSV must contain "name" and "phone" columns.', 400

    email_col = fieldnames_lower.get('email')
    owner = get_tenant_owner(user)

    imported = []
    skipped = []
    errors = []

    for i, row in enumerate(reader, start=2): 
        name = (row.get(name_col) or '').strip()
        phone = (row.get(phone_col) or '').strip()
        email = (row.get(email_col) or '').strip() if email_col else ''

        if not phone:
            errors.append({'row': i, 'reason': 'Missing phone number'})
            continue

        if not name:
            name = phone  

        # Skip if a contact with same phone already exists for this owner
        existing_qs = scope_by_owner(Contact.objects.all(), user)
        if existing_qs.filter(phone=phone).exists():
            skipped.append({'row': i, 'phone': phone, 'reason': 'Already exists'})
            continue

        crm = Contact.objects.create(
            owner=owner,
            name=name,
            phone=phone,
            email=email,
            status='Active',
            source='csv',
        )
        imported.append(ContactSerializer(crm).data)

    return True, {
        'imported': imported,
        'imported_count': len(imported),
        'skipped_count': len(skipped),
        'error_count': len(errors),
        'errors': errors,
    }, 201
