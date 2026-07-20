from django.contrib import admin
from .models import Usuario, Empresa, Funcionario, Psicologo


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'email', 'tipo', 'is_active']
    list_filter = ['tipo', 'is_active']
    search_fields = ['username', 'email']


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ['id', 'razao_social', 'cnpj', 'representante_nome', 'usuario']
    search_fields = ['razao_social', 'cnpj', 'representante_nome', 'representante_cpf']


@admin.register(Funcionario)
class FuncionarioAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'empresa', 'cargo']
    list_filter = ['empresa']
    search_fields = ['usuario__username', 'cargo']


@admin.register(Psicologo)
class PsicologoAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'crp']
    search_fields = ['usuario__username', 'crp']