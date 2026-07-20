from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def home(request):
    return HttpResponse("""
        <h1>API do App de Saúde Mental</h1>
        <p>Bem-vindo à API!</p>
    """)

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/usuarios/', include('usuarios.urls')),
    path('api/questionarios/', include('questionarios.urls')),
    path('api/conteudos/', include('conteudos.urls')),
    path('api/mensagens/', include('mensagens.urls')),
    path('api/auditoria/', include('auditoria.urls')),
    path('api/predicao/', include('predicao.urls')),
]