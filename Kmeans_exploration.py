#--------------------------------------------------------------------------------------------------
# Projet INF1683
# Étape 1 : Exploration des données
# Mall Customer Segmentation — K-Means Clustering
#--------------------------------------------------------------------------------------------------

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_theme(style="whitegrid")
plt.rcParams["figure.figsize"] = (10, 6)

#--------------------------------------------------------------------------------------------------
# Chargement des données
#--------------------------------------------------------------------------------------------------
df = pd.read_csv("./docs/Mall_Customers.csv")

print("=" * 55)
print("APERÇU DU DATASET")
print("=" * 55)
print(df.head(10))

#--------------------------------------------------------------------------------------------------
# Informations générales
#--------------------------------------------------------------------------------------------------
print("\n--- Dimensions ---")
print(f"Nombre de clients  : {df.shape[0]}")
print(f"Nombre de colonnes : {df.shape[1]}")

print("\n--- Types de colonnes ---")
print(df.dtypes)

print("\n--- Valeurs manquantes ---")
print(df.isnull().sum())

print("\n--- Doublons ---")
print(f"Nombre de lignes dupliquées : {df.duplicated().sum()}")

#--------------------------------------------------------------------------------------------------
# Statistiques descriptives
#--------------------------------------------------------------------------------------------------
print("\n--- Statistiques descriptives ---")
print(df.describe().round(2))

print("\n--- Répartition par genre ---")
print(df["Genre"].value_counts())
print(df["Genre"].value_counts(normalize=True).apply(lambda x: f"{x:.1%}"))

#--------------------------------------------------------------------------------------------------
# Figure 1 — Distribution des variables numériques
#--------------------------------------------------------------------------------------------------
fig, axes = plt.subplots(1, 3, figsize=(16, 5))
fig.suptitle("Distribution des variables numériques", fontsize=14, fontweight="bold")

variables = {
    "Age": "Âge (années)",
    "Annual Income (k$)": "Revenu annuel (k$)",
    "Spending Score (1-100)": "Score de dépenses",
}

for ax, (col, label) in zip(axes, variables.items()):
    sns.histplot(df[col], bins=20, kde=True, ax=ax, color="steelblue", alpha=0.8)
    ax.axvline(df[col].mean(),   color="red",    linestyle="--", linewidth=1.5,
               label=f"Moy. {df[col].mean():.1f}")
    ax.axvline(df[col].median(), color="orange", linestyle=":",  linewidth=1.5,
               label=f"Méd. {df[col].median():.1f}")
    ax.set_title(label, fontweight="bold")
    ax.set_xlabel("")
    ax.legend(fontsize=8)

plt.tight_layout()
plt.savefig("./figures/fig1_distributions.png", dpi=150, bbox_inches="tight")
plt.close()
print("\n✅ Figure 1 sauvegardée : fig1_distributions.png")

#--------------------------------------------------------------------------------------------------
# Figure 2 — Répartition par genre + Boxplots par genre
#--------------------------------------------------------------------------------------------------
fig, axes = plt.subplots(1, 4, figsize=(20, 5))
fig.suptitle("Analyse par genre", fontsize=14, fontweight="bold")

# Camembert
counts = df["Genre"].value_counts()
axes[0].pie(counts, labels=counts.index, autopct="%1.1f%%",
            colors=["#FF9999", "#67A3FF"], startangle=90)
axes[0].set_title("Répartition par genre")

# Boxplots
palette_genre = {"Male": "#67A3FF", "Female": "#FF9999"}
for ax, col in zip(axes[1:], ["Age", "Annual Income (k$)", "Spending Score (1-100)"]):
    sns.boxplot(data=df, x="Genre", y=col, palette=palette_genre, ax=ax, width=0.5)
    ax.set_xlabel("")
    ax.set_title(f"{col}", fontweight="bold")

plt.tight_layout()
plt.savefig("./figures/fig2_genre.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 2 sauvegardée : fig2_genre.png")

#--------------------------------------------------------------------------------------------------
# Figure 3 — Scatterplots (relations entre variables)
#--------------------------------------------------------------------------------------------------
fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle("Relations entre variables (par genre)", fontsize=14, fontweight="bold")

palette_genre = {"Male": "#67A3FF", "Female": "#FF9999"}
pairs = [
    ("Annual Income (k$)", "Spending Score (1-100)"),
    ("Age", "Spending Score (1-100)"),
    ("Age", "Annual Income (k$)"),
]

for ax, (x, y) in zip(axes, pairs):
    sns.scatterplot(data=df, x=x, y=y, hue="Genre",
                    palette=palette_genre, alpha=0.75, ax=ax)
    ax.set_title(f"{x} vs {y}", fontweight="bold")

plt.tight_layout()
plt.savefig("./figures/fig3_scatterplots.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 3 sauvegardée : fig3_scatterplots.png")

#--------------------------------------------------------------------------------------------------
# Figure 4 — Matrice de corrélation
#--------------------------------------------------------------------------------------------------
df_corr = df.copy()
df_corr["Genre"] = df_corr["Genre"].map({"Male": 1, "Female": 0})
df_corr = df_corr.drop(columns=["CustomerID"])

fig, ax = plt.subplots(figsize=(7, 5))
sns.heatmap(df_corr.corr(), annot=True, fmt=".2f", cmap="coolwarm",
            vmin=-1, vmax=1, ax=ax, linewidths=0.5,
            annot_kws={"size": 11, "weight": "bold"})
ax.set_title("Matrice de corrélation", fontsize=13, fontweight="bold")
plt.tight_layout()
plt.savefig("./figures/fig4_correlation.png", dpi=150, bbox_inches="tight")
plt.close()
print("✅ Figure 4 sauvegardée : fig4_correlation.png")

#--------------------------------------------------------------------------------------------------
# Résumé des observations clés
#--------------------------------------------------------------------------------------------------
print("\n" + "=" * 55)
print("RÉSUMÉ DES OBSERVATIONS CLÉS")
print("=" * 55)

cols_num = ["Age", "Annual Income (k$)", "Spending Score (1-100)"]
for col in cols_num:
    print(f"\n{col} :")
    print(f"  Moyenne    : {df[col].mean():.2f}")
    print(f"  Médiane    : {df[col].median():.2f}")
    print(f"  Écart-type : {df[col].std():.2f}")
    print(f"  Min / Max  : {df[col].min()} / {df[col].max()}")

corr_matrix = df_corr.corr()
print(f"\nCorrélation Age / Score de dépenses : "
      f"{corr_matrix.loc['Age','Spending Score (1-100)']:.3f}")
print(f"Corrélation Revenu / Score de dépenses : "
      f"{corr_matrix.loc['Annual Income (k$)','Spending Score (1-100)']:.3f}")
print("\nExploration terminée ✅")