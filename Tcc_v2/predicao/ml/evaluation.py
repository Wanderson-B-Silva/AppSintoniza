"""
evaluation.py - Módulo de avaliação de performance do modelo
Gera métricas de classificação, matriz de confusão e relatórios.
"""

import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix, roc_auc_score
)
import logging

logger = logging.getLogger(__name__)


class AvaliadorModelo:
    """
    Classe responsável pela avaliação de performance do modelo.
    Gera métricas, matriz de confusão e relatórios detalhados.
    """

    LABELS_RISCO = ['Baixo', 'Médio', 'Alto', 'Crítico']

    def __init__(self):
        self.metricas = None
        self.matriz_confusao = None
        self.relatorio = None

    def avaliar(self, y_true, y_pred, y_proba=None):
        """
        Avalia a performance do modelo com múltiplas métricas.

        Args:
            y_true: valores reais do target
            y_pred: valores preditos pelo modelo
            y_proba: probabilidades preditas (opcional)

        Returns:
            dict com todas as métricas calculadas
        """
        # Métricas básicas
        acuracia = accuracy_score(y_true, y_pred)
        precisao_macro = precision_score(y_true, y_pred, average='macro', zero_division=0)
        recall_macro = recall_score(y_true, y_pred, average='macro', zero_division=0)
        f1_macro = f1_score(y_true, y_pred, average='macro', zero_division=0)

        # Métricas por classe
        precisao_classe = precision_score(y_true, y_pred, average=None, zero_division=0)
        recall_classe = recall_score(y_true, y_pred, average=None, zero_division=0)
        f1_classe = f1_score(y_true, y_pred, average=None, zero_division=0)

        # Classes presentes nos dados
        classes_presentes = sorted(set(y_true) | set(y_pred))
        labels_presentes = [
            self.LABELS_RISCO[i] if i < len(self.LABELS_RISCO) else f'Classe {i}'
            for i in classes_presentes
        ]

        # Métricas por classe detalhadas
        metricas_por_classe = {}
        for i, (classe, label) in enumerate(zip(classes_presentes, labels_presentes)):
            metricas_por_classe[label] = {
                'precisao': round(float(precisao_classe[i]), 4) if i < len(precisao_classe) else 0,
                'recall': round(float(recall_classe[i]), 4) if i < len(recall_classe) else 0,
                'f1_score': round(float(f1_classe[i]), 4) if i < len(f1_classe) else 0,
                'suporte': int(np.sum(np.array(y_true) == classe)),
            }

        # Matriz de confusão
        self.matriz_confusao = confusion_matrix(y_true, y_pred, labels=classes_presentes)
        matriz_dict = {
            'matriz': self.matriz_confusao.tolist(),
            'labels': labels_presentes,
        }

        # ROC AUC (se probabilidades disponíveis)
        roc_auc = None
        if y_proba is not None:
            try:
                roc_auc = round(float(
                    roc_auc_score(y_true, y_proba, multi_class='ovr', average='macro')
                ), 4)
            except Exception:
                roc_auc = None

        self.metricas = {
            'acuracia': round(float(acuracia), 4),
            'precisao_macro': round(float(precisao_macro), 4),
            'recall_macro': round(float(recall_macro), 4),
            'f1_macro': round(float(f1_macro), 4),
            'roc_auc': roc_auc,
            'metricas_por_classe': metricas_por_classe,
            'matriz_confusao': matriz_dict,
            'total_amostras': len(y_true),
        }

        # Relatório classificação sklearn
        self.relatorio = classification_report(
            y_true, y_pred,
            labels=classes_presentes,
            target_names=labels_presentes,
            zero_division=0
        )

        logger.info(
            f"Avaliação: Acurácia={acuracia:.4f}, "
            f"F1-macro={f1_macro:.4f}, "
            f"ROC-AUC={roc_auc}"
        )

        return self.metricas

    def identificar_erros(self, y_true, y_pred):
        """
        Identifica padrões de erro do modelo.

        Returns:
            dict com análise de erros
        """
        erros_idx = np.where(np.array(y_true) != np.array(y_pred))[0]
        total_erros = len(erros_idx)
        total = len(y_true)

        # Análise de erros por tipo
        erros_detalhados = {}
        for idx in erros_idx:
            real = int(y_true[idx])
            pred = int(y_pred[idx])
            label_real = self.LABELS_RISCO[real] if real < len(self.LABELS_RISCO) else str(real)
            label_pred = self.LABELS_RISCO[pred] if pred < len(self.LABELS_RISCO) else str(pred)
            chave = f"{label_real} -> {label_pred}"
            erros_detalhados[chave] = erros_detalhados.get(chave, 0) + 1

        # Ordenar por frequência
        erros_ordenados = sorted(
            erros_detalhados.items(), key=lambda x: x[1], reverse=True
        )

        return {
            'total_erros': total_erros,
            'total_amostras': total,
            'taxa_erro': round(total_erros / max(total, 1) * 100, 2),
            'erros_mais_comuns': [
                {'tipo': tipo, 'quantidade': qtd}
                for tipo, qtd in erros_ordenados[:10]
            ],
        }

    def gerar_relatorio_completo(self):
        """Retorna o relatório completo de avaliação."""
        if self.metricas is None:
            return {'erro': 'Avaliação não realizada. Execute avaliar() primeiro.'}

        return {
            'metricas': self.metricas,
            'relatorio_classificacao': self.relatorio,
        }
