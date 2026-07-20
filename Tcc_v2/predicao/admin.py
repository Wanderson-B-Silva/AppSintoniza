from django.contrib import admin
from .models import Predicao


@admin.register(Predicao)
class PredicaoAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'funcionario', 'nivel_risco_predito', 'probabilidade',
        'score_prioridade', 'atendido', 'data_predicao'
    ]
    list_filter = ['nivel_risco_predito', 'atendido', 'data_predicao']
    search_fields = [
        'funcionario__usuario__first_name',
        'funcionario__usuario__last_name'
    ]
    readonly_fields = ['data_predicao']
