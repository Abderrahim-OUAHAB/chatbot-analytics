import os
from dotenv import load_dotenv
from enum import Enum

# Chargement des variables d'environnement depuis le fichier .env
load_dotenv()

class GitHubChartType(Enum):
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    SCATTER = "scatter"
    RADAR = "radar"
    HEATMAP = "heatmap"
    TIMELINE = "timeline"
    REPO_NETWORK = "repo_network"

# Configuration Gemini (modèle et API)
GEMINI_MODEL_NAME = "gemini-2.0-flash-lite"
MAX_TOKENS = 4000  # Increased for better responses
TEMPERATURE = 0.7
TOP_P = 0.9
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")  # Récupéré depuis .env pour sécurité

# Chemins des données et vecteurs
VECTOR_STORE_PATH = "app/vectors/github_vectors"  # Dossier pour les embeddings GitHub


# Version API et limites
API_VERSION = "1.0.0"
RATE_LIMIT = 100  # Limite max de requêtes par minute (exemple)

# Prompt système pour guider la génération Gemini
SYSTEM_PROMPT = """Vous êtes un expert en analyse de données GitHub. Répondez toujours avec du JSON VALIDE :
{
  "chart": {
    "type": "bar|line|pie|scatter|radar|heatmap|timeline|repo_network", 
    "title": "Titre technique concis",
    "labels": ["Repo A", "Repo B"],
    "datasets": [{
      "label": "Métrique technique",
      "data": [valeurs],
      "tech_metadata": {}  // Optionnel
    }]
  },
  "sql": "SELECT...",  // Requête générée
  "analysis": "3-7 lignes d'observations techniques"
}

Règles techniques :
1. Types de graphiques :
   - bar : Comparaisons entre repos/développeurs
   - line : Tendances temporelles (commits, issues)
   - scatter : Corrélations (ex: temps de review vs taille PR)
   - heatmap : Activité par période/heure
   - repo_network : Relations entre dépôts
2. Structure stricte :
   - Pas de markdown dans le JSON
   - Tous les champs entre guillemets
3. Métriques valides :
   {available_metrics}
4. Pour les requêtes non-visuelles :
   {"analysis": "texte", "sql": "SELECT..."}
"""

# Exemples pour few-shot learning dans le prompt
FEW_SHOT_EXAMPLES = """
# Exemple 1 : Comparaison de repos
Utilisateur: "Compare les commits entre React et Vue"
{
  "chart": {
    "type": "bar",
    "title": "Commits mensuels (6 derniers mois)",
    "labels": ["React", "Vue"],
    "datasets": [
      {"label": "Moyenne commits/jour", "data": [42, 38]},
      {"label": "Développeurs actifs", "data": [15, 12]}
    ]
  },
  "sql": "SELECT repo, COUNT(*) FROM commits WHERE...",
  "analysis": "React montre 10% plus d'activité que Vue. L'équipe React compte 3 développeurs supplémentaires."
}

# Exemple 2 : Tendances
Utilisateur: "Évolution des temps de merge"
{
  "chart": {
    "type": "line",
    "title": "Temps moyen de merge (heures)",
    "labels": ["Jan", "Feb", "Mar", "Apr"],
    "datasets": [
      {"label": "Backend", "data": [8.2, 7.5, 6.9, 5.3]},
      {"label": "Frontend", "data": [5.1, 4.8, 6.2, 5.9]}
    ]
  },
  "sql": "SELECT month, AVG(merge_time)...",
  "analysis": "Amélioration constante du temps de merge backend (-35%). Frontend plus variable."
}

# Exemple 3 : Réponse textuelle
Utilisateur: "Qui a le plus contribué ce mois-ci ?"
{
  "analysis": "Top 3 contributeurs ce mois-ci :\n1. Alice (42 commits)\n2. Bob (38 commits)\n3. Charlie (29 commits)",
  "sql": "SELECT author, COUNT(*) FROM commits WHERE..."
}
"""

# Prompt pour gestion d’erreur et correction de JSON généré
RECOVERY_PROMPT = """
ERREUR TECHNIQUE : Réponse JSON invalide pour GitHub Analytics.
Corrigez avec cette structure exacte :

{
  "chart": {  // Optionnel
    "type": "{chart_type}",
    "title": "string", 
    "labels": ["string"],
    "datasets": [{
      "label": "string",
      "data": [numbers|objects],
      "tech_metadata": {}  // Optionnel
    }]
  },
  "sql": "string",  // Requête SQL générée
  "analysis": "string"  // 3-7 lignes
}

Erreurs détectées :
{errors}

Conseils techniques :
1. Pour les comparaisons : type="bar"
2. Pour les tendances : type="line" 
3. Pour les corrélations : type="scatter"
4. Évitez les blocs ```json
5. Validez les métriques techniques disponibles

Exemple corrigé :
{
  "chart": {
    "type": "heatmap",
    "title": "Activité horaire des commits",
    "labels": ["9h", "12h", "15h", "18h"],
    "datasets": [{
      "label": "Lundi",
      "data": [5, 12, 8, 3]
    }]
  },
  "sql": "SELECT HOUR(commit_time)...",
  "analysis": "Pic d'activité à midi (+140%)"
}
"""

# Prompt pour classifier les requêtes utilisateur
CLASSIFIER_PROMPT = """Analysez cette requête technique GitHub :
"{query}"

Catégories disponibles :
- compare (comparaisons)
- trend (tendances)
- quality (qualité de code)
- performance (metrics CI/CD)
- stats (statistiques)
- network (relations)

Répondez SEULEMENT par le terme approprié."""

# Configuration de recherche vectorielle
VECTOR_SEARCH_CONFIG = {
    "k": 5,  # Nombre de résultats
    "score_threshold": 0.65,
    "metadata_fields": [
        "repo_name", 
        "file_type",  # (code, issue, pr, etc.)
        "tech_stack",
        "date"
    ]
}

# Métriques GitHub valides à utiliser dans le système
AVAILABLE_METRICS = [
    "commits", "prs", "issues", 
    "merge_time", "review_comments",
    "code_coverage", "test_failures",
    "dependencies"
]

# Schéma attendu des données GitHub dans l’analyse
GITHUB_RESPONSE_SCHEMA = {
    "tables": ["commits", "pull_requests", "issues", "reviews"],
    "relationships": {
        "commits": ["repo_id", "author_id"],
        "pull_requests": ["base_repo_id", "head_repo_id"]
    }
}
