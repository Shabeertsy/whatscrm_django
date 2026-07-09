from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import Contact, ContactTag
from .serializers import ContactSerializer, ContactTagSerializer



from rest_framework.pagination import PageNumberPagination


class ContactPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100



#  Tag APIs 
class ContactTagListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tags = ContactTag.objects.filter(owner=request.user)
        return Response(ContactTagSerializer(tags, many=True).data)

    def post(self, request):
        serializer = ContactTagSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContactTagDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return ContactTag.objects.get(pk=pk, owner=user)
        except ContactTag.DoesNotExist:
            return None

    def put(self, request, pk):
        tag = self.get_object(pk, request.user)
        if not tag:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ContactTagSerializer(tag, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        tag = self.get_object(pk, request.user)
        if not tag:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        tag.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContactListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Contact.objects.filter(owner=request.user)

        # Search
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(email__icontains=search)
            )

        # Filter by tag
        tag_id = request.query_params.get('tag', '').strip()
        if tag_id:
            qs = qs.filter(tags__id=tag_id)

        # Filter by status
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            qs = qs.filter(status=status_filter)

        paginator = ContactPagination()
        paginated_qs = paginator.paginate_queryset(qs, request, view=self)
        serializer = ContactSerializer(paginated_qs, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContactDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Contact.objects.get(pk=pk, owner=user)
        except Contact.DoesNotExist:
            return None

    def get(self, request, pk):
        contact = self.get_object(pk, request.user)
        if not contact:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ContactSerializer(contact).data)

    def put(self, request, pk):
        contact = self.get_object(pk, request.user)
        if not contact:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ContactSerializer(contact, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        contact = self.get_object(pk, request.user)
        if not contact:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        contact.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


#  WhatsApp Import APIs 
class WAContactsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.messaging.models import Contact as WAContact
        # Get already-imported wa_ids for this user
        imported_wa_ids = set(
            Contact.objects.filter(owner=request.user)
            .exclude(wa_id='')
            .values_list('wa_id', flat=True)
        )
        # Return WA contacts not yet in CRM (no crm_contact link)
        wa_contacts = WAContact.objects.filter(crm_contact__isnull=True).exclude(wa_id__in=imported_wa_ids)
        data = [
            {
                'wa_id': c.wa_id,
                'name': c.name,
                'phone': c.phone,
                'profile_pic_url': c.profile_pic_url,
                'source': c.source,
                'created_at': c.created_at,
            }
            for c in wa_contacts
        ]
        return Response(data)


class WAContactsImportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.messaging.models import Contact as WAContact
        wa_ids = request.data.get('wa_ids', [])
        if not wa_ids:
            return Response({'detail': 'No wa_ids provided.'}, status=status.HTTP_400_BAD_REQUEST)

        imported = []
        skipped = []

        for wa_id in wa_ids:
            try:
                wa_contact = WAContact.objects.get(wa_id=wa_id)
            except WAContact.DoesNotExist:
                skipped.append(wa_id)
                continue

            # Skip if already linked
            if wa_contact.crm_contact_id:
                skipped.append(wa_id)
                continue

            # Skip if already imported by this user
            if Contact.objects.filter(owner=request.user, wa_id=wa_id).exists():
                skipped.append(wa_id)
                continue

            # Create CRM contact
            crm = Contact.objects.create(
                owner=request.user,
                name=wa_contact.name or wa_contact.phone,
                phone=wa_contact.phone,
                wa_id=wa_id,
                status='Active',
            )
            # Link back to WA contact
            wa_contact.crm_contact = crm
            wa_contact.is_saved = True
            wa_contact.save(update_fields=['crm_contact', 'is_saved'])

            imported.append(ContactSerializer(crm).data)

        return Response({
            'imported': imported,
            'imported_count': len(imported),
            'skipped_count': len(skipped),
        }, status=status.HTTP_201_CREATED)
