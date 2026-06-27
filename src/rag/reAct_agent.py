"""
Tool-calling agent setup for document retrieval and question answering.
"""

from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from src.llms.openai import llm
from src.rag.retriever_setup import get_retriever

_SYSTEM_PROMPT = (
    "You are a helpful assistant. "
    "Use the retriever tool to find relevant information from uploaded documents, "
    "then answer the user's question based on what you find."
)

prompt = ChatPromptTemplate.from_messages([
    ("system", _SYSTEM_PROMPT),
    ("human", "{input}"),
    MessagesPlaceholder("agent_scratchpad"),
])

# Default global agent (no session filtering)
_default_tools = [get_retriever()]
_default_agent = create_tool_calling_agent(llm, _default_tools, prompt)
agent_executor = AgentExecutor(
    agent=_default_agent,
    tools=_default_tools,
    handle_parsing_errors=True,
    max_iterations=6,
    verbose=True,
    return_intermediate_steps=True,
)


def create_session_agent(session_id: str) -> AgentExecutor:
    """Return an AgentExecutor whose retriever is scoped to the given session."""
    retriever_tool = get_retriever(session_id)
    tools = [retriever_tool]
    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(
        agent=agent,
        tools=tools,
        handle_parsing_errors=True,
        max_iterations=6,
        verbose=True,
        return_intermediate_steps=True,
    )
