from django.urls import path
from . import views

urlpatterns = [
    path('logs/', views.listar_logs, name='listar_logs'),
    path('logs/<int:log_id>/', views.detalhe_log, name='detalhe_log'),
    path('resumo/', views.resumo_auditoria, name='resumo_auditoria'),
]
