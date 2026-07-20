from django.contrib import admin
from .models import LogAuditoria


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ['id', 'data_hora', 'usuario', 'acao', 'modelo', 'objeto_id', 'descricao_curta']
    list_filter = ['acao', 'modelo', 'data_hora']
    search_fields = ['descricao', 'usuario__username', 'modelo']
    date_hierarchy = 'data_hora'
    readonly_fields = [
        'usuario', 'acao', 'modelo', 'objeto_id', 'descricao',
        'dados_anteriores', 'dados_novos', 'ip_address', 'user_agent', 'data_hora'
    ]

    def descricao_curta(self, obj):
        return obj.descricao[:80] + '...' if len(obj.descricao) > 80 else obj.descricao
    descricao_curta.short_description = 'Descrição'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
