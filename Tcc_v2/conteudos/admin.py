from django.contrib import admin
from .models import Conteudo


@admin.register(Conteudo)
class ConteudoAdmin(admin.ModelAdmin):
    list_display = ['id', 'titulo', 'tipo', 'categoria', 'autor', 'destaque', 'ativo', 'criado_em']
    list_filter = ['tipo', 'categoria', 'ativo', 'destaque']
    search_fields = ['titulo', 'descricao', 'autor']
