# Settings de TESTE local (SQLite) - apenas para validação. NÃO usar em produção.
from core.settings import *  # noqa

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'test_db.sqlite3',
    }
}
