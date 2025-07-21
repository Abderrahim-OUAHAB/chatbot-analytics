from typing import Dict, List
from uuid import uuid4


conversation_memory: Dict[str, Dict] = {}

def get_conversation_state(session_id: str = None) -> Dict:
    if not session_id:
        session_id = str(uuid4())
    
    if session_id not in conversation_memory:
        conversation_memory[session_id] = {
            "history": [],
            "context_window": 3
        }
    
    return conversation_memory[session_id]

def update_conversation_state(session_id: str, state: Dict):
    if len(state["history"]) > state["context_window"]:
        state["history"] = state["history"][-state["context_window"]:]
    conversation_memory[session_id] = state