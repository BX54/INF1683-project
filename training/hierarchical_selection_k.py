#--------------------------------------------------------------------------------------------------
#PROJET INF1683
#Entraînement: regroupement hiérarchique
#--------------------------------------------------------------------------------------------------
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score, davies_bouldin_score
from scipy.cluster.hierarchy import dendrogram, linkage

sns.set_theme(style="whitegrid")

#--------------------------------------------------------------------------------------------------
#Chargement des données
#--------------------------------------------------------------------------------------------------
df_scaled = pd.read_csv("./docs/Mall_Customers_post_traitement.csv")
scaler = joblib.load("scaler.pkl")

#On garde le dataset originel pour l'interprétation final
df_original = pd.read_csv("./docs/Mall_Customers.csv").drop(columns=["CustomerID"])

print("Dataset prétraité chargé :")
print(df_scaled.head())

X = df_scaled.values

#--------------------------------------------------------------------------------------------------
#Dendogramme
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
    color_threshold=8
)
ax.set_title("Dendrogramme - Clustering Hiérarchique (Ward)", fontsize=14, fontweight="bold")
ax.set_xlabel("Clients (regroupés)")
ax.set_ylabel("Distance de fusion (Ward)")
ax.axhline(y=8, color="red", linestyle="--", linewidth=1.5, label="Coupe suggérée")
ax.legend()
plt.tight_layout()
plt.savefig("./training/dendrogramme.png", dpi=300)
plt.close()

#--------------------------------------------------------------------------------------------------
#Sélection du K
#--------------------------------------------------------------------------------------------------
#Test du K de 2 à 10
silhouette_scores = []
db_scores = []
K_range = range(2, 11)

for k in K_range:
    model = AgglomerativeClustering(n_clusters=k, linkage="ward")
    labels = model.fit_predict(X)
    silhouette_scores.append(silhouette_score(X, labels))
    db_scores.append(davies_bouldin_score(X, labels))

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle("Sélection du nombre de clusters K", fontsize=14, fontweight="bold")

axes[0].plot(K_range, silhouette_scores, marker="o", color="steelblue")
axes[0].set_title("Score de silhouette (plus haut = meilleur)")
axes[0].set_xlabel("Nombre de clusters K")
axes[0].set_ylabel("Score de silhouette")
axes[0].set_xticks(list(K_range))

axes[1].plot(K_range, db_scores, marker="o", color="tomato")
axes[1].set_title("Davies-Bouldin Index (plus bas = meilleur)")
axes[1].set_xlabel("Nombre de clusters K")
axes[1].set_ylabel("Davies-Bouldin Score")
axes[1].set_xticks(list(K_range))

plt.tight_layout()
plt.savefig("selection_k_hierarchique.png", dpi=300)
plt.close()

# Affichage du meilleur K selon chaque métrique
best_k_silhouette = list(K_range)[silhouette_scores.index(max(silhouette_scores))]
best_k_db = list(K_range)[db_scores.index(min(db_scores))]
print(f"\nMeilleur K selon silhouette : {best_k_silhouette} (score : {max(silhouette_scores):.4f})")
print(f"Meilleur K selon Davies-Bouldin : {best_k_db} (score : {min(db_scores):.4f})")
