from django.contrib import admin
from .models import (
    AutomationFlow,
    FlowNode,
    FlowEdge,
    FlowExecution,
    FlowStepLog,
)


class FlowNodeInline(admin.TabularInline):
    model  = FlowNode
    extra  = 0
    fields = ("node_id", "node_type", "title", "pos_x", "pos_y", "width", "height")
    readonly_fields = ("created_at",)
    show_change_link = True


class FlowEdgeInline(admin.TabularInline):
    model  = FlowEdge
    extra  = 0
    fields = ("edge_id", "source_node", "target_node", "source_handle", "label")
    readonly_fields = ("created_at",)


class FlowStepLogInline(admin.TabularInline):
    model  = FlowStepLog
    extra  = 0
    fields = ("node", "status", "branch_taken", "user_input", "started_at", "completed_at")
    readonly_fields = ("node", "status", "branch_taken", "user_input", "started_at", "completed_at")
    can_delete = False



@admin.register(AutomationFlow)
class AutomationFlowAdmin(admin.ModelAdmin):
    list_display  = ("name", "status", "owner", "total_executions", "active_executions", "created_at")
    list_filter   = ("status",)
    search_fields = ("name", "description", "owner__email")
    readonly_fields = ("id", "created_at", "updated_at", "total_executions", "active_executions")
    inlines = [FlowNodeInline, FlowEdgeInline]

    fieldsets = (
        (None, {
            "fields": ("id", "name", "description", "status", "owner", "instance"),
        }),
        ("Canvas State", {
            "fields": ("viewport",),
            "classes": ("collapse",),
        }),
        ("Stats", {
            "fields": ("total_executions", "active_executions", "created_at", "updated_at"),
        }),
    )



@admin.register(FlowNode)
class FlowNodeAdmin(admin.ModelAdmin):
    list_display  = ("node_id", "node_type", "title", "flow", "created_at")
    list_filter   = ("node_type",)
    search_fields = ("node_id", "title", "flow__name")
    readonly_fields = ("id", "created_at", "updated_at")

    fieldsets = (
        (None, {
            "fields": ("id", "flow", "node_id", "node_type", "title", "description"),
        }),
        ("Canvas Position & Size", {
            "fields": ("pos_x", "pos_y", "width", "height"),
        }),
        ("Node Configuration", {
            "fields": ("config",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )



@admin.register(FlowEdge)
class FlowEdgeAdmin(admin.ModelAdmin):
    list_display  = ("edge_id", "source_node", "target_node", "source_handle", "flow", "created_at")
    search_fields = ("edge_id", "flow__name")
    readonly_fields = ("id", "created_at", "updated_at")



@admin.register(FlowExecution)
class FlowExecutionAdmin(admin.ModelAdmin):
    list_display  = ("id", "flow", "contact", "status", "started_at", "completed_at")
    list_filter   = ("status",)
    search_fields = ("flow__name", "contact__name", "contact__wa_id")
    readonly_fields = ("id", "started_at", "completed_at", "created_at", "updated_at")
    inlines = [FlowStepLogInline]

    fieldsets = (
        (None, {
            "fields": ("id", "flow", "contact", "status", "current_node"),
        }),
        ("Runtime Data", {
            "fields": ("variables", "resume_at", "error"),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": ("started_at", "completed_at", "created_at", "updated_at"),
        }),
    )



@admin.register(FlowStepLog)
class FlowStepLogAdmin(admin.ModelAdmin):
    list_display  = ("id", "execution", "node", "status", "branch_taken", "started_at")
    list_filter   = ("status",)
    search_fields = ("execution__id", "node__title")
    readonly_fields = ("id", "started_at", "completed_at", "created_at", "updated_at")
