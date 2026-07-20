from django.urls import path
from . import views

urlpatterns = [
    path('conversas/', views.listar_conversas, name='listar_conversas'),
    path('conversas/criar/', views.criar_conversa, name='criar_conversa'),
    path('conversas/<int:conversa_id>/', views.detalhe_conversa, name='detalhe_conversa'),
    path('conversas/<int:conversa_id>/enviar/', views.enviar_mensagem, name='enviar_mensagem'),
]
