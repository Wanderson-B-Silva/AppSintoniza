from django.contrib import admin
from .models import Conversa, Mensagem


@admin.register(Conversa)
class ConversaAdmin(admin.ModelAdmin):
    list_display = ['id', 'participante1', 'participante2', 'ativa', 'criada_em', 'atualizada_em']
    list_filter = ['ativa', 'criada_em']
    search_fields = ['participante1__username', 'participante2__username']


@admin.register(Mensagem)
class MensagemAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversa', 'remetente', 'conteudo_curto', 'lida', 'data_envio']
    list_filter = ['lida', 'data_envio']
    search_fields = ['conteudo', 'remetente__username']

    def conteudo_curto(self, obj):
        return obj.conteudo[:60] + '...' if len(obj.conteudo) > 60 else obj.conteudo
    conteudo_curto.short_description = 'Conteúdo'
