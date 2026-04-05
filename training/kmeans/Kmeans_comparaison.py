#--------------------------------------------------------------------------------------------------
# Projet INF1683
# Étape 4 : Comparaison K-Means vs Clustering Hiérarchique (Ward)
# Ce script génère les figures de comparaison pour le rapport final
#--------------------------------------------------------------------------------------------------

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score

sns.set_theme(style="whitegrid")

#--------------------------------------------------------------------------------------------------
# Chargement
#--------------------------------------------------------------------------------------------------
df_scaled   = pd.read_csv("./docs/Mall_Customers_post_traitement.csv")
df_original = pd.read_csv("./docs/Mall_Customers.csv").drop(columns=["CustomerID"])
X = df_scaled.values

#--------------------------------------------------------------------------------------------------
# Chargement des labels pour chaque modèle
#--------------------------------------------------------------------------------------------------
# K-Means — modèle final entraîné
kmeans_model = joblib.load("./training/kmeans_final.pkl")
labels_km    = kmeans_model.predict(X)
K_km         = kmeans_model.n_clusters

# Hiérarchique — labels produits par le script hierarchical_final.py (K=6)
labels_hc = np.load("./training/hierarchical/labels_hierarchical.npy")
K_hc      = len(np.unique(labels_hc))

print(f"K-Means      : K={K_km} clusters")
print(f"Hiérarchique : K={K_hc} clusters")

#--------------------------------------------------------------------------------------------------
# Calcul des métriques pour les deux modèles
#--------------------------------------------------------------------------------------------------
sil_km = silhouette_score(X, labels_km)
db_km  = davies_bouldin_score(X, labels_km)

sil_hc = silhouette_score(X, labels_hc)
db_hc  = davies_bouldin_score(X, labels_hc)

print(f"\nK-Means        — Silhouette: {sil_km:.4f} | DB: {db_km:.4f}")
print(f"Hiérarchique   — Silhouette: {sil_hc:.4f} | DB: {db_hc:.4f}")

#--------------------------------------------------------------------------------------------------
#Comparaison visuelle des deux méthodes (Revenu vs Score)
#--------------------------------------------------------------------------------------------------
palette_km = sns.color_palette("tab10", K_km)
palette_hc = sns.color_palette("tab10", K_hc)

fig, axes = plt.subplots(1, 2, figsize=(16, 6))
fig.suptitle("Comparaison K-Means vs Clustering Hiérarchique\n"
            "Projection : Revenu annuel vs Score de dépenses",
            fontsize=13, fontweight="bold")

configs = [
    (labels_km, K_km, palette_km,
    f"K-Means (K={K_km}, init=K-Means++)\nSilhouette={sil_km:.4f} | DB={db_km:.4f}"),
    (labels_hc, K_hc, palette_hc,
    f"Clustering Hiérarchique (K={K_hc}, Ward)\nSilhouette={sil_hc:.4f} | DB={db_hc:.4f}"),
]

for ax, (labels_plot, K, palette, titre) in zip(axes, configs):
    for cid in range(K):
        mask = labels_plot == cid
        ax.scatter(
            df_original.loc[mask, "Annual Income (k$)"],
            df_original.loc[mask, "Spending Score (1-100)"],
            label=f"Cluster {cid}",
            alpha=0.75,
            color=palette[cid],
            s=65,
            edgecolors="white",
            linewidths=0.5
        )
    ax.set_xlabel("Revenu annuel (k$)", fontweight="bold")
    ax.set_ylabel("Score de dépenses", fontweight="bold")
    ax.set_title(titre, fontweight="bold", fontsize=10)
    ax.legend(fontsize=8)

plt.tight_layout()
plt.savefig("./training/fig11_comparaison.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 11 sauvegardée : fig11_comparaison.png")

#--------------------------------------------------------------------------------------------------
# Figure 12 — Tableau de comparaison des métriques (barplot)
#--------------------------------------------------------------------------------------------------
fig, axes = plt.subplots(1, 2, figsize=(12, 5))
fig.suptitle(f"Comparaison des métriques : K-Means (K={K_km}) vs Hiérarchique (K={K_hc})",
            fontsize=13, fontweight="bold")

modeles = [f"K-Means\n(K={K_km})", f"Hiérarchique\n(K={K_hc})"]
colors  = ["steelblue", "tomato"]

metriques = [
    ("Score de silhouette\n(↑ meilleur)", [sil_km, sil_hc], "max"),
    ("Indice de Davies-Bouldin\n(↓ meilleur)", [db_km, db_hc], "min"),
]

for ax, (titre, vals, better) in zip(axes, metriques):
    bars = ax.bar(modeles, vals, color=colors, alpha=0.85,
                edgecolor="white", linewidth=0.8, width=0.5)
    ax.set_title(titre, fontweight="bold")
    ax.set_ylim(0, max(vals) * 1.35)

    for bar, val in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width() / 2,
                bar.get_height() + max(vals) * 0.02,
                f"{val:.4f}", ha="center", va="bottom",
                fontsize=11, fontweight="bold")

    best_idx = vals.index(max(vals)) if better == "max" else vals.index(min(vals))
    bars[best_idx].set_edgecolor("gold")
    bars[best_idx].set_linewidth(3)
    ax.text(bars[best_idx].get_x() + bars[best_idx].get_width() / 2,
            bars[best_idx].get_height() + max(vals) * 0.12,
            "★ meilleur", ha="center", color="goldenrod",
            fontsize=9, fontweight="bold")

plt.tight_layout()
plt.savefig("./training/fig12_comparaison_metriques.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 12 sauvegardée : fig12_comparaison_metriques.png")

#--------------------------------------------------------------------------------------------------
# Résumé comparatif
#--------------------------------------------------------------------------------------------------
print("\n" + "=" * 65)
print("RÉSUMÉ COMPARATIF")
print("=" * 65)
print(f"{'':30} {'K-Means':>12} {'Hiérarchique':>14}")
print(f"{'':30} {f'(K={K_km})':>12} {f'(K={K_hc})':>14}")
print("-" * 65)
print(f"{'Score de silhouette':30} {sil_km:>12.4f} {sil_hc:>14.4f}")
print(f"{'Davies-Bouldin Index':30} {db_km:>12.4f} {db_hc:>14.4f}")
print("-" * 65)

winner_sil = f"K-Means (K={K_km})"    if sil_km > sil_hc else f"Hiérarchique (K={K_hc})"
winner_db  = f"K-Means (K={K_km})"    if db_km  < db_hc  else f"Hiérarchique (K={K_hc})"
print(f"\nMeilleure silhouette : {winner_sil}")
print(f"Meilleur DB index    : {winner_db}")
print("\n→ Note : les deux modèles ont été évalués à leur K optimal respectif.")
print("  La différence de K (5 vs 6) est elle-même une observation pertinente.")