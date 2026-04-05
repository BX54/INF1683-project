#--------------------------------------------------------------------------------------------------
# Projet INF1683
# Étape 2 : Prétraitement des données
# Mall Customer Segmentation — K-Means Clustering
#
# NOTE : Ce script produit le MÊME fichier prétraité que celui utilisé par
# le clustering hiérarchique (binôme), garantissant une comparaison équitable.
#--------------------------------------------------------------------------------------------------

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import joblib

#--------------------------------------------------------------------------------------------------
# Chargement
#--------------------------------------------------------------------------------------------------
df = pd.read_csv("./docs/Mall_Customers.csv")
print("Dataset original :")
print(df.head())
print(f"\nDimensions : {df.shape}")

#--------------------------------------------------------------------------------------------------
# Étape 1 — Suppression de l'identifiant
#--------------------------------------------------------------------------------------------------
# CustomerID est un identifiant unique sans valeur prédictive pour le clustering
df = df.drop(columns=["CustomerID"])
print("\nAprès suppression de CustomerID :")
print(df.head())

#--------------------------------------------------------------------------------------------------
# Étape 2 — Vérification qualité
#--------------------------------------------------------------------------------------------------
print("\n--- Valeurs manquantes ---")
print(df.isnull().sum())
assert df.isnull().sum().sum() == 0, "Des valeurs manquantes ont été détectées !"

print(f"\n--- Doublons : {df.duplicated().sum()} ---")
assert df.duplicated().sum() == 0, "Des doublons ont été détectés !"

print("Qualité des données : OK ✅")

#--------------------------------------------------------------------------------------------------
# Étape 3 — Encodage du genre
#--------------------------------------------------------------------------------------------------
# L'algorithme K-Means travaille uniquement avec des valeurs numériques
# Female = 0, Male = 1  (même convention que le binôme)
df["Genre"] = df["Genre"].map({"Female": 0, "Male": 1})
print("\nAprès encodage (Female=0, Male=1) :")
print(df.head())

#--------------------------------------------------------------------------------------------------
# Étape 4 — Normalisation (StandardScaler)
#--------------------------------------------------------------------------------------------------
# K-Means utilise la distance euclidienne → les variables à grande amplitude
# (revenu : 15–137) domineraient les variables à faible amplitude (score : 1–99)
# sans normalisation. Le StandardScaler ramène chaque variable à μ=0, σ=1.
#
# On n'applique PAS la normalisation au genre (variable binaire déjà en {0,1})
# pour rester cohérent avec le preprocessing du binôme.
scaler = StandardScaler()
cols_a_normaliser = ["Age", "Annual Income (k$)", "Spending Score (1-100)"]

df_scaled = df.copy()
df_scaled[cols_a_normaliser] = scaler.fit_transform(df[cols_a_normaliser])

print("\nAprès normalisation StandardScaler :")
print(df_scaled.head())

print("\nVérification — moyennes (doivent être ~0) :")
print(df_scaled[cols_a_normaliser].mean().round(6))

print("\nVérification — écarts-types (doivent être ~1) :")
print(df_scaled[cols_a_normaliser].std().round(6))

#--------------------------------------------------------------------------------------------------
# Sauvegarde
#--------------------------------------------------------------------------------------------------
# On utilise exactement le même nom de fichier que le binôme pour la comparaison
df_scaled.to_csv("./docs/Mall_Customers_post_traitement.csv", index=False)
print("\nDataset prétraité sauvegardé : ./docs/Mall_Customers_post_traitement.csv")

joblib.dump(scaler, "./training/scaler.pkl")
print("Scaler sauvegardé : ./training/scaler.pkl")

#--------------------------------------------------------------------------------------------------
# Résumé
#--------------------------------------------------------------------------------------------------
print("\n" + "=" * 50)
print("RÉSUMÉ DU PRÉTRAITEMENT")
print("=" * 50)
print(f"Colonnes conservées  : {list(df_scaled.columns)}")
print(f"Lignes               : {df_scaled.shape[0]}")
print(f"Colonnes normalisées : {cols_a_normaliser}")
print(f"Valeurs manquantes   : {df_scaled.isnull().sum().sum()}")
print(f"\nDataset prêt pour K-Means ✅")