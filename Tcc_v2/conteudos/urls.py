from django.urls import path
from . import views

urlpatterns = [
    path('listar/', views.listar_conteudos, name='listar_conteudos'),
    path('videos/', views.listar_videos, name='listar_videos'),
    path('livros/', views.listar_livros, name='listar_livros'),
    path('criar/', views.criar_conteudo, name='criar_conteudo'),
    path('<int:conteudo_id>/', views.detalhe_conteudo, name='detalhe_conteudo'),
]
