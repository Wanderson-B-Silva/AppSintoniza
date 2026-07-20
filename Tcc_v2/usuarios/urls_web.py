# usuarios/urls_web.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.pagina_redefinir_senha, name='reset_password_page'),
]