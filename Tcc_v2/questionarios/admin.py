from django.contrib import admin
from .models import Questionario, Pergunta, Resposta, Avaliacao

@admin.register(Questionario)
class QuestionarioAdmin(admin.ModelAdmin):
    list_display = ['id', 'titulo', 'ativo', 'criado_em']
    list_filter = ['ativo']

@admin.register(Pergunta)
class PerguntaAdmin(admin.ModelAdmin):
    list_display = ['id', 'questionario', 'texto_resumido', 'ordem', 'peso']
    list_filter = ['questionario']
    
    def texto_resumido(self, obj):
        return obj.texto[:50] + '...' if len(obj.texto) > 50 else obj.texto
    texto_resumido.short_description = 'Pergunta'

@admin.register(Resposta)
class RespostaAdmin(admin.ModelAdmin):
    list_display = ['id', 'funcionario', 'pergunta', 'valor', 'data_resposta']
    list_filter = ['data_resposta']
    date_hierarchy = 'data_resposta'

@admin.register(Avaliacao)
class AvaliacaoAdmin(admin.ModelAdmin):
    list_display = ['id', 'funcionario', 'nivel', 'pontuacao_total', 'data_avaliacao']
    list_filter = ['nivel', 'data_avaliacao']

from .models import ParecerPsicologo, CheckinHumor

@admin.register(ParecerPsicologo)
class ParecerPsicologoAdmin(admin.ModelAdmin):
    list_display = ['id', 'psicologo', 'avaliacao', 'nivel_atencao', 'criado_em']
    list_filter = ['nivel_atencao', 'criado_em']

@admin.register(CheckinHumor)
class CheckinHumorAdmin(admin.ModelAdmin):
    list_display = ['id', 'funcionario', 'humor', 'nota', 'data']
    list_filter = ['humor', 'data']
