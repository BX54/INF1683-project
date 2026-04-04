#--------------------------------------------------------------------------------------------------
# Projet INF1683
# Étape 3b : Entraînement final — K-Means (K=5)
# Mall Customer Segmentation
#
# Ce script entraîne le modèle K-Means final avec K=5 (déterminé à l'étape précédente)
# et produit toutes les figures et métriques nécessaires au rapport + à la comparaison
# avec le clustering hiérarchique du binôme.
#--------------------------------------------------------------------------------------------------

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score, silhouette_samples

sns.set_theme(style="whitegrid")

#--------------------------------------------------------------------------------------------------
# Chargement des données
#--------------------------------------------------------------------------------------------------
df_scaled   = pd.read_csv("./docs/Mall_Customers_post_traitement.csv")
scaler      = joblib.load("./training/scaler.pkl")
df_original = pd.read_csv("./docs/Mall_Customers.csv").drop(columns=["CustomerID"])

print("Dataset prétraité chargé :")
print(df_scaled.head())

X = df_scaled.values

#--------------------------------------------------------------------------------------------------
# Entraînement du modèle K-Means final
#--------------------------------------------------------------------------------------------------
K_FINAL = 5

# K-Means++ : initialisation intelligente des centroïdes
# n_init=10  : 10 lancements différents, on garde le résultat avec la meilleure inertie
# random_state=42 : reproductibilité
model_final = KMeans(
    n_clusters=K_FINAL,
    init="k-means++",
    n_init=10,
    max_iter=300,
    tol=1e-4,
    random_state=42
)
labels = model_final.fit_predict(X)

df_scaled["Cluster"]   = labels
df_original["Cluster"] = labels

print(f"\nNombre de clients par cluster (K={K_FINAL}) :")
print(df_original["Cluster"].value_counts().sort_index())
print(f"\nConvergence en {model_final.n_iter_} itérations")
print(f"Inertie finale (WCSS) : {model_final.inertia_:.4f}")

#--------------------------------------------------------------------------------------------------
# Figure 7 — Visualisation des clusters (3 projections 2D)
#--------------------------------------------------------------------------------------------------
palette = sns.color_palette("tab10", K_FINAL)
noms_clusters = {
    0: "C0", 1: "C1", 2: "C2", 3: "C3", 4: "C4"
}

fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle(f"Clusters K-Means (K={K_FINAL}, init=K-Means++)",
             fontsize=14, fontweight="bold")

pairs = [
    ("Annual Income (k$)", "Spending Score (1-100)"),
    ("Age",                "Spending Score (1-100)"),
    ("Age",                "Annual Income (k$)"),
]

for ax, (x_col, y_col) in zip(axes, pairs):
    for cid in range(K_FINAL):
        mask = df_original["Cluster"] == cid
        ax.scatter(
            df_original.loc[mask, x_col],
            df_original.loc[mask, y_col],
            label=f"Cluster {cid}",
            alpha=0.75,
            color=palette[cid],
            s=60,
            edgecolors="white",
            linewidths=0.5
        )
    # Centroïdes dans l'espace original (inverse_transform)
    centroids_orig = scaler.inverse_transform(
        model_final.cluster_centers_[:, :3]   # Age, Income, Score (sans Genre)
    )
    col_idx = {
        "Age": 0, "Annual Income (k$)": 1, "Spending Score (1-100)": 2
    }
    cx = centroids_orig[:, col_idx[x_col]]
    cy = centroids_orig[:, col_idx[y_col]]
    ax.scatter(cx, cy, s=220, c="black", marker="X", zorder=5,
               edgecolors="white", linewidths=1, label="Centroïdes")
    ax.set_xlabel(x_col,  fontweight="bold")
    ax.set_ylabel(y_col, fontweight="bold")
    ax.set_title(f"{x_col} vs {y_col}", fontweight="bold")
    ax.legend(fontsize=8)

plt.tight_layout()
plt.savefig("./figures/fig7_clusters_kmeans.png", dpi=150, bbox_inches="tight")
plt.close()
print("\n✅ Figure 7 sauvegardée : fig7_clusters_kmeans.png")

#--------------------------------------------------------------------------------------------------
# Figure 8 — Diagramme de silhouette
#--------------------------------------------------------------------------------------------------
sil_vals = silhouette_samples(X, labels)

fig, ax = plt.subplots(figsize=(9, 6))
y_lower = 10
for cid in range(K_FINAL):
    c_sil  = np.sort(sil_vals[labels == cid])
    n_c    = c_sil.shape[0]
    y_upper = y_lower + n_c
    ax.fill_betweenx(np.arange(y_lower, y_upper), 0, c_sil,
                     facecolor=palette[cid], edgecolor="none", alpha=0.85)
    ax.text(-0.05, y_lower + 0.5 * n_c, f"C{cid} (n={n_c})",
            ha="right", va="center", fontsize=9)
    y_lower = y_upper + 10

sil_moy = silhouette_score(X, labels)
ax.axvline(sil_moy, color="red", linestyle="--", linewidth=1.8,
           label=f"Silhouette moyenne = {sil_moy:.4f}")
ax.set_title(f"Diagramme de silhouette — K-Means (K={K_FINAL})",
             fontsize=13, fontweight="bold")
ax.set_xlabel("Coefficient de silhouette")
ax.set_ylabel("Clients regroupés par cluster")
ax.set_xlim(-0.25, 1.0)
ax.legend(fontsize=10)
plt.tight_layout()
plt.savefig("./figures/fig8_silhouette.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 8 sauvegardée : fig8_silhouette.png")

#--------------------------------------------------------------------------------------------------
# Figure 9 — Heatmap des profils moyens (centroïdes, valeurs originales)
#--------------------------------------------------------------------------------------------------
cols_num = ["Age", "Annual Income (k$)", "Spending Score (1-100)"]
profil_num = df_original.groupby("Cluster")[cols_num].mean().round(1)

fig, ax = plt.subplots(figsize=(9, 4))
sns.heatmap(profil_num, annot=True, fmt=".1f", cmap="YlOrRd",
            linewidths=0.5, ax=ax, annot_kws={"size": 11, "weight": "bold"})
ax.set_title("Heatmap des profils moyens par cluster (valeurs originales)",
             fontsize=12, fontweight="bold")
ax.set_yticklabels([f"Cluster {i}" for i in range(K_FINAL)], rotation=0)
ax.set_xticklabels(["Âge", "Revenu (k$)", "Score dépenses"], rotation=0)
plt.tight_layout()
plt.savefig("./figures/fig9_heatmap_profils.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 9 sauvegardée : fig9_heatmap_profils.png")

#--------------------------------------------------------------------------------------------------
# Interprétation des clusters
#--------------------------------------------------------------------------------------------------
cols_num = ["Age", "Annual Income (k$)", "Spending Score (1-100)"]
profils = df_original.groupby("Cluster")[cols_num].mean().round(2)
profils["% Femmes"] = df_original.groupby("Cluster")["Genre"].apply(
    lambda x: f"{(x == 'Female').mean():.0%}"
)
profils["Taille"] = df_original["Cluster"].value_counts().sort_index()

print("\n" + "=" * 65)
print("PROFIL MOYEN PAR CLUSTER")
print("=" * 65)
print(profils.to_string())

#--------------------------------------------------------------------------------------------------
# Métriques finales
#--------------------------------------------------------------------------------------------------
sil_final = silhouette_score(X, labels)
db_final  = davies_bouldin_score(X, labels)

print("\n" + "=" * 65)
print(f"MÉTRIQUES FINALES — K-Means (K={K_FINAL})")
print("=" * 65)
print(f"Score de silhouette    : {sil_final:.4f}  (entre -1 et 1, plus haut = meilleur)")
print(f"Davies-Bouldin Index   : {db_final:.4f}  (plus bas = meilleur)")
print(f"Inertie WCSS           : {model_final.inertia_:.4f}")
print(f"Itérations             : {model_final.n_iter_}")
print(f"\n→ Ces scores seront comparés avec ceux du clustering hiérarchique !")

#--------------------------------------------------------------------------------------------------
# Sauvegarde du modèle
#--------------------------------------------------------------------------------------------------
joblib.dump(model_final, "./training/kmeans_final.pkl")
print(f"\nModèle K-Means sauvegardé : ./training/kmeans_final.pkl ✅")

#--------------------------------------------------------------------------------------------------
# Export des métriques (pour la section comparaison du rapport)
#--------------------------------------------------------------------------------------------------
import json
resultats = {
    "modele": "K-Means",
    "K": K_FINAL,
    "init": "k-means++",
    "n_init": 10,
    "random_state": 42,
    "silhouette": round(sil_final, 4),
    "davies_bouldin": round(db_final, 4),
    "wcss": round(model_final.inertia_, 4),
    "n_iter": model_final.n_iter_,
    "profils": profils.to_dict()
}
with open("./training/resultats_kmeans.json", "w") as f:
    json.dump(resultats, f, indent=2, ensure_ascii=False)
print("Résultats exportés : ./training/resultats_kmeans.json ✅")