from django.urls import path
from . import views

urlpatterns = [
    # Endpoint principal de predição
    path('predict/', views.predict, name='predict'),

    # Fila de prioridade para psicólogos
    path('fila/', views.fila_prioridade, name='fila_prioridade'),
    path('fila/<int:predicao_id>/atender/', views.marcar_atendido, name='marcar_atendido'),

    # Predições do funcionário
    path('minhas-predicoes/', views.minhas_predicoes, name='minhas_predicoes'),

    # Dashboard e informações do modelo
    path('dashboard/', views.dashboard_ml, name='dashboard_ml'),
    path('info/', views.info_modelo, name='info_modelo'),
]
