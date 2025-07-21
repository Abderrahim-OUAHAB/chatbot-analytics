from enum import Enum
from typing import Dict, List, Optional, Union, Tuple
from pydantic import BaseModel, Field, validator
from datetime import datetime

class GitHubQueryType(str, Enum):
    """Types de requêtes spécifiques à l'analyse GitHub"""
    COMPARE = "compare"      # Comparaisons entre dépôts/développeurs
    TREND = "trend"         # Analyses temporelles
    QUALITY = "quality"     # Qualité du code
    CI_CD = "ci_cd"        # Intégration continue
    ACTIVITY = "activity"   # Activité globale
    NETWORK = "network"    # Relations entre dépôts
    STATS = "stats"        # Statistiques de base
    UNKNOWN = "unknown"    # Type inconnu

class GitHubChartType(str, Enum):
    """Types de visualisations pour les données GitHub"""
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    SCATTER = "scatter"
    RADAR = "radar"
    HEATMAP = "heatmap"
    TIMELINE = "timeline"
    REPO_NETWORK = "repo_network"
    CONTRIB_MATRIX = "contrib_matrix"

class TechDataset(BaseModel):
    """Dataset technique avec métadonnées GitHub"""
    label: str = Field(..., max_length=50)
    data: List[Union[int, float, Dict[str, Union[int, float]]]]
    tech_metadata: Optional[Dict[str, str]] = Field(
        default=None,
        description="Métadonnées techniques (langage, framework, etc.)"
    )

    @validator('data')
    def validate_data_size(cls, v):
        if len(v) > 100:
            raise ValueError("Dataset too large (max 100 items)")
        return v

class GitHubChartResponse(BaseModel):
    """Réponse de visualisation pour les données GitHub"""
    type: GitHubChartType
    title: str = Field(..., max_length=100)
    labels: List[str] = Field(..., min_items=1)
    datasets: List[TechDataset] = Field(..., min_items=1)
    tech_stack: Optional[List[str]] = None

    @validator('labels')
    def validate_labels_length(cls, v, values):
        if 'datasets' in values and len(v) != len(values['datasets'][0].data):
            raise ValueError("Labels length must match first dataset length")
        return v

class TechnicalAnalysis(BaseModel):
    """Analyse technique avec contexte GitHub"""
    summary: str = Field(..., min_length=10, max_length=1000)
    insights: List[str] = Field(..., min_items=1)
    confidence: float = Field(..., ge=0, le=1)
    generated_sql: Optional[str] = None

class GitHubQueryResult(BaseModel):
    """Résultat complet d'analyse GitHub"""
    visualization: Optional[GitHubChartResponse] = None
    analysis: Optional[TechnicalAnalysis] = None
    raw_data_sample: Optional[List[Dict]] = Field(
        None,
        description="Échantillon des données brutes utilisées"
    )

    @property
    def is_valid(self) -> bool:
        return self.visualization is not None or self.analysis is not None

    @validator('raw_data_sample')
    def validate_raw_data(cls, v):
        if v and len(v) > 10:
            raise ValueError("Raw data sample too large (max 10 items)")
        return v

class GitHubQuery(BaseModel):
    """Requête d'analyse GitHub"""
    prompt: str = Field(..., min_length=5)
    session_id: Optional[str] = Field(
        None,
        pattern=r'^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$'  # remplacé regex par pattern
    )
    query_type: GitHubQueryType = GitHubQueryType.UNKNOWN
    repos: Optional[List[str]] = Field(
        None,
        description="Filtre par dépôts spécifiques"
    )
    timeframe: Optional[Tuple[datetime, datetime]] = Field(
        None,
        description="Période d'analyse"
    )
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)  # ✅ Ajout du champ timestamp

    @validator('prompt')
    def validate_prompt(cls, v):
        if len(v.split()) < 2:
            raise ValueError("Query must contain at least 2 words")
        return v

class GitHubSessionState(BaseModel):
    """État de session pour l'analyse GitHub"""
    session_id: str
    history: List[Dict] = Field(default_factory=list)
    context_window: int = Field(default=5, ge=1, le=20)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    tech_context: Optional[Dict] = Field(
        None,
        description="Contexte technique persistant"
    )

    @validator('history')
    def validate_history_size(cls, v, values):
        if 'context_window' in values and len(v) > values['context_window']:
            raise ValueError("History exceeds context window size")
        return v
