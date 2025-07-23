import os
from typing import List
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
import psycopg2
from dotenv import load_dotenv
from datetime import datetime
import google.generativeai as genai

# Charger les variables d'environnement (.env)
load_dotenv()

VECTOR_STORE_PATH = "app/vectors/github_vectors"
os.makedirs(VECTOR_STORE_PATH, exist_ok=True)

# Service de génération d'embeddings (mock pour Gemini)
class EmbeddingService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=api_key)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        return [
            genai.embed_content(
                model="models/embedding-001",
                content=t,
                task_type="retrieval_document"  # ou "retrieval_query" selon le cas
            )["embedding"]
            for t in texts
        ]

# Connexion PostgreSQL
def get_db_connection():
    return psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("POSTGRES_HOST")
    )

# Extraction des données GitHub de la base
def fetch_github_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Données repositories enrichies avec KPIs
    cursor.execute("""
        SELECT r.repo_id, r.name, r.language, r.url,
               COUNT(DISTINCT c.commit_id) as commit_count,
               AVG(k.pr_merge_time_avg) as avg_merge_time,
               AVG(k.reopened_issues) as avg_reopened_issues,
               AVG(k.review_delay_avg) as avg_review_delay,
               AVG(cq.coverage) as code_coverage,
               COUNT(DISTINCT cb.build_id) as total_builds,
               AVG(CASE WHEN cb.status = 'success' THEN 1.0 ELSE 0.0 END) * 100 as build_success_rate
        FROM repo_dim r
        LEFT JOIN commit_dim c ON r.repo_id = c.repo_id
        LEFT JOIN kpi_result k ON r.repo_id = k.repo_id
        LEFT JOIN code_quality cq ON r.repo_id = cq.repo_id
        LEFT JOIN ci_build cb ON r.repo_id = cb.repo_id
        GROUP BY r.repo_id, r.name, r.language, r.url
    """)
    repos = cursor.fetchall()

    # 2. Données d'activité par développeur
    cursor.execute("""
        SELECT u.user_id, u.login, u.name, r.name as repo_name,
               COUNT(DISTINCT c.commit_id) as commits,
               COUNT(DISTINCT pr.pull_request_id) as pull_requests,
               COUNT(DISTINCT i.issue_id) as issues_created,
               AVG(EXTRACT(epoch FROM (pr.merged_at - pr.created_at))/3600) as avg_pr_duration_hours
        FROM user_dim u
        LEFT JOIN commit_dim c ON u.user_id = c.author_id
        LEFT JOIN pull_request_dim pr ON u.user_id = pr.author_id
        LEFT JOIN issue_dim i ON u.user_id = i.author_id
        LEFT JOIN repo_dim r ON c.repo_id = r.repo_id OR pr.repo_id = r.repo_id
        WHERE c.commit_timestamp >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY u.user_id, u.login, u.name, r.name
        HAVING COUNT(DISTINCT c.commit_id) > 0
    """)
    developers = cursor.fetchall()

    # 3. Tendances temporelles (derniers 6 mois)
    cursor.execute("""
        SELECT r.name as repo_name,
               DATE_TRUNC('month', c.commit_timestamp) as month,
               COUNT(c.commit_id) as monthly_commits,
               COUNT(DISTINCT c.author_id) as active_developers
        FROM repo_dim r
        JOIN commit_dim c ON r.repo_id = c.repo_id
        WHERE c.commit_timestamp >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY r.name, DATE_TRUNC('month', c.commit_timestamp)
        ORDER BY month DESC
    """)
    trends = cursor.fetchall()
      # Issues
    cursor.execute("""
        SELECT i.issue_id, i.title, r.name as repo_name,
               array_to_string(i.labels, ', ') as labels
        FROM issue_dim i
        JOIN repo_dim r ON i.repo_id = r.repo_id
        LIMIT 1000
    """)
    issues = cursor.fetchall()
    
    # 4. Analyse qualité de code
    cursor.execute("""
        SELECT r.name as repo_name,
               AVG(cq.bugs) as avg_bugs,
               AVG(cq.vulnerabilities) as avg_vulnerabilities,
               AVG(cq.code_smells) as avg_code_smells,
               AVG(cq.coverage) as avg_coverage
        FROM repo_dim r
        JOIN code_quality cq ON r.repo_id = cq.repo_id
        WHERE cq.date_id >= (SELECT date_id FROM date_dim WHERE full_date >= CURRENT_DATE - INTERVAL '1 month' LIMIT 1)
        GROUP BY r.name
    """)
    quality_metrics = cursor.fetchall()

    # 5. KPIs critiques avec seuils
    cursor.execute("""
        SELECT r.name as repo_name,
               k.pr_merge_time_avg,
               k.reopened_issues,
               k.review_delay_avg,
               CASE 
                   WHEN k.pr_merge_time_avg > 72 THEN 'CRITICAL'
                   WHEN k.pr_merge_time_avg > 24 THEN 'WARNING' 
                   ELSE 'GOOD'
               END as merge_time_status,
               CASE 
                   WHEN k.reopened_issues > 5 THEN 'CRITICAL'
                   WHEN k.reopened_issues > 2 THEN 'WARNING'
                   ELSE 'GOOD'
               END as reopened_status
        FROM repo_dim r
        JOIN kpi_result k ON r.repo_id = k.repo_id
        WHERE k.date_id = (SELECT MAX(date_id) FROM kpi_result)
    """)
    kpi_status = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "repositories": repos,
        "issues": issues,  # garde l'existant
        "developers": developers,
        "trends": trends,
        "quality_metrics": quality_metrics,
        "kpi_status": kpi_status
    }

# Création des documents avec métadonnées enrichies
def create_documents(data):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=['\n\n', '```', '## ']
    )
    documents = []
    timestamp = datetime.utcnow().isoformat()

    for repo in data["repositories"]:
        (repo_id, name, language, url, commit_count, avg_merge_time,
 avg_reopened_issues, avg_review_delay, code_coverage,
 total_builds, build_success_rate) = repo

        content = f"""Repository: {name}
Language: {language}
URL: {url}
Total Commits: {commit_count}
Average Merge Time: {avg_merge_time:.2f} hours
Average Reopened Issues: {avg_reopened_issues:.2f}
Average Review Delay: {avg_review_delay:.2f} hours
Code Coverage: {code_coverage:.2f}%
Total CI Builds: {total_builds}
Build Success Rate: {build_success_rate:.2f}%
"""

        docs = text_splitter.split_text(content)
        for i, chunk in enumerate(docs):
            documents.append(Document(
                page_content=chunk,
                metadata={
                    "type": "repository",
                    "repo_id": str(repo_id),
                    "language": language,
                    "chunk_id": i,
                    "timestamp": timestamp
                }
            ))

    # Documents pour développeurs
    for dev in data["developers"]:
        user_id, login, name, repo_name, commits, prs, issues, avg_pr_duration = dev
        content = f"""Developer: {login} ({name})
                Repository: {repo_name}
                Commits (3 months): {commits}
                Pull Requests: {prs}
                Issues Created: {issues}
                Average PR Duration: {avg_pr_duration:.2f} hours
                Performance Level: {'High' if commits > 50 else 'Medium' if commits > 20 else 'Low'}
                    """
        docs = text_splitter.split_text(content)
        for i, chunk in enumerate(docs):
            documents.append(Document(
                page_content=chunk,
                metadata={
                    "type": "developer",
                    "user_id": str(user_id),
                    "login": login,
                    "repo": repo_name,
                    "performance_level": "high" if commits > 50 else "medium" if commits > 20 else "low",
                    "chunk_id": i,
                    "timestamp": timestamp
                }
            ))

    # Documents pour tendances
    for trend in data["trends"]:
        repo_name, month, monthly_commits, active_devs = trend
        content = f"""Monthly Trend: {repo_name}
                    Month: {month.strftime('%Y-%m')}
                    Commits: {monthly_commits}
                    Active Developers: {active_devs}
                    Activity Level: {'High' if monthly_commits > 100 else 'Medium' if monthly_commits > 50 else 'Low'}
                        """
        documents.append(Document(
            page_content=content,
            metadata={
                "type": "trend",
                "repo": repo_name,
                "month": month.strftime('%Y-%m'),
                "activity_level": "high" if monthly_commits > 100 else "medium",
                "timestamp": timestamp
            }
        ))

    # Documents pour KPIs critiques
    for kpi in data["kpi_status"]:
        repo_name, merge_time, reopened, review_delay, merge_status, reopened_status = kpi
        content = f"""KPI Status: {repo_name}
                        Average Merge Time: {merge_time} hours ({merge_status})
                        Reopened Issues: {reopened} ({reopened_status})
                        Review Delay: {review_delay} hours
                        Overall Health: {'Critical' if 'CRITICAL' in [merge_status, reopened_status] else 'Warning' if 'WARNING' in [merge_status, reopened_status] else 'Good'}
                        """
        documents.append(Document(
            page_content=content,
            metadata={
                "type": "kpi_status",
                "repo": repo_name,
                "health_level": "critical" if "CRITICAL" in [merge_status, reopened_status] else "warning",
                "merge_time_status": merge_status.lower(),
                "reopened_status": reopened_status.lower(),
                "timestamp": timestamp
            }
        ))
    for issue in data["issues"]:
        issue_id, title, repo_name, labels = issue
        content = f"""Issue: {title}
                    Repository: {repo_name}
                    Labels: {labels}
                    """
        docs = text_splitter.split_text(content)
        for i, chunk in enumerate(docs):
            documents.append(Document(
                page_content=chunk,
                metadata={
                    "type": "issue",
                    "issue_id": str(issue_id),
                    "repo": repo_name,
                    "labels": labels,
                    "chunk_id": i,
                    "timestamp": timestamp
                }
            ))

    return documents

# Générer et sauvegarder les vecteurs
def generate_vector_store():
    print("🔄 Extraction des données depuis PostgreSQL...")
    github_data = fetch_github_data()

    print("✂️ Découpage des documents...")
    documents = create_documents(github_data)

    print("🧠 Génération des embeddings...")
    embedding_service = EmbeddingService(api_key=os.getenv("GEMINI_API_KEY"))

    class CustomEmbeddings:
        def embed_documents(self, texts):
            return embedding_service.embed_texts(texts)

        def embed_query(self, text):
            return embedding_service.embed_texts([text])[0]

    embeddings = CustomEmbeddings()

    db = FAISS.from_documents(documents, embeddings)
    db.save_local(VECTOR_STORE_PATH)
    print(f"✅ Vector store sauvegardé dans {VECTOR_STORE_PATH}/")

# Point d’entrée du script
if __name__ == "__main__":
    generate_vector_store()
