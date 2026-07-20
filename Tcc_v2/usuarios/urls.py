from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('login/', views.login_usuario),
    path('login/token/', views.login_com_token),

    # Cadastros
    path('cadastro/empresa/', views.cadastrar_empresa),
    path('cadastro/funcionario/', views.cadastrar_funcionario),
    path('cadastro/psicologo/', views.cadastrar_psicologo),

    # Perfil
    path('perfil/', views.perfil_usuario),
    path('meu-perfil-funcionario/', views.meu_perfil_funcionario),

    # Empresa - Funcionários
    path('empresa/funcionarios/', views.listar_funcionarios_empresa),
    path('empresa/funcionarios/<int:funcionario_id>/', views.editar_funcionario),
    path('empresa/funcionarios/<int:funcionario_id>/excluir/', views.excluir_funcionario),
    path('empresa/estatisticas/', views.estatisticas_funcionarios),

    # NOVO: Dashboard completo da empresa
    path('empresa/dashboard/', views.dashboard_empresa),

    # Listagem geral
    path('listar/', views.listar_usuarios),

    # Reset de senha
    path('reset-password/solicitar/', views.solicitar_reset_senha),
    path('reset-password/confirmar/', views.confirmar_reset_senha),

    # LGPD
    path('lgpd/exportar/', views.exportar_dados_lgpd),
    path('lgpd/excluir/', views.solicitar_exclusao_lgpd),

    # Relatórios de gestão
    path('empresa/relatorios/', views.relatorios_gestao),
]
