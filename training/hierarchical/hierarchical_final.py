#--------------------------------------------------------------------------------------------------
#Projet INF1683
#Entraînement: K final
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

#On garde le dataset originel pour l'interprétation finale
df_original = pd.read_csv("./docs/Mall_Customers.csv").drop(columns=["CustomerID"])
df_original["Genre"] = df_original["Genre"].map({"Female": 0, "Male": 1})

print("Dataset prétraité chargé :")
print(df_scaled.head())

X = df_scaled.values

#--------------------------------------------------------------------------------------------------
#Entraînement du modèle final
#--------------------------------------------------------------------------------------------------
K_final = 6 #Résultat obtenu à travers les figures générées par hierarchical_selection_k.py. Le score
            #de silhouette est de 6 et l'index de DB est de 9, mais la différence entre 6 et 9 sur
            #l'index est très minime, d'où le choix de garder K final à 6.

model_final = AgglomerativeClustering(n_clusters=K_final, linkage="ward")
labels = model_final.fit_predict(X)

df_scaled["Cluster"] = labels
df_original["Cluster"] = labels
np.save("./training/hierarchical/labels_hierarchical.npy", labels) #Sauvegarde des labels pour la comparaison avec K-Means

print(f"\nNombre de clients par cluster (K={K_final}) :")
print(df_original["Cluster"].value_counts().sort_index())

#--------------------------------------------------------------------------------------------------
#Visualisation des clusters
#--------------------------------------------------------------------------------------------------
palette = sns.color_palette("tab10", K_final)

fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle(f"Clusters hiérarchiques (K={K_final}, linkage=Ward)", fontsize=14, fontweight="bold")

pairs = [
    ("Annual Income (k$)", "Spending Score (1-100)"),
    ("Age", "Spending Score (1-100)"),
    ("Age", "Annual Income (k$)"),
]

for ax, (x, y) in zip(axes, pairs):
    for cluster_id in range(K_final):
        mask = df_original["Cluster"] == cluster_id
        ax.scatter(
            df_original.loc[mask, x],
            df_original.loc[mask, y],
            label=f"Cluster {cluster_id}",
            alpha=0.7,
            color=palette[cluster_id]
        )
    ax.set_xlabel(x)
    ax.set_ylabel(y)
    ax.set_title(f"{x} vs {y}")
    ax.legend(fontsize=8)

plt.tight_layout()
plt.savefig("./training/hierarchical/clusters_hierarchique.png", dpi=300)
plt.close()

#--------------------------------------------------------------------------------------------------
#Interprétation des clusters
#--------------------------------------------------------------------------------------------------
#Moyenne de chaque variable par cluster
#Le calcul est effectué sur les données non normalisées
cols_interpretables = ["Age", "Annual Income (k$)", "Spending Score (1-100)", "Genre"]
profils = df_original.groupby("Cluster")[cols_interpretables].mean().round(2)
profils["Genre"] = profils["Genre"].map(lambda x: f"{x:.0%} Male")
profils["Taille"] = df_original["Cluster"].value_counts().sort_index()

print("\n" + "=" * 60)
print("PROFIL MOYEN PAR CLUSTER")
print("=" * 60)
print(profils.to_string())

#--------------------------------------------------------------------------------------------------
#Métriques finales
#--------------------------------------------------------------------------------------------------
sil_final = silhouette_score(X, labels)
db_final = davies_bouldin_score(X, labels)

print("\n" + "=" * 60)
print(f"MÉTRIQUES FINALES (K={K_final})")
print("=" * 60)
print(f"Score de silhouette : {sil_final:.4f}  (entre -1 et 1, plus haut = meilleur)")
print(f"Davies-Bouldin Index: {db_final:.4f}  (plus bas = meilleur)")