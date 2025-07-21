import os
from typing import List
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
import psycopg2
from dotenv import load_dotenv
from datetime import datetime

# Charger les variables d'environnement (.env)
load_dotenv()

VECTOR_STORE_PATH = "app/vectors/github_vectors"
os.makedirs(VECTOR_STORE_PATH, exist_ok=True)

# Service de génération d'embeddings (mock pour Gemini)
class EmbeddingService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        # TODO: Connecter l’API Gemini réelle

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        # Remplacer cette ligne par appel réel à Gemini
        return [[0.0] * 768 for _ in texts]

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

    # Repositories
    cursor.execute("""
        SELECT r.repo_id, r.name, r.language, 
               COUNT(c.commit_id) as commit_count,
               AVG(k.pr_merge_time_avg) as avg_merge_time
        FROM repo_dim r
        LEFT JOIN commit_dim c ON r.repo_id = c.repo_id
        LEFT JOIN kpi_result k ON r.repo_id = k.repo_id
        GROUP BY r.repo_id
    """)
    repos = cursor.fetchall()

    # Issues
    cursor.execute("""
        SELECT i.issue_id, i.title, r.name as repo_name,
               array_to_string(i.labels, ', ') as labels
        FROM issue_dim i
        JOIN repo_dim r ON i.repo_id = r.repo_id
        LIMIT 1000
    """)
    issues = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "repositories": repos,
        "issues": issues
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
        repo_id, name, language, commits, merge_time = repo
        content = f"""Repository: {name}
Language: {language}
Total Commits: {commits}
Average Merge Time: {merge_time:.2f} minutes
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
