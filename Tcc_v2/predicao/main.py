"""
main.py - Pipeline completo de Machine Learning
Executa: carregamento, pré-processamento, treinamento, avaliação e persistência.
Uso: python main.py
"""

import os
import sys
import json
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('SintonizeML')

# Adicionar diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from ml.data_loader import DataLoader
from ml.preprocessing import PreProcessador
from ml.training import TreinadorModelo
from ml.evaluation import AvaliadorModelo
from ml.model_repository import ModelRepository


def executar_pipeline():
    """Executa o pipeline completo de ML."""

    print("=" * 70)
    print("  SINTONIZE - Pipeline de Machine Learning")
    print("  Predição de Nível de Risco em Saúde Mental")
    print("=" * 70)

    # ─── 1. CARREGAMENTO DO DATASET ───
    print("\n📊 1. CARREGAMENTO DO DATASET")
    print("-" * 40)

    loader = DataLoader()
    df = loader.carregar()
    print(f"   ✓ Dataset carregado: {df.shape[0]} registros x {df.shape[1]} colunas")

    # Validação
    validacao = loader.validar()
    print(f"   ✓ Validação: {'APROVADO' if validacao['valido'] else 'FALHOU'}")
    print(f"   ✓ Distribuição do target:")
    for nivel, qtd in validacao['distribuicao_target'].items():
        print(f"     - {nivel}: {qtd} registros")

    if not validacao['valido']:
        print(f"   ✗ Erros: {validacao['erros']}")
        return

    # Separar features e target
    X, y = loader.obter_features_e_target()
    print(f"   ✓ Features (X): {X.shape}")
    print(f"   ✓ Target (y): {y.shape}")

    # ─── 2. PRÉ-PROCESSAMENTO ───
    print("\n🔧 2. PRÉ-PROCESSAMENTO")
    print("-" * 40)

    preprocessador = PreProcessador()
    X_processado, y_codificado = preprocessador.fit_transform(X, y)
    print(f"   ✓ Imputação de valores faltantes: mediana")
    print(f"   ✓ Normalização: StandardScaler (média=0, desvio=1)")
    print(f"   ✓ Codificação do target: {preprocessador.MAPA_RISCO}")
    print(f"   ✓ Shape processado: {X_processado.shape}")

    # ─── 3. TREINAMENTO DO MODELO ───
    print("\n🤖 3. TREINAMENTO DO MODELO")
    print("-" * 40)

    treinador = TreinadorModelo(algoritmo='random_forest')

    # Separar dados
    X_train, X_test, y_train, y_test = treinador.separar_dados(
        X_processado, y_codificado, test_size=0.2
    )
    print(f"   ✓ Treino: {len(X_train)} amostras")
    print(f"   ✓ Teste: {len(X_test)} amostras")

    # Treinar
    modelo = treinador.treinar()
    print(f"   ✓ Algoritmo: Random Forest (200 árvores)")
    print(f"   ✓ Modelo treinado com sucesso!")

    # Validação cruzada
    resultados_cv = treinador.validacao_cruzada(X_processado, y_codificado, cv=5)
    print(f"   ✓ Validação cruzada (5-fold): {resultados_cv['media']:.4f} "
          f"(±{resultados_cv['desvio_padrao']:.4f})")

    # Importância das features
    importancia = treinador.obter_importancia_features(preprocessador.feature_names)
    if importancia:
        print(f"   ✓ Top 5 features mais importantes:")
        for item in importancia[:5]:
            print(f"     - {item['feature']}: {item['importancia']:.4f}")

    # ─── 4. AVALIAÇÃO ───
    print("\n📈 4. AVALIAÇÃO DE PERFORMANCE")
    print("-" * 40)

    # Predições
    y_pred = treinador.predizer()
    y_proba = treinador.predizer_probabilidade(X_test)

    # Avaliar
    avaliador = AvaliadorModelo()
    metricas = avaliador.avaliar(y_test, y_pred, y_proba)

    print(f"   ✓ Acurácia:        {metricas['acuracia']:.4f}")
    print(f"   ✓ Precisão (macro): {metricas['precisao_macro']:.4f}")
    print(f"   ✓ Recall (macro):   {metricas['recall_macro']:.4f}")
    print(f"   ✓ F1-Score (macro): {metricas['f1_macro']:.4f}")
    if metricas['roc_auc']:
        print(f"   ✓ ROC AUC:         {metricas['roc_auc']:.4f}")

    print(f"\n   Métricas por classe:")
    for classe, m in metricas['metricas_por_classe'].items():
        print(f"     {classe:10s} - P: {m['precisao']:.4f}  R: {m['recall']:.4f}  "
              f"F1: {m['f1_score']:.4f}  Suporte: {m['suporte']}")

    print(f"\n   Matriz de Confusão:")
    labels = metricas['matriz_confusao']['labels']
    print(f"   {'':12s} " + " ".join(f"{l:>8s}" for l in labels))
    for i, row in enumerate(metricas['matriz_confusao']['matriz']):
        print(f"   {labels[i]:12s} " + " ".join(f"{v:>8d}" for v in row))

    # Análise de erros
    erros = avaliador.identificar_erros(y_test, y_pred)
    print(f"\n   Análise de erros:")
    print(f"     Total de erros: {erros['total_erros']}/{erros['total_amostras']} "
          f"({erros['taxa_erro']}%)")
    if erros['erros_mais_comuns']:
        print(f"     Erros mais comuns:")
        for erro in erros['erros_mais_comuns'][:5]:
            print(f"       - {erro['tipo']}: {erro['quantidade']} ocorrências")

    # Relatório completo
    print(f"\n   Relatório de classificação:")
    print(avaliador.relatorio)

    # ─── 5. PERSISTÊNCIA ───
    print("\n💾 5. PERSISTÊNCIA DO MODELO")
    print("-" * 40)

    repositorio = ModelRepository()

    # Adicionar informações extras às métricas
    metricas_completas = {
        **metricas,
        'algoritmo': 'random_forest',
        'validacao_cruzada': resultados_cv,
        'importancia_features': importancia,
        'info_preprocessamento': preprocessador.obter_info_preprocessamento(),
    }

    caminhos = repositorio.salvar_modelo(
        modelo=modelo,
        preprocessador=preprocessador,
        feature_names=preprocessador.feature_names,
        metricas=metricas_completas
    )

    print(f"   ✓ Artefatos salvos:")
    for nome, caminho in caminhos.items():
        tamanho = os.path.getsize(caminho) / 1024
        print(f"     - {nome}: {os.path.basename(caminho)} ({tamanho:.1f} KB)")

    # ─── RESUMO FINAL ───
    print("\n" + "=" * 70)
    print("  PIPELINE CONCLUÍDO COM SUCESSO!")
    print(f"  Acurácia: {metricas['acuracia']:.4f}")
    print(f"  F1-Score: {metricas['f1_macro']:.4f}")
    print(f"  Modelo salvo em: {repositorio.diretorio}")
    print("=" * 70)

    return metricas_completas


if __name__ == '__main__':
    executar_pipeline()
