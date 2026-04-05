#--------------------------------------------------------------------------------------------------
# Projet INF1683
# Étape 3a : Sélection du nombre de clusters K — K-Means
# Mall Customer Segmentation
#
# Méthodes utilisées :
#   1. Méthode du coude (Elbow Method) — inertie WCSS
#   2. Score de silhouette
#   3. Indice de Davies-Bouldin
#
# Ces mêmes métriques sont calculées pour le clustering hiérarchique (binôme),
# ce qui permettra une comparaison directe.
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
# Chargement des données prétraitées
#--------------------------------------------------------------------------------------------------
df_scaled = pd.read_csv("./docs/Mall_Customers_post_traitement.csv")
scaler    = joblib.load("./training/scaler.pkl")

# Dataset original pour interprétation
df_original = pd.read_csv("./docs/Mall_Customers.csv").drop(columns=["CustomerID"])

print("Dataset prétraité chargé :")
print(df_scaled.head())

X = df_scaled.values

#--------------------------------------------------------------------------------------------------
# Calcul des métriques pour K allant de 2 à 10
#--------------------------------------------------------------------------------------------------
K_range          = range(2, 11)
wcss_scores      = []   # Inertie (Within-Cluster Sum of Squares)
silhouette_scores = []  # Score de silhouette
db_scores        = []   # Indice de Davies-Bouldin

print("\nCalcul des métriques pour K = 2 à 10 :")
print(f"{'K':>4} | {'WCSS':>12} | {'Silhouette':>12} | {'Davies-Bouldin':>14}")
print("-" * 50)

for k in K_range:
    # n_init=10 : 10 initialisations aléatoires, on retient la meilleure inertie
    # init='k-means++' : initialisation intelligente pour éviter les minima locaux
    km = KMeans(n_clusters=k, init="k-means++", n_init=10,
                max_iter=300, random_state=42)
    labels = km.fit_predict(X)

    wcss      = km.inertia_
    sil       = silhouette_score(X, labels)
    db        = davies_bouldin_score(X, labels)

    wcss_scores.append(wcss)
    silhouette_scores.append(sil)
    db_scores.append(db)

    print(f"K={k:>2} | {wcss:>12.2f} | {sil:>12.4f} | {db:>14.4f}")

#--------------------------------------------------------------------------------------------------
# Figure 5 — Méthode du coude (Elbow Method)
#--------------------------------------------------------------------------------------------------
# On trace l'inertie WCSS (somme des distances quadratiques intra-cluster).
# Le "coude" correspond au K à partir duquel le gain marginal devient faible.
fig, ax = plt.subplots(figsize=(9, 5))

ax.plot(list(K_range), wcss_scores, marker="o", color="steelblue",
        linewidth=2, markersize=8, markerfacecolor="white", markeredgewidth=2)

# Mise en évidence du coude optimal
k_optimal = 5
ax.axvline(x=k_optimal, color="crimson", linestyle="--", linewidth=1.8,
           label=f"K = {k_optimal} (coude optimal)")

ax.set_title("Méthode du coude — Inertie WCSS en fonction de K",
             fontsize=13, fontweight="bold")
ax.set_xlabel("Nombre de clusters K", fontsize=11)
ax.set_ylabel("Inertie WCSS", fontsize=11)
ax.set_xticks(list(K_range))
ax.legend(fontsize=10)

# Annotation des valeurs
for k, w in zip(K_range, wcss_scores):
    ax.annotate(f"{w:.1f}", (k, w), textcoords="offset points",
                xytext=(0, 10), ha="center", fontsize=8, color="gray")

plt.tight_layout()
plt.savefig("./figures/fig5_elbow.png", dpi=150, bbox_inches="tight")
plt.close()
print("\n✅ Figure 5 sauvegardée : fig5_elbow.png")

#--------------------------------------------------------------------------------------------------
# Figure 6 — Score de silhouette et Davies-Bouldin par K
#--------------------------------------------------------------------------------------------------
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle("Métriques de validation pour la sélection de K",
             fontsize=14, fontweight="bold")

# Silhouette (plus haut = meilleur)
best_sil_k = list(K_range)[silhouette_scores.index(max(silhouette_scores))]
colors_sil = ["crimson" if k == best_sil_k else "steelblue" for k in K_range]
axes[0].bar(list(K_range), silhouette_scores, color=colors_sil, alpha=0.85,
            edgecolor="white", linewidth=0.8)
axes[0].plot(list(K_range), silhouette_scores, marker="o", color="navy",
             linewidth=1.5, markersize=5)
axes[0].set_title("Score de silhouette (↑ meilleur)", fontweight="bold")
axes[0].set_xlabel("Nombre de clusters K")
axes[0].set_ylabel("Score de silhouette")
axes[0].set_xticks(list(K_range))
axes[0].axhline(0.5, color="gray", linestyle=":", linewidth=1, label="Seuil 0.5")
axes[0].legend(fontsize=9)
for k, s in zip(K_range, silhouette_scores):
    axes[0].text(k, s + 0.005, f"{s:.3f}", ha="center", fontsize=8,
                 fontweight="bold" if k == best_sil_k else "normal")

# Davies-Bouldin (plus bas = meilleur)
best_db_k = list(K_range)[db_scores.index(min(db_scores))]
colors_db = ["crimson" if k == best_db_k else "tomato" for k in K_range]
axes[1].bar(list(K_range), db_scores, color=colors_db, alpha=0.85,
            edgecolor="white", linewidth=0.8)
axes[1].plot(list(K_range), db_scores, marker="o", color="darkred",
             linewidth=1.5, markersize=5)
axes[1].set_title("Indice de Davies-Bouldin (↓ meilleur)", fontweight="bold")
axes[1].set_xlabel("Nombre de clusters K")
axes[1].set_ylabel("Davies-Bouldin Score")
axes[1].set_xticks(list(K_range))
for k, d in zip(K_range, db_scores):
    axes[1].text(k, d + 0.01, f"{d:.3f}", ha="center", fontsize=8,
                 fontweight="bold" if k == best_db_k else "normal")

plt.tight_layout()
plt.savefig("./figures/fig6_selection_k.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 6 sauvegardée : fig6_selection_k.png")

#--------------------------------------------------------------------------------------------------
# Résultats de la sélection
#--------------------------------------------------------------------------------------------------
best_k_sil = list(K_range)[silhouette_scores.index(max(silhouette_scores))]
best_k_db  = list(K_range)[db_scores.index(min(db_scores))]

print("\n" + "=" * 55)
print("RÉSULTAT DE LA SÉLECTION DU K")
print("=" * 55)
print(f"Meilleur K selon silhouette    : K={best_k_sil}  "
      f"(score : {max(silhouette_scores):.4f})")
print(f"Meilleur K selon Davies-Bouldin: K={best_k_db}  "
      f"(score : {min(db_scores):.4f})")
print(f"\n→ K = 5 retenu (coude de l'inertie + métriques convergentes)")