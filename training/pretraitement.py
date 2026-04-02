#--------------------------------------------------------------------------------------------------
#PROJET INF1683
#Étape 2: Pré-traitement des données
#--------------------------------------------------------------------------------------------------
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib

#-------------------------------------------------------------------------------------------------
#Loading
#--------------------------------------------------------------------------------------------------
df = pd.read_csv("./docs/Mall_Customers.csv")
print("Dataset originel :")
print(df.head())

#--------------------------------------------------------------------------------------------------
#Suppression
#--------------------------------------------------------------------------------------------------
df = df.drop(columns=["CustomerID"]) #C'est un identifiant unique, il n'apportera rien durant l'entraînement
print("\nAprès suppresion")
print(df.head())

#--------------------------------------------------------------------------------------------------
#Encodage
#--------------------------------------------------------------------------------------------------
#Les algos travaillent soit avec les floats ou des integers
df["Genre"] = df["Genre"].map({"Female": 0,"Male": 1})
print("\nAprès encodage, Female = 0 et Male = 1")
print(df.head())

#--------------------------------------------------------------------------------------------------
#Normalisation
#--------------------------------------------------------------------------------------------------
#On effectue la normalisation pour que les valeurs plus élevées ne dominent pas lors du calcul
#des distances pour K-Means et le regroupement hiérarchique
scaler = StandardScaler()
cols_a_normaliser = ["Age", "Annual Income (k$)", "Spending Score (1-100)"]

df_scaled = df.copy()
df_scaled[cols_a_normaliser] = scaler.fit_transform(df[cols_a_normaliser])

print("\nAprès normalisation (StandardScaler) :")
print(df_scaled.head())

print("\nVérification -- moyennes (doivent être ~0) :")
print(df_scaled[cols_a_normaliser].mean().round(6))
print("\nVérification -- écarts-types (doivent être ~1) :")
print(df_scaled[cols_a_normaliser].std().round(6))

#--------------------------------------------------------------------------------------------------
#Sauvegarde du nouveau dataset
#--------------------------------------------------------------------------------------------------
df_scaled.to_csv("./docs/Mall_Customers_post_traitement.csv", index=False)
print("\nDataset prétraité sauvegardé")

#Sauvegarde du scaler pour produire le dataset original et faire l'interprétation des clusters
joblib.dump(scaler, "./training/scaler.pkl")
print("Scaler sauvegardé : scaler.pkl")

#--------------------------------------------------------------------------------------------------
#Résumé
#--------------------------------------------------------------------------------------------------
print("\n" + "=" * 50)
print("RÉSUMÉ DU PRÉTRAITEMENT")
print("=" * 50)
print(f"Colonnes conservées   : {list(df_scaled.columns)}")
print(f"Lignes                : {df_scaled.shape[0]}")
print(f"Valeurs manquantes    : {df_scaled.isnull().sum().sum()}")
print("\nDataset prêt pour le clustering ✅")
