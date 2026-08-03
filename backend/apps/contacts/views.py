from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import RequirePermission, Permission
from apps.core.scoping import scope_by_owner, scope_by_location, is_superuser, get_tenant_owner

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
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_CONTACTS

    def get(self, request):
        tags = scope_by_owner(ContactTag.objects.all(), request.user)
        return Response(ContactTagSerializer(tags, many=True).data)

    def post(self, request):
        serializer = ContactTagSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(owner=get_tenant_owner(request.user))
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContactTagDetailView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_CONTACTS

    def get_object(self, pk, user):
        try:
            return scope_by_owner(ContactTag.objects.all(), user).get(pk=pk)
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
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_CONTACTS

    def get(self, request):
        qs = Contact.objects.all()
        qs = scope_by_owner(qs, request.user)
        qs = scope_by_location(qs, request.user)
        
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
            serializer.save(owner=get_tenant_owner(request.user))
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContactDetailView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_CONTACTS

    def get_object(self, pk, user):
        try:
            return scope_by_owner(Contact.objects.all(), user).get(pk=pk)
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
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_CONTACTS

    def get(self, request):
        from apps.messaging.models import Contact as WAContact
        # Get already-imported wa_ids for this user
        imported_wa_ids = set(
            scope_by_owner(Contact.objects.all(), request.user)
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
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_CONTACTS

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

            if scope_by_owner(Contact.objects.all(), request.user).filter(wa_id=wa_id).exists():
                skipped.append(wa_id)
                continue

            crm = Contact.objects.create(
                owner=get_tenant_owner(request.user),
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
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def get(self, request):
        pipelines = scope_by_owner(Pipeline.objects.all(), request.user)
        # Auto-create a default pipeline if user has none
        if not pipelines.exists():
            with transaction.atomic():
                default_pipeline = Pipeline.objects.create(
                    name='Default Pipeline',
                    description='Your main sales pipeline',
                    is_active=True,
                    owner=get_tenant_owner(request.user),
                )
                PipelineStage.objects.create(
                    pipeline=default_pipeline,
                    title='Incoming Leads',
                    order=1,
                    owner=get_tenant_owner(request.user),
                )
                pipelines = scope_by_owner(Pipeline.objects.all(), request.user)
        return Response(PipelineSerializer(pipelines, many=True).data)

    def post(self, request):
        serializer = PipelineSerializer(data=request.data)
        if serializer.is_valid():
            pipeline = serializer.save(owner=get_tenant_owner(request.user))
            # If this is the first pipeline, activate it automatically
            if Pipeline.objects.filter(owner=get_tenant_owner(request.user)).count() == 1:
                pipeline.is_active = True
                pipeline.save(update_fields=['is_active'])
            # Auto-create the default "Incoming Leads" stage
            PipelineStage.objects.create(
                pipeline=pipeline,
                title='Incoming Leads',
                order=1,
                owner=get_tenant_owner(request.user),
            )
            return Response(PipelineSerializer(pipeline).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PipelineDetailView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def get_object(self, pk, user):
        try:
            return scope_by_owner(Pipeline.objects.all(), user).get(pk=pk)
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
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def post(self, request, pk):
        try:
            pipeline = scope_by_owner(Pipeline.objects.all(), request.user).get(pk=pk)
        except Pipeline.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Deactivate all others (also clear auto_create_deals on deactivated pipelines)
            Pipeline.objects.filter(owner=get_tenant_owner(request.user), is_active=True).update(
                is_active=False, auto_create_deals=False
            )
            pipeline.is_active = True
            pipeline.save(update_fields=['is_active'])

        return Response(PipelineSerializer(pipeline).data)


# ─── Stage APIs (scoped to pipeline) ─────────────────────────────────────────

class PipelineStageListCreateView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def _get_pipeline(self, pipeline_id, user):
        try:
            return scope_by_owner(Pipeline.objects.all(), user).get(pk=pipeline_id)
        except Pipeline.DoesNotExist:
            return None

    def get(self, request):
        pipeline_id = request.query_params.get('pipeline')
        if pipeline_id:
            pipeline = self._get_pipeline(pipeline_id, request.user)
            if not pipeline:
                return Response({'detail': 'Pipeline not found.'}, status=status.HTTP_404_NOT_FOUND)
            stages = scope_by_owner(PipelineStage.objects.filter(pipeline=pipeline), request.user)
        else:
            # Fallback: return stages of active pipeline
            pipeline = scope_by_owner(Pipeline.objects.filter(is_active=True), request.user).first()
            if not pipeline:
                return Response([], status=status.HTTP_200_OK)
            stages = scope_by_owner(PipelineStage.objects.filter(pipeline=pipeline), request.user)
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
            serializer.save(pipeline=pipeline, owner=get_tenant_owner(request.user))
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PipelineStageDetailView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def get_object(self, pk, user):
        try:
            return scope_by_owner(PipelineStage.objects.all(), user).get(pk=pk)
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

        pipeline = stage.pipeline
        stage.delete()

        # Re-normalize orders of remaining stages: 1, 2, 3, ...
        remaining = list(
            scope_by_owner(PipelineStage.objects.filter(pipeline=pipeline), request.user).order_by('order')
        )
        for i, s in enumerate(remaining):
            new_order = i + 1
            if s.order != new_order:
                s.order = new_order
                s.save(update_fields=['order'])

        serializer = PipelineStageSerializer(remaining, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


#  Stage Swap 
class PipelineStageSwapView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def post(self, request):
        stage_a_id = request.data.get('stage_a')
        stage_b_id = request.data.get('stage_b')
        if not stage_a_id or not stage_b_id:
            return Response(
                {'detail': 'Both stage_a and stage_b are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            stage_a = scope_by_owner(PipelineStage.objects.all(), request.user).get(pk=stage_a_id)
            stage_b = scope_by_owner(PipelineStage.objects.all(), request.user).get(pk=stage_b_id)
        except PipelineStage.DoesNotExist:
            return Response({'detail': 'One or both stages not found.'}, status=status.HTTP_404_NOT_FOUND)

        if stage_a.pipeline_id != stage_b.pipeline_id:
            return Response(
                {'detail': 'Stages must belong to the same pipeline.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Atomic swap using a temp value to avoid unique-constraint conflicts
        with transaction.atomic():
            order_a, order_b = stage_a.order, stage_b.order
            stage_a.order = order_b
            stage_b.order = order_a
            stage_a.save(update_fields=['order'])
            stage_b.save(update_fields=['order'])

        return Response({
            'stage_a': PipelineStageSerializer(stage_a).data,
            'stage_b': PipelineStageSerializer(stage_b).data,
        }, status=status.HTTP_200_OK)


# ─── Deal APIs (scoped to pipeline) ──────────────────────────────────────────

class PipelineDealListCreateView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def _get_pipeline(self, pipeline_id, user):
        try:
            return scope_by_owner(Pipeline.objects.all(), user).get(pk=pipeline_id)
        except Pipeline.DoesNotExist:
            return None

    def get(self, request):
        pipeline_id = request.query_params.get('pipeline')
        if pipeline_id:
            pipeline = self._get_pipeline(pipeline_id, request.user)
            if not pipeline:
                return Response({'detail': 'Pipeline not found.'}, status=status.HTTP_404_NOT_FOUND)
            deals = scope_by_owner(PipelineDeal.objects.filter(pipeline=pipeline), request.user)
        else:
            pipeline = scope_by_owner(Pipeline.objects.filter(is_active=True), request.user).first()
            if not pipeline:
                return Response([], status=status.HTTP_200_OK)
            deals = scope_by_owner(PipelineDeal.objects.filter(pipeline=pipeline), request.user)

        deals = scope_by_location(deals, request.user, location_field='wa_contact__location')

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
            pipeline = scope_by_owner(Pipeline.objects.filter(is_active=True), request.user).first()
            if not pipeline:
                return Response({'detail': 'No active pipeline found.'}, status=status.HTTP_400_BAD_REQUEST)

        data['pipeline'] = str(pipeline.id)

        # Default to first stage of the pipeline if not provided
        if not data.get('stage'):
            stage = pipeline.stages.order_by('order').first()
            if not stage:
                stage = PipelineStage.objects.create(
                    pipeline=pipeline, title='Incoming Leads', order=1, owner=get_tenant_owner(request.user)
                )
            data['stage'] = str(stage.id)

        serializer = PipelineDealSerializer(data=data)
        if serializer.is_valid():
            serializer.save(owner=get_tenant_owner(request.user), pipeline=pipeline)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PipelineDealDetailView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def get_object(self, pk, user):
        try:
            return scope_by_owner(PipelineDeal.objects.all(), user).get(pk=pk)
        except PipelineDeal.DoesNotExist:
            return None

    def get(self, request, pk):
        deal = self.get_object(pk, request.user)
        if not deal:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PipelineDealSerializer(deal)
        return Response(serializer.data)

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
