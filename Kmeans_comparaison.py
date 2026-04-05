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

from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.metrics import silhouette_score, davies_bouldin_score
from scipy.cluster.hierarchy import dendrogram, linkage

sns.set_theme(style="whitegrid")

#--------------------------------------------------------------------------------------------------
# Chargement
#--------------------------------------------------------------------------------------------------
df_scaled   = pd.read_csv("./docs/Mall_Customers_post_traitement.csv")
df_original = pd.read_csv("./docs/Mall_Customers.csv").drop(columns=["CustomerID"])
X = df_scaled.values

#--------------------------------------------------------------------------------------------------
# Figure 10 — Dendrogramme (clustering hiérarchique — pour comparaison)
#--------------------------------------------------------------------------------------------------
Z = linkage(X, method="ward")

fig, ax = plt.subplots(figsize=(14, 7))
dendrogram(
    Z,
    ax=ax,
    truncate_mode="level",
    p=10,
    leaf_rotation=90,
    leaf_font_size=10,
    color_threshold=7
)
ax.set_title("Dendrogramme — Clustering Hiérarchique (Ward)\n"
             "(Produit par le code du binôme — affiché ici pour comparaison)",
             fontsize=13, fontweight="bold")
ax.set_xlabel("Clients (regroupés)")
ax.set_ylabel("Distance de fusion (Ward)")
ax.axhline(y=7, color="red", linestyle="--", linewidth=1.8,
           label="Coupe → K = 5")
ax.legend(fontsize=10)
plt.tight_layout()
plt.savefig("./figures/fig10_dendrogramme.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 10 sauvegardée : fig10_dendrogramme.png")

#--------------------------------------------------------------------------------------------------
# Calcul des métriques pour les deux modèles (K=5)
#--------------------------------------------------------------------------------------------------
K = 5

# K-Means
km = KMeans(n_clusters=K, init="k-means++", n_init=10, random_state=42)
labels_km = km.fit_predict(X)
sil_km = silhouette_score(X, labels_km)
db_km  = davies_bouldin_score(X, labels_km)

# Clustering Hiérarchique (Ward) — même paramètres que le binôme
hc = AgglomerativeClustering(n_clusters=K, linkage="ward")
labels_hc = hc.fit_predict(X)
sil_hc = silhouette_score(X, labels_hc)
db_hc  = davies_bouldin_score(X, labels_hc)

print(f"\nK-Means        — Silhouette: {sil_km:.4f} | DB: {db_km:.4f}")
print(f"Hiérarchique   — Silhouette: {sil_hc:.4f} | DB: {db_hc:.4f}")

#--------------------------------------------------------------------------------------------------
# Figure 11 — Comparaison visuelle des deux méthodes (Revenu vs Score)
#--------------------------------------------------------------------------------------------------
fig, axes = plt.subplots(1, 2, figsize=(16, 6))
fig.suptitle("Comparaison K-Means vs Clustering Hiérarchique (K=5)\n"
             "Projection : Revenu annuel vs Score de dépenses",
             fontsize=13, fontweight="bold")

palette = sns.color_palette("tab10", K)

for ax, (labels_plot, titre) in zip(axes, [
    (labels_km, f"K-Means (init=K-Means++)\nSilhouette={sil_km:.4f} | DB={db_km:.4f}"),
    (labels_hc, f"Clustering Hiérarchique (Ward)\nSilhouette={sil_hc:.4f} | DB={db_hc:.4f}"),
]):
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
plt.savefig("./figures/fig11_comparaison.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 11 sauvegardée : fig11_comparaison.png")

#--------------------------------------------------------------------------------------------------
# Figure 12 — Tableau de comparaison des métriques (barplot)
#--------------------------------------------------------------------------------------------------
metriques = {
    "Score de silhouette\n(↑ meilleur)": [sil_km, sil_hc],
    "Indice de Davies-Bouldin\n(↓ meilleur)": [db_km, db_hc],
}

fig, axes = plt.subplots(1, 2, figsize=(12, 5))
fig.suptitle("Comparaison des métriques : K-Means vs Hiérarchique (K=5)",
             fontsize=13, fontweight="bold")

modeles = ["K-Means\n(K-Means++)", "Hiérarchique\n(Ward)"]
colors  = ["steelblue", "tomato"]

for ax, (metrique, vals) in zip(axes, metriques.items()):
    bars = ax.bar(modeles, vals, color=colors, alpha=0.85,
                  edgecolor="white", linewidth=0.8, width=0.5)
    ax.set_title(metrique, fontweight="bold")
    ax.set_ylim(0, max(vals) * 1.3)
    for bar, val in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(vals)*0.02,
                f"{val:.4f}", ha="center", va="bottom",
                fontsize=11, fontweight="bold")
    # Mettre en évidence le meilleur
    best_idx = vals.index(max(vals)) if "silhouette" in metrique.lower() else vals.index(min(vals))
    bars[best_idx].set_edgecolor("gold")
    bars[best_idx].set_linewidth(3)
    ax.text(bars[best_idx].get_x() + bars[best_idx].get_width()/2,
            bars[best_idx].get_height() + max(vals)*0.10,
            "★ meilleur", ha="center", color="goldenrod", fontsize=9, fontweight="bold")

plt.tight_layout()
plt.savefig("./figures/fig12_comparaison_metriques.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 12 sauvegardée : fig12_comparaison_metriques.png")

#--------------------------------------------------------------------------------------------------
# Résumé comparatif
#--------------------------------------------------------------------------------------------------
print("\n" + "=" * 60)
print("RÉSUMÉ COMPARATIF")
print("=" * 60)
print(f"{'':30} {'K-Means':>12} {'Hiérarchique':>14}")
print("-" * 60)
print(f"{'Score de silhouette':30} {sil_km:>12.4f} {sil_hc:>14.4f}")
print(f"{'Davies-Bouldin Index':30} {db_km:>12.4f} {db_hc:>14.4f}")
print(f"{'Taille données':30} {'200':>12} {'200':>14}")
print(f"{'Nombre de clusters K':30} {'5':>12} {'5':>14}")
print("-" * 60)
winner_sil = "K-Means" if sil_km > sil_hc else "Hiérarchique"
winner_db  = "K-Means" if db_km  < db_hc  else "Hiérarchique"
print(f"\nMeilleure silhouette : {winner_sil}")
print(f"Meilleur DB index    : {winner_db}")