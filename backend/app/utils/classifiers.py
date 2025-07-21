import google.generativeai as genai
from enum import Enum
from typing import Dict, List
from app.config import (
    CLASSIFIER_PROMPT,
    GEMINI_API_KEY,
    GEMINI_MODEL_NAME,
    TEMPERATURE,
    MAX_TOKENS
)

# Configuration de l'API (fait une fois)
genai.configure(api_key=GEMINI_API_KEY)

class GitHubQueryType(Enum):
    """Types de requêtes spécifiques à GitHub"""
    COMPARE = "compare"       # Comparaisons entre dépôts/développeurs
    TREND = "trend"          # Analyses temporelles
    STATS = "stats"          # Statistiques de base
    CODE_QUALITY = "quality" # Qualité du code
    CI_CD = "ci_cd"          # Intégration continue
    ACTIVITY = "activity"    # Activité globale
    UNKNOWN = "unknown"      # Type inconnu

class QueryClassifier:
    def __init__(self):
        # Plus besoin de self.model
        self.keyword_mappings = {
            GitHubQueryType.COMPARE: [
                "compare", "vs", "versus", "difference between",
                "comparison", "contrast"
            ],
            GitHubQueryType.TREND: [
                "trend", "over time", "history", "evolution",
                "progress", "last month", "last year"
            ],
            GitHubQueryType.CODE_QUALITY: [
                "quality", "sonar", "bugs", "vulnerabilities",
                "code smells", "coverage", "technical debt"
            ],
            GitHubQueryType.CI_CD: [
                "ci", "cd", "pipeline", "build", "deploy",
                "github actions", "jenkins", "failed tests"
            ]
        }

    def classify_github_query(self, query: str) -> GitHubQueryType:
        """
        Classifie les requêtes techniques GitHub avec deux niveaux :
        1. Détection par mots-clés
        2. Modèle Gemini pour les cas complexes
        """
        query_lower = query.lower()
        
        # Détection par mots-clés
        for query_type, keywords in self.keyword_mappings.items():
            if any(f' {kw} ' in f' {query_lower} ' for kw in keywords):
                return query_type
                
        # Fallback AI
        return self._classify_with_ai(query)

    def _classify_with_ai(self, query: str) -> GitHubQueryType:
        """Utilise Gemini pour classification avancée"""
        try:
            prompt = self._build_github_prompt(query)
            response = genai.chat.completions.create(
                model=GEMINI_MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=TEMPERATURE,
                max_output_tokens=MAX_TOKENS,
                top_p=0.85
            )
            # Récupération du texte généré
            classification = response.choices[0].message.content.strip().lower()
            
            # Valide que la classification est dans l'enum, sinon UNKNOWN
            if classification in [e.value for e in GitHubQueryType]:
                return GitHubQueryType(classification)
            else:
                return GitHubQueryType.UNKNOWN
        except Exception as e:
            print(f"Classification error: {str(e)}")
            return GitHubQueryType.UNKNOWN

    def _build_github_prompt(self, query: str) -> str:
        """Construit un prompt technique spécifique à GitHub"""
        return f"""
{CLASSIFIER_PROMPT}

Contexte supplémentaire GitHub:
- Les requêtes peuvent concerner : commits, PRs, issues, reviews
- Les métriques incluent : temps de merge, taux de réouverture, coverage

Question: "{query}"

Répondez uniquement par un de ces termes:
- compare (comparaisons)
- trend (analyses temporelles) 
- quality (qualité de code)
- ci_cd (intégration continue)
- activity (activité globale)
- stats (statistiques de base)
- unknown
"""

# Singleton pattern
_github_classifier = QueryClassifier()

def classify_github_query(query: str) -> GitHubQueryType:
    """Interface publique pour la classification GitHub"""
    return _github_classifier.classify_github_query(query)

# Compatibilité ascendante (à supprimer après migration)
def classify_query(query: str) -> GitHubQueryType:
    """Alias pour compatibilité"""
    return classify_github_query(query)
