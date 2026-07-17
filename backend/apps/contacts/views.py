from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.db import transaction

from .models import Contact, ContactTag, Pipeline, PipelineStage, PipelineDeal
from .serializers import (
    ContactSerializer, ContactTagSerializer,
    PipelineSerializer, PipelineStageSerializer, PipelineDealSerializer
)

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


# ─── Contact APIs ─────────────────────────────────────────────────────────────

class ContactListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Contact.objects.filter(owner=request.user)
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(email__icontains=search)
            )
        tag_id = request.query_params.get('tag', '').strip()
        if tag_id:
            qs = qs.filter(tags__id=tag_id)
            
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


# ─── WhatsApp Import APIs ─────────────────────────────────────────────────────

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

            if wa_contact.crm_contact_id:
                skipped.append(wa_id)
                continue

            if Contact.objects.filter(owner=request.user, wa_id=wa_id).exists():
                skipped.append(wa_id)
                continue

            crm = Contact.objects.create(
                owner=request.user,
                name=wa_contact.name or wa_contact.phone,
                phone=wa_contact.phone,
                wa_id=wa_id,
                status='Active',
            )
            wa_contact.crm_contact = crm
            wa_contact.is_saved = True
            wa_contact.save(update_fields=['crm_contact', 'is_saved'])

            imported.append(ContactSerializer(crm).data)

        return Response({
            'imported': imported,
            'imported_count': len(imported),
            'skipped_count': len(skipped),
        }, status=status.HTTP_201_CREATED)


# ─── Pipeline CRUD ────────────────────────────────────────────────────────────

class PipelineListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pipelines = Pipeline.objects.filter(owner=request.user)
        # Auto-create a default pipeline if user has none
        if not pipelines.exists():
            with transaction.atomic():
                default_pipeline = Pipeline.objects.create(
                    name='Default Pipeline',
                    description='Your main sales pipeline',
                    is_active=True,
                    owner=request.user,
                )
                PipelineStage.objects.create(
                    pipeline=default_pipeline,
                    title='Incoming Leads',
                    order=1,
                    owner=request.user,
                )
                pipelines = Pipeline.objects.filter(owner=request.user)
        return Response(PipelineSerializer(pipelines, many=True).data)

    def post(self, request):
        serializer = PipelineSerializer(data=request.data)
        if serializer.is_valid():
            pipeline = serializer.save(owner=request.user)
            # If this is the first pipeline, activate it automatically
            if Pipeline.objects.filter(owner=request.user).count() == 1:
                pipeline.is_active = True
                pipeline.save(update_fields=['is_active'])
            # Auto-create the default "Incoming Leads" stage
            PipelineStage.objects.create(
                pipeline=pipeline,
                title='Incoming Leads',
                order=1,
                owner=request.user,
            )
            return Response(PipelineSerializer(pipeline).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PipelineDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Pipeline.objects.get(pk=pk, owner=user)
        except Pipeline.DoesNotExist:
            return None

    def get(self, request, pk):
        pipeline = self.get_object(pk, request.user)
        if not pipeline:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PipelineSerializer(pipeline).data)

    def patch(self, request, pk):
        pipeline = self.get_object(pk, request.user)
        if not pipeline:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        # Prevent auto_create_deals on non-active pipelines
        data = request.data.copy()
        if data.get('auto_create_deals') and not pipeline.is_active:
            return Response(
                {'detail': 'auto_create_deals can only be enabled on the active pipeline. Activate it first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = PipelineSerializer(pipeline, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        pipeline = self.get_object(pk, request.user)
        if not pipeline:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if pipeline.is_active:
            return Response(
                {'detail': 'Cannot delete the active pipeline. Activate another pipeline first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        pipeline.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PipelineActivateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            pipeline = Pipeline.objects.get(pk=pk, owner=request.user)
        except Pipeline.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Deactivate all others (also clear auto_create_deals on deactivated pipelines)
            Pipeline.objects.filter(owner=request.user, is_active=True).update(
                is_active=False, auto_create_deals=False
            )
            pipeline.is_active = True
            pipeline.save(update_fields=['is_active'])

        return Response(PipelineSerializer(pipeline).data)


# ─── Stage APIs (scoped to pipeline) ─────────────────────────────────────────

class PipelineStageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_pipeline(self, pipeline_id, user):
        try:
            return Pipeline.objects.get(pk=pipeline_id, owner=user)
        except Pipeline.DoesNotExist:
            return None

    def get(self, request):
        pipeline_id = request.query_params.get('pipeline')
        if pipeline_id:
            pipeline = self._get_pipeline(pipeline_id, request.user)
            if not pipeline:
                return Response({'detail': 'Pipeline not found.'}, status=status.HTTP_404_NOT_FOUND)
            stages = PipelineStage.objects.filter(pipeline=pipeline, owner=request.user)
        else:
            # Fallback: return stages of active pipeline
            pipeline = Pipeline.objects.filter(owner=request.user, is_active=True).first()
            if not pipeline:
                return Response([], status=status.HTTP_200_OK)
            stages = PipelineStage.objects.filter(pipeline=pipeline, owner=request.user)

        return Response(PipelineStageSerializer(stages, many=True).data)

    def post(self, request):
        pipeline_id = request.data.get('pipeline')
        if not pipeline_id:
            return Response({'detail': 'pipeline field is required.'}, status=status.HTTP_400_BAD_REQUEST)
        pipeline = self._get_pipeline(pipeline_id, request.user)
        if not pipeline:
            return Response({'detail': 'Pipeline not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PipelineStageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(pipeline=pipeline, owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PipelineStageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return PipelineStage.objects.get(pk=pk, owner=user)
        except PipelineStage.DoesNotExist:
            return None

    def patch(self, request, pk):
        stage = self.get_object(pk, request.user)
        if not stage:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PipelineStageSerializer(stage, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        stage = self.get_object(pk, request.user)
        if not stage:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        stage.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Deal APIs (scoped to pipeline) ──────────────────────────────────────────

class PipelineDealListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_pipeline(self, pipeline_id, user):
        try:
            return Pipeline.objects.get(pk=pipeline_id, owner=user)
        except Pipeline.DoesNotExist:
            return None

    def get(self, request):
        pipeline_id = request.query_params.get('pipeline')
        if pipeline_id:
            pipeline = self._get_pipeline(pipeline_id, request.user)
            if not pipeline:
                return Response({'detail': 'Pipeline not found.'}, status=status.HTTP_404_NOT_FOUND)
            deals = PipelineDeal.objects.filter(pipeline=pipeline, owner=request.user)
        else:
            pipeline = Pipeline.objects.filter(owner=request.user, is_active=True).first()
            if not pipeline:
                return Response([], status=status.HTTP_200_OK)
            deals = PipelineDeal.objects.filter(pipeline=pipeline, owner=request.user)
        return Response(PipelineDealSerializer(deals, many=True).data)

    def post(self, request):
        data = request.data.copy()
        pipeline_id = data.get('pipeline')

        # Determine pipeline
        if pipeline_id:
            pipeline = self._get_pipeline(pipeline_id, request.user)
            if not pipeline:
                return Response({'detail': 'Pipeline not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            pipeline = Pipeline.objects.filter(owner=request.user, is_active=True).first()
            if not pipeline:
                return Response({'detail': 'No active pipeline found.'}, status=status.HTTP_400_BAD_REQUEST)

        data['pipeline'] = str(pipeline.id)

        # Default to first stage of the pipeline if not provided
        if not data.get('stage'):
            stage = pipeline.stages.order_by('order').first()
            if not stage:
                stage = PipelineStage.objects.create(
                    pipeline=pipeline, title='Incoming Leads', order=1, owner=request.user
                )
            data['stage'] = str(stage.id)

        serializer = PipelineDealSerializer(data=data)
        if serializer.is_valid():
            serializer.save(owner=request.user, pipeline=pipeline)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PipelineDealDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return PipelineDeal.objects.get(pk=pk, owner=user)
        except PipelineDeal.DoesNotExist:
            return None

    def patch(self, request, pk):
        deal = self.get_object(pk, request.user)
        if not deal:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PipelineDealSerializer(deal, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        deal = self.get_object(pk, request.user)
        if not deal:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        deal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
