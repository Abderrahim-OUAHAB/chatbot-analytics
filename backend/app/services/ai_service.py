import uuid
import json
from typing import List, Dict
from app.schemas import GitHubQuery, GitHubQueryType
from datetime import datetime
from app.config import (
    GEMINI_API_KEY, GEMINI_MODEL_NAME, MAX_TOKENS, TEMPERATURE, TOP_P,
    SYSTEM_PROMPT, FEW_SHOT_EXAMPLES, RECOVERY_PROMPT, VECTOR_STORE_PATH
)
from app.utils.classifiers import classify_query
from app.utils.formatters import ResponseFormatter
from app.services.memory_service import get_conversation_state, update_conversation_state
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)

class AIService:
    def __init__(self):
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=GEMINI_API_KEY
        )
        self.vector_store = FAISS.load_local(
            folder_path=VECTOR_STORE_PATH,
            embeddings=self.embeddings,
            allow_dangerous_deserialization=True
        )

    def _retrieve_relevant_data(self, query: str, query_type: GitHubQueryType = None) -> List[Dict]:
        # Recherche basique
        docs = self.vector_store.similarity_search(query, k=5)
        
        # Filtrage intelligent selon le type de requête
        if query_type:
            filtered_docs = []
            for doc in docs:
                doc_type = doc.metadata.get('type', '')
                
                # Filtres spécialisés
                if query_type == GitHubQueryType.TEAM_PERFORMANCE and doc_type == 'developer':
                    filtered_docs.append(doc)
                elif query_type == GitHubQueryType.TREND and doc_type == 'trend':
                    filtered_docs.append(doc)
                elif query_type == GitHubQueryType.RISK_ASSESSMENT and doc_type == 'kpi_status':
                    filtered_docs.append(doc)
                else:
                    filtered_docs.append(doc)  # Garde tout si pas de filtre spécifique
            
            docs = filtered_docs[:3]  # Limite à 3 documents les plus pertinents
        
        return [self._parse_github_doc(doc) for doc in docs]

    def _parse_github_doc(self, doc) -> Dict:
        try:
            content = json.loads(doc.page_content)
            return {
                **content,
                **doc.metadata  # Includes province, commune, etc.
            }
        except json.JSONDecodeError:
            return {"raw_content": doc.page_content, **doc.metadata}
    
    def _get_kpi_context(self, query_type: GitHubQueryType) -> str:
        """Récupère le contexte KPI spécifique selon le type de requête"""
        kpi_contexts = {
            GitHubQueryType.TEAM_PERFORMANCE: """
            Métriques clés : commit_count, pr_merge_time_avg, review_delay_avg
            Seuils : >50 commits/mois (bon), <20 commits/mois (attention)
            """,
            GitHubQueryType.RISK_ASSESSMENT: """
            Indicateurs de risque : reopened_issues, vulnerabilities, build failures
            Seuils critiques : >5 reopened_issues, >10 vulnérabilités critiques
            """,
            GitHubQueryType.CODE_HEALTH: """
            Métriques santé : coverage, bugs, code_smells, technical_debt
            Objectifs : >80% coverage, <1% bug density
            """
        }
        return kpi_contexts.get(query_type, "")

    def _enhance_prompt_with_kpi_insights(self, base_prompt: str, query_type: GitHubQueryType) -> str:
        """Enrichit le prompt avec des insights KPI"""
        kpi_context = self._get_kpi_context(query_type)
        if kpi_context:
            base_prompt += f"\n\nContexte KPI :\n{kpi_context}\n"
        return base_prompt

    def prepare_prompt(self, user_query: str) -> str:
        relevant_data = self._retrieve_relevant_data(user_query)
        query_type = classify_query(user_query)
        context_str = "\n".join(
            f"GitHub Context {i+1}:\n{json.dumps(data, indent=2)}"
            for i, data in enumerate(relevant_data)
        )
        base_prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"GitHub Documentation Context:\n{context_str}\n\n"
            f"Examples:\n{FEW_SHOT_EXAMPLES}\n\n"
        )
        if query_type == GitHubQueryType.COMPARE:
            base_prompt += "NOTE: Compare repositories or developers using bar charts\n\n"
        elif query_type == GitHubQueryType.TREND:
            base_prompt += "NOTE: Show time trends with line charts\n\n"
        return base_prompt + f"User Query: {user_query}\nResponse:"

    async def generate_response(self, query: GitHubQuery) -> Dict:
        """Generate response using vector store context"""
        if not query.session_id:
                query.session_id = str(uuid.uuid4())

        conv_state = get_conversation_state(query.session_id)
            
        conv_state["history"].append({
                "role": "user",
                "content": query.prompt,
                "timestamp": datetime.now().isoformat()
            })
            
        context = "\nPrevious conversation:\n" + "\n".join(
                f"{msg['role']}: {msg['content']}" 
                for msg in conv_state["history"][:-1]
            )
            
        full_prompt = f"{context}\n\n{self.prepare_prompt(query.prompt)}"
            
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)
            
        for attempt in range(3):
                try:
                    response = model.generate_content(
                        full_prompt,
                        generation_config={
                            "temperature": TEMPERATURE,
                            "top_p": TOP_P,
                            "max_output_tokens": MAX_TOKENS,
                        }
                    )
                    
                    generated_text = response.text
                    formatted = ResponseFormatter.format_response(generated_text)
                    
                    if formatted["success"]:
                        conv_state["history"].append({
                            "role": "assistant",
                            "content": formatted["content"],
                            "timestamp": datetime.now().isoformat()
                        })
                        update_conversation_state(query.session_id, conv_state)
                        
                        return {
                            "session_id": query.session_id,
                            "response_type": formatted["type"],
                            "response": formatted["content"],
                            "history": conv_state["history"]
                        }
                    
                    if attempt < 2:
                        error_msg = formatted.get("error", "Unknown formatting error")
                        full_prompt = f"{full_prompt}\n\n{RECOVERY_PROMPT.format(errors=error_msg, query=query.prompt)}"
                        continue
                    
                    return {
                        "error": "Response formatting failed",
                        "details": formatted.get("error"),
                        "raw_response": generated_text
                    }
                
                except Exception as e:
                    if attempt == 2:
                        raise e
            
        return {
                "error": "Max retries exceeded",
                "suggestion": "Try a simpler query or different metrics"
            }