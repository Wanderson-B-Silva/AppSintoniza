from django.urls import path
from . import views

urlpatterns = [
    path('listar/', views.listar_questionarios, name='listar_questionarios'),
    path('<int:questionario_id>/perguntas/', views.perguntas_questionario, name='perguntas'),
    path('responder/', views.salvar_respostas, name='salvar_respostas'),
    path('minhas-avaliacoes/', views.minhas_avaliacoes, name='minhas_avaliacoes'),
    path('ultima-avaliacao/', views.ultima_avaliacao, name='ultima_avaliacao'),
    path('avaliacao/<int:avaliacao_id>/', views.avaliacao_detalhe, name='avaliacao_detalhe'),
    path('estatisticas/empresa/', views.estatisticas_empresa, name='estatisticas_empresa'),
    path('empresa/humor/', views.humor_empresa, name='humor_empresa'),
    path('criar/', views.criar_questionario, name='criar_questionario'),
    path('psicologo/avaliacoes/', views.listar_avaliacoes_psicologo, name='avaliacoes_psicologo'),
    path('psicologo/avaliacoes/<int:avaliacao_id>/', views.detalhe_avaliacao_psicologo, name='detalhe_avaliacao_psicologo'),
    # Parecer do psicólogo (avaliar questionários respondidos)
    path('psicologo/avaliacoes/<int:avaliacao_id>/parecer/', views.criar_parecer, name='criar_parecer'),
    path('psicologo/pareceres/', views.pareceres_psicologo, name='pareceres_psicologo'),
    # Check-in de humor (funcionário)
    path('checkin/', views.registrar_checkin, name='registrar_checkin'),
    path('checkin/historico/', views.historico_checkin, name='historico_checkin'),
    path('teste/', views.teste_questionarios, name='teste'),
]