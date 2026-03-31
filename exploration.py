#--------------------------------------------------------------------------------------------------
#PROJET INF1683
#Étape 1 : Exploration des données
#--------------------------------------------------------------------------------------------------

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_theme(style="whitegrid")
plt.rcParams["figure.figsize"] = (10, 6)

#--------------------------------------------------------------------------------------------------
#Chargement des données
#--------------------------------------------------------------------------------------------------
df = pd.read_csv("Mall_Customers.csv")

print("=" * 50)
print("APERÇU DU DATASET")
print("=" * 50)
print(df.head(10))

#--------------------------------------------------------------------------------------------------
#Infos générales sur les données
#--------------------------------------------------------------------------------------------------

print("\n--- Dimensions ---")
print(f"Nombre de clients : {df.shape[0]}")
print(f"Nombre de colonnes : {df.shape[1]}")

print("\n--- Type de colonnes ---")
print(df.dtypes)

print("\n--- Valeurs manquantes ---")
print(df.isnull().sum())

print("\n--- Doublons ---")
print(f"Nombre de lignes dupliquées : {df.duplicated().sum()}")

#--------------------------------------------------------------------------------------------------
#Statistiques descriptives du dataset
#--------------------------------------------------------------------------------------------------

print("\n--- Statistiques descriptives ---")
print(df.describe()) #affiche les valeurs min, max, moy et écart-type

print("\n--- Répartition par genre ---")
print(df["Genre"].value_counts())
print(df["Genre"].value_counts(normalize=True).apply(lambda x: f"{x:.1%}"))

#--------------------------------------------------------------------------------------------------
#Visualisations
#--------------------------------------------------------------------------------------------------

#Distribution des valeurs numériques
fig, axes = plt.subplots(1, 3, figsize=(16, 5))
fig.suptitle("Distribution des valeurs numériques", fontsize=14, fontweight="bold")

variables = {
    "Age": "Age (années)",
    "Annual Income (k$)": "Revenu annuel (k$)",
    "Spending Score (1-100)": "Score de dépenses (1-99)",
}

for ax, (col, label) in zip(axes, variables.items()):
    sns.histplot(df[col], bins=45, kde=True, ax=ax, col="steelblue")
    ax.set_title(label)
    ax.set_xlabel("")

plt.tight_layout()
plt.savefig("dist_variables.png", dpi=300)
plt.show()

#Répartition par genre
fig, ax = plt.subplots(figsize=(5, 5))
df["Genre"].value_counts().plot.pie(
    autopct="%1.1f%%",
    colors=["#FF9999", "#67A3FF"],
    startangle=90,
    ax=ax
)
ax.set_title("Répartition par genre")
ax.set_ylabel("")
plt.savefig("repartition_genre.png", dpi=300)
plt.show()

#Boxplot par genre
fig, axes = plt.subplots(1, 3, figsize=(16, 5))
fig.suptitle("Distribution des variables selon le genre", fontsize=14, fontweight="bold")

for ax, col in zip(axes, ["Age", "Annual Income (k$)", "Spending Score (1-100)"]):
    sns.boxplot(data=df, x="Genre", y=col, palette="pastel", ax=ax)
    ax.set_xlabel("")

plt.tight_layout()
plt.savefig("boxplots_genre.png", dpi=300)
plt.show()

#Scatterplots
fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle("Relations entre variables (par genre)")

palette = {"Male": "#67A3FF", "Female": "#FF9999"}

pairs = [
    ("Annual Income (k$)", "Spending Score (1-100)"),
    ("Age", "Spending Score (1-100)"),
    ("Age", "Annual Income (k$)"),
]

for ax, (x, y) in zip(axes, pairs):
    sns.scatterplot(data=df, x=x, y=y, hue="Genre", palette=palette, alpha=0.7, ax=ax)
    ax.set_title(f"{x} vs {y}")

plt.tight_layout()
plt.savefig("scatterplots.png", dpi=300)
plt.show()

#Matrice de corrélation
#---Encodage du genre en valeur numérique
#---Retrait du customer ID
df_corr = df.copy()
df_corr["Genre"] = df_corr["Genre"].map({"Male": 0, "Female": 1})
df_corr = df_corr.drop(columns=["CustomerID"])

fig, ax = plt.subplots(figsize=(7, 5))
sns.heatmap(
    df_corr.corr(),
    annot=True,
    fmt=".2f",
    cmap="coolwarm",
    vmin=-1, vmax=1,
    ax=ax
)
ax.set_title("Matrice de corrélation")
plt.tight_layout()
plt.savefig("correlation.png", dpi=150)
plt.show()

#--------------------------------------------------------------------------------------------------
#Sommaire des observations
#--------------------------------------------------------------------------------------------------

print("\n" + "=" * 50)
print("RÉSUMÉ DES OBSERVATIONS CLÉS")
print("=" * 50)

cols_num = ["Age", "Annual Income (k$)", "Spending Score (1-100)"]
for col in cols_num:
    print(f"\n{col} :")
    print(f"  Moyenne : {df[col].mean():.1f}")
    print(f"  Médiane : {df[col].median():.1f}")
    print(f"  Écart-type : {df[col].std():.1f}")
    print(f"  Min / Max : {df[col].min()} / {df[col].max()}")
