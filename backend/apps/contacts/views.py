from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
import csv
import io

from django.core.cache import cache
from apps.core.permissions import RequirePermission, Permission
from .utils import (
    get_pipeline_cache_version,
    increment_pipeline_cache_version,
    sync_deal_confirmation,
    is_stage_confirmed_or_after,
    process_csv_import,
)


from apps.core.scoping import (
    scope_by_owner, 
    scope_by_location, 
    is_superuser, 
    get_tenant_owner
    )

from .models import (
    Contact, 
    ContactTag, 
    Pipeline, 
    PipelineStage, 
    PipelineDeal,
    ConfirmedBooking
    )

from .serializers import (
    ContactSerializer, ContactTagSerializer,
    PipelineSerializer, PipelineStageSerializer, PipelineDealSerializer,
    ConfirmedBookingSerializer
)


from django.db.models import Q, Sum
from django.db import transaction
from django.utils import timezone
from datetime import timedelta


class StandardPagination(PageNumberPagination):
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

        source_filter = request.query_params.get('source', '').strip()
        if source_filter:
            qs = qs.filter(source=source_filter)

        paginator = StandardPagination()
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
        imported_wa_ids = set(
            scope_by_owner(Contact.objects.all(), request.user)
            .exclude(wa_id='')
            .values_list('wa_id', flat=True)
        )
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
                source='whatsapp',
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


class CSVImportView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_CONTACTS

    def post(self, request):
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.lower().endswith('.csv'):
            return Response({'detail': 'Only CSV files are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        success, result, status_code = process_csv_import(csv_file, request.user)
        
        if not success:
            return Response({'detail': result}, status=status_code)
            
        return Response(result, status=status_code)


# ─── Pipeline CRUD ─────────────────
class PipelineListCreateView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def get(self, request):
        owner_id = get_tenant_owner(request.user).id
        cache_version = get_pipeline_cache_version(owner_id)
        cache_key = f"pipeline_list_{request.user.id}_{cache_version}"
        
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

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
        
        data = PipelineSerializer(pipelines, many=True).data
        cache.set(cache_key, data, timeout=3600)
        return Response(data)

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
            from .utils import increment_pipeline_cache_version
            increment_pipeline_cache_version(get_tenant_owner(request.user).id)
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
            from .utils import increment_pipeline_cache_version
            increment_pipeline_cache_version(get_tenant_owner(request.user).id)
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
            Pipeline.objects.filter(owner=get_tenant_owner(request.user), is_active=True).update(
                is_active=False, auto_create_deals=False
            )
            pipeline.is_active = True
            pipeline.save(update_fields=['is_active'])

        return Response(PipelineSerializer(pipeline).data)


# ─── Stage APIs (scoped to pipeline) ──────

class PipelineStageListCreateView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def _get_pipeline(self, pipeline_id, user):
        try:
            return scope_by_owner(Pipeline.objects.all(), user).get(pk=pipeline_id)
        except Pipeline.DoesNotExist:
            return None

    def get(self, request):
        pipeline_id_param = request.query_params.get('pipeline')
        
        owner_id = get_tenant_owner(request.user).id
        cache_version = get_pipeline_cache_version(owner_id)
        cache_key = f"pipeline_stages_{request.user.id}_{pipeline_id_param or 'default'}_{cache_version}"

        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        if pipeline_id_param:
            pipeline = self._get_pipeline(pipeline_id_param, request.user)
            if not pipeline:
                return Response({'detail': 'Pipeline not found.'}, status=status.HTTP_404_NOT_FOUND)
            stages = scope_by_owner(PipelineStage.objects.filter(pipeline=pipeline), request.user)
        else:
            # Fallback: return stages of active pipeline
            pipeline = scope_by_owner(Pipeline.objects.filter(is_active=True), request.user).first()
            if not pipeline:
                return Response([], status=status.HTTP_200_OK)
            stages = scope_by_owner(PipelineStage.objects.filter(pipeline=pipeline), request.user)
            
        data = PipelineStageSerializer(stages, many=True).data
        cache.set(cache_key, data, timeout=3600)
        return Response(data)

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
        old_is_confirmed = stage.is_confirmed
        serializer = PipelineStageSerializer(stage, data=request.data, partial=True)
        if serializer.is_valid():
            updated_stage = serializer.save()
            if 'is_confirmed' in request.data and old_is_confirmed != updated_stage.is_confirmed:
                owner = get_tenant_owner(request.user)
                pipeline = updated_stage.pipeline
                if pipeline:
                    deals = PipelineDeal.objects.filter(
                        stage__pipeline=pipeline,
                        owner=owner
                    ).select_related('stage', 'wa_contact', 'wa_contact__crm_contact', 'stage__pipeline')
                    for d in deals:
                        sync_deal_confirmation(d, target_stage=d.stage, owner=owner)
                else:
                    deals = PipelineDeal.objects.filter(stage=updated_stage, owner=owner).select_related('stage', 'wa_contact', 'wa_contact__crm_contact')
                    for d in deals:
                        sync_deal_confirmation(d, target_stage=d.stage, owner=owner)
                increment_pipeline_cache_version(owner.id)

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

        owner = get_tenant_owner(request.user)
        if pipeline:
            deals = PipelineDeal.objects.filter(
                stage__pipeline=pipeline,
                owner=owner
            ).select_related('stage', 'wa_contact', 'wa_contact__crm_contact', 'stage__pipeline')
            for d in deals:
                sync_deal_confirmation(d, target_stage=d.stage, owner=owner)
        increment_pipeline_cache_version(owner.id)

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

        owner = get_tenant_owner(request.user)
        if stage_a.pipeline:
            deals = PipelineDeal.objects.filter(
                stage__pipeline=stage_a.pipeline,
                owner=owner
            ).select_related('stage', 'wa_contact', 'wa_contact__crm_contact', 'stage__pipeline')
            for d in deals:
                sync_deal_confirmation(d, target_stage=d.stage, owner=owner)
        increment_pipeline_cache_version(owner.id)

        return Response({
            'stage_a': PipelineStageSerializer(stage_a).data,
            'stage_b': PipelineStageSerializer(stage_b).data,
        }, status=status.HTTP_200_OK)



# Deal APIs (scoped to pipeline)
class PipelineDealListCreateView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def _get_pipeline(self, pipeline_id, user):
        try:
            return scope_by_owner(Pipeline.objects.all(), user).get(pk=pipeline_id)
        except Exception:
            return None

    def get(self, request):
        pipeline_id_param = request.query_params.get('pipeline')
        timeframe_param = request.query_params.get('timeframe')
        stage_id_param = request.query_params.get('stage')
        search_param = request.query_params.get('search', '').strip()
        is_paginated = request.query_params.get('paginate') == 'true' or 'page' in request.query_params

        # If not paginated and no search/stage filter, we can use the existing pipeline deals cache
        if not is_paginated and not search_param and not stage_id_param:
            owner_id = get_tenant_owner(request.user).id
            cache_version = get_pipeline_cache_version(owner_id)
            cache_key = f"pipeline_deals_{request.user.id}_{pipeline_id_param or 'default'}_{timeframe_param or 'all'}_{cache_version}"

            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)

        if pipeline_id_param:
            pipeline = self._get_pipeline(pipeline_id_param, request.user)
            if not pipeline:
                return Response({'detail': 'Pipeline not found.'}, status=status.HTTP_404_NOT_FOUND)
            deals = scope_by_owner(PipelineDeal.objects.select_related('wa_contact', 'wa_contact__crm_contact').prefetch_related('confirmed_booking_records').filter(pipeline=pipeline), request.user)
        else:
            pipeline = scope_by_owner(Pipeline.objects.filter(is_active=True), request.user).first()
            if not pipeline:
                if is_paginated:
                    return Response({
                        'count': 0,
                        'total_pages': 1,
                        'current_page': 1,
                        'page_size': 10,
                        'next': None,
                        'previous': None,
                        'results': [],
                        'total_value': 0,
                        'confirmed_count': 0,
                    }, status=status.HTTP_200_OK)
                return Response([], status=status.HTTP_200_OK)
            deals = scope_by_owner(PipelineDeal.objects.select_related('wa_contact', 'wa_contact__crm_contact').prefetch_related('confirmed_booking_records').filter(pipeline=pipeline), request.user)

        # Stage filter
        if stage_id_param and stage_id_param != 'all':
            deals = deals.filter(stage_id=stage_id_param)

        # Search filter
        if search_param:
            deals = deals.filter(
                Q(name__icontains=search_param) |
                Q(manual_contact__icontains=search_param) |
                Q(wa_contact__name__icontains=search_param) |
                Q(wa_contact__phone__icontains=search_param) |
                Q(wa_contact__crm_contact__name__icontains=search_param) |
                Q(wa_contact__crm_contact__phone__icontains=search_param) |
                Q(note__icontains=search_param)
            )

        # Timeframe filter
        if timeframe_param and timeframe_param != 'all':
            now = timezone.now()
            if timeframe_param == 'daily':
                deals = deals.filter(created_at__gte=now - timedelta(days=1))
            elif timeframe_param == 'weekly':
                deals = deals.filter(created_at__gte=now - timedelta(days=7))
            elif timeframe_param == 'monthly':
                deals = deals.filter(created_at__gte=now - timedelta(days=30))

        deals = scope_by_location(deals, request.user, location_field='wa_contact__location')
        deals = deals.order_by('-created_at')

        if is_paginated:
            total_value = float(deals.aggregate(val=Sum('value'))['val'] or 0)
            confirmed_count = deals.filter(stage__is_confirmed=True).count()

            paginator = StandardPagination()
            paginated_deals = paginator.paginate_queryset(deals, request, view=self)
            data = PipelineDealSerializer(paginated_deals, many=True).data

            response = paginator.get_paginated_response(data)
            response.data['total_value'] = total_value
            response.data['confirmed_count'] = confirmed_count
            response.data['current_page'] = paginator.page.number
            response.data['total_pages'] = paginator.page.paginator.num_pages
            response.data['page_size'] = paginator.get_page_size(request) or 10
            return response

        data = PipelineDealSerializer(deals, many=True).data
        if not search_param and not stage_id_param:
            cache.set(cache_key, data, timeout=3600)
        return Response(data)

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
            deal = serializer.save(owner=get_tenant_owner(request.user), pipeline=pipeline)
            sync_deal_confirmation(deal, target_stage=deal.stage, owner=get_tenant_owner(request.user))
            increment_pipeline_cache_version(get_tenant_owner(request.user).id)
            fresh_deal = scope_by_owner(
                PipelineDeal.objects.select_related('wa_contact', 'wa_contact__crm_contact').prefetch_related('confirmed_booking_records'),
                request.user
            ).get(pk=deal.pk)
            return Response(PipelineDealSerializer(fresh_deal).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PipelineDealDetailView(APIView):
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def get_object(self, pk, user):
        try:
            return scope_by_owner(PipelineDeal.objects.select_related('wa_contact', 'wa_contact__crm_contact').prefetch_related('confirmed_booking_records').all(), user).get(pk=pk)
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


        # ── Confirmed Booking Logic ───────────────────────────────────────────
        # When a deal is moved to a stage marked is_confirmed=True,
        # add / update record in the dedicated ConfirmedBooking table.
        old_stage_id = str(deal.stage_id or '')
        new_stage_id = request.data.get('stage')
        stage_changed = bool(new_stage_id and str(new_stage_id) != old_stage_id)
        mutable_data = request.data.copy()

        if 'manual_contact' in mutable_data and mutable_data['manual_contact'] is None:
            mutable_data['manual_contact'] = ''
        if 'note' in mutable_data and mutable_data['note'] is None:
            mutable_data['note'] = ''
        if 'wa_contact' in mutable_data and mutable_data['wa_contact'] in ('', 'null', None):
            mutable_data['wa_contact'] = None
            
        serializer = PipelineDealSerializer(deal, data=mutable_data, partial=True)
        if serializer.is_valid():
            updated_deal = serializer.save()
            owner = get_tenant_owner(request.user)

            # Keep pipeline consistent with stage if stage changed across pipelines
            if updated_deal.stage and updated_deal.stage.pipeline_id and updated_deal.pipeline_id != updated_deal.stage.pipeline_id:
                updated_deal.pipeline = updated_deal.stage.pipeline
                updated_deal.save(update_fields=['pipeline'])

            if stage_changed:
                sync_deal_confirmation(updated_deal, target_stage=updated_deal.stage, owner=owner)
            else:
                # If stage didn't change, keep existing ConfirmedBooking snapshot updated
                if updated_deal.stage and updated_deal.stage.is_confirmed:
                    ConfirmedBooking.objects.filter(deal=updated_deal).update(
                        deal_name=updated_deal.name,
                        value=updated_deal.value or 0.00,
                        note=updated_deal.note or '',
                        extra_data=updated_deal.extra_data or {},
                    )
                else:
                    ConfirmedBooking.objects.filter(deal=updated_deal).delete()

            # Bust cache
            increment_pipeline_cache_version(owner.id)

            # Re-fetch deal with fresh relations so serializer does not return stale prefetched booking records
            fresh_deal = self.get_object(updated_deal.pk, request.user)
            return Response(PipelineDealSerializer(fresh_deal).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        deal = self.get_object(pk, request.user)
        if not deal:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        deal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Confirmed Bookings 
class ConfirmedBookingsView(APIView):
   
    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def get(self, request):
        pipeline_param = request.query_params.get('pipeline')
        search_param = request.query_params.get('search', '').strip()
        is_paginated = request.query_params.get('paginate') == 'true' or 'page' in request.query_params

        bookings = scope_by_owner(
            ConfirmedBooking.objects.select_related(
                'pipeline', 'stage', 'deal', 'contact'
            ).all(),
            request.user
        )

        if pipeline_param and pipeline_param != 'all':
            is_uuid = False
            try:
                import uuid
                uuid.UUID(str(pipeline_param))
                is_uuid = True
            except (ValueError, TypeError, AttributeError):
                is_uuid = False

            if is_uuid:
                bookings = bookings.filter(
                    Q(pipeline_id=pipeline_param) |
                    Q(pipeline__name=pipeline_param) |
                    Q(pipeline_name=pipeline_param)
                )
            else:
                bookings = bookings.filter(
                    Q(pipeline__name=pipeline_param) |
                    Q(pipeline_name=pipeline_param)
                )

        if search_param:
            bookings = bookings.filter(
                Q(deal_name__icontains=search_param) |
                Q(contact_name__icontains=search_param) |
                Q(contact_phone__icontains=search_param) |
                Q(stage_title__icontains=search_param) |
                Q(pipeline_name__icontains=search_param) |
                Q(note__icontains=search_param)
            )

        bookings = bookings.order_by('-confirmed_at', '-created_at')

        if is_paginated:
            total_value = float(bookings.aggregate(val=Sum('value'))['val'] or 0)
            paginator = StandardPagination()
            paginated_bookings = paginator.paginate_queryset(bookings, request, view=self)
            serializer = ConfirmedBookingSerializer(paginated_bookings, many=True)
            response = paginator.get_paginated_response(serializer.data)
            response.data['total_value'] = total_value
            response.data['current_page'] = paginator.page.number
            response.data['total_pages'] = paginator.page.paginator.num_pages
            response.data['page_size'] = paginator.get_page_size(request) or 10
            return response

        serializer = ConfirmedBookingSerializer(bookings, many=True)
        return Response(serializer.data)


class ConfirmedBookingDetailView(APIView):

    permission_classes = [IsAuthenticated, RequirePermission]
    required_permission = Permission.ACCESS_PIPELINE

    def get(self, request, pk):
        try:
            booking = scope_by_owner(
                ConfirmedBooking.objects.select_related(
                    'pipeline', 'stage', 'deal', 'contact'
                ).all(),
                request.user
            ).get(pk=pk)
        except ConfirmedBooking.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(ConfirmedBookingSerializer(booking).data)

    def patch(self, request, pk):
        try:
            booking = scope_by_owner(
                ConfirmedBooking.objects.all(), request.user
            ).get(pk=pk)
        except ConfirmedBooking.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        update_fields = ['updated_at']
        deal_updates = {}

        if 'name' in request.data or 'deal_name' in request.data:
            name_val = request.data.get('name') if 'name' in request.data else request.data.get('deal_name')
            if name_val is not None:
                booking.deal_name = str(name_val).strip()
                update_fields.append('deal_name')
                deal_updates['name'] = booking.deal_name

        if 'value' in request.data:
            try:
                booking.value = float(request.data['value'])
                update_fields.append('value')
                deal_updates['value'] = booking.value
            except (ValueError, TypeError):
                pass

        if 'contact_name' in request.data:
            booking.contact_name = str(request.data.get('contact_name') or '').strip()
            update_fields.append('contact_name')
            if not booking.contact_id:
                deal_updates['manual_contact'] = booking.contact_name

        if 'contact_phone' in request.data:
            booking.contact_phone = str(request.data.get('contact_phone') or '').strip()
            update_fields.append('contact_phone')

        if 'note' in request.data:
            booking.note = request.data.get('note') or ''
            update_fields.append('note')
            deal_updates['note'] = booking.note

        if 'extra_data' in request.data:
            extra_data_val = request.data.get('extra_data')
            if isinstance(extra_data_val, dict):
                booking.extra_data = extra_data_val
                update_fields.append('extra_data')
                deal_updates['extra_data'] = booking.extra_data

        booking.save(update_fields=list(set(update_fields)))

        if booking.deal_id and deal_updates:
            PipelineDeal.objects.filter(pk=booking.deal_id).update(**deal_updates)

        owner = get_tenant_owner(request.user)
        increment_pipeline_cache_version(owner.id)

        return Response(ConfirmedBookingSerializer(booking).data)

    def delete(self, request, pk):
        try:
            booking = scope_by_owner(
                ConfirmedBooking.objects.all(), request.user
            ).get(pk=pk)
        except ConfirmedBooking.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
