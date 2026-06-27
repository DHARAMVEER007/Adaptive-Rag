"""
Chat page for the Streamlit application.
"""

import time

import streamlit as st
import streamlit.components.v1 as components

from utils.api_client import query_backend, document_upload_rag, fetch_chat_history, fetch_sessions

st.set_page_config(
    page_title="LangGraph Chat",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={"Get help": None, "Report a Bug": None, "About": None}
)

st.markdown("""
<style>
/* ── Hide Streamlit chrome ── */
[data-testid="stSidebarNav"], #MainMenu, footer, header { display: none !important; }
[data-testid="stDecoration"] { display: none !important; }

/* ── Sidebar base ── */
section[data-testid="stSidebar"],
section[data-testid="stSidebar"] > div {
    background-color: #f9f9f9 !important;
    border-right: 1px solid #e8e8e8 !important;
    padding: 0 !important;
}

/* ── ALL sidebar buttons — reset to plain text rows ── */
section[data-testid="stSidebar"] .stButton > button {
    background: transparent !important;
    border: none !important;
    color: #0d0d0d !important;
    font-size: 0.9rem !important;
    font-weight: 400 !important;
    text-align: left !important;
    padding: 8px 14px !important;
    border-radius: 8px !important;
    width: 100% !important;
    box-shadow: none !important;
    line-height: 1.5 !important;
    transition: background 0.1s ease !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    display: block !important;
}
section[data-testid="stSidebar"] .stButton > button:hover {
    background: #ececec !important;
}
section[data-testid="stSidebar"] .stButton > button:focus,
section[data-testid="stSidebar"] .stButton > button:active {
    box-shadow: none !important;
    outline: none !important;
    border: none !important;
}

/* ── New Chat: highlighted by default ── */
section[data-testid="stSidebar"] .new-chat .stButton > button {
    background: #ececec !important;
    font-weight: 500 !important;
    color: #0d0d0d !important;
    padding: 9px 14px !important;
}
section[data-testid="stSidebar"] .new-chat .stButton > button:hover {
    background: #e2e2e2 !important;
}

/* ── Upload docs button ── */
section[data-testid="stSidebar"] .upload-btn .stButton > button {
    color: #0d0d0d !important;
    font-weight: 400 !important;
}

/* ── Active conversation ── */
section[data-testid="stSidebar"] .conv-active .stButton > button {
    background: #ececec !important;
    font-weight: 500 !important;
}

/* ── User bottom button ── */
section[data-testid="stSidebar"] .user-btn .stButton > button {
    background: transparent !important;
    border-top: 1px solid #e8e8e8 !important;
    border-radius: 0 !important;
    padding: 12px 14px !important;
    font-size: 0.9rem !important;
    font-weight: 600 !important;
    color: #0d0d0d !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
}
section[data-testid="stSidebar"] .user-btn .stButton > button:hover {
    background: #ececec !important;
}

/* ── Logout option ── */
section[data-testid="stSidebar"] .logout-opt .stButton > button {
    color: #c0392b !important;
    font-size: 0.875rem !important;
    padding: 7px 14px !important;
    border-radius: 6px !important;
    background: transparent !important;
}
section[data-testid="stSidebar"] .logout-opt .stButton > button:hover {
    background: #fdf0ef !important;
}

/* ── Section headers ── */
.sidebar-header {
    font-size: 0.85rem;
    font-weight: 700;
    color: #0d0d0d;
    padding: 14px 14px 4px;
    margin: 0;
}

/* ── App title row ── */
.app-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #0d0d0d;
    padding: 16px 14px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

/* ── Sidebar text ── */
section[data-testid="stSidebar"] p,
section[data-testid="stSidebar"] span,
section[data-testid="stSidebar"] label {
    color: #0d0d0d !important;
}

/* ── Divider ── */
section[data-testid="stSidebar"] hr {
    border: none !important;
    border-top: 1px solid #e8e8e8 !important;
    margin: 4px 0 !important;
}

/* ── Expander upload area ── */
section[data-testid="stSidebar"] [data-testid="stExpander"] {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
}
section[data-testid="stSidebar"] [data-testid="stExpander"] summary {
    font-size: 0.9rem !important;
    font-weight: 400 !important;
    color: #0d0d0d !important;
    padding: 8px 14px !important;
}
section[data-testid="stSidebar"] [data-testid="stExpander"] summary:hover {
    background: #ececec !important;
    border-radius: 8px !important;
}

/* ── No padding on sidebar content ── */
section[data-testid="stSidebar"] .block-container { padding: 0 !important; }

/* ── Main chat ── */
.main .block-container { padding-top: 1.5rem !important; max-width: 860px !important; margin: 0 auto !important; }
</style>
""", unsafe_allow_html=True)

# ── Auth guard ────────────────────────────────────────────────────────────────
if "jwt_token" not in st.session_state:
    st.warning("Please login first.")
    st.switch_page("home.py")

username = st.session_state.get("username", "user")
role     = st.session_state.get("role", "user")
initial  = username[0].upper()

def _new_session_id():
    return f"{username}_{int(time.time() * 1000)}"

def _load_session(sid):
    raw = fetch_chat_history(sid)
    st.session_state.chat_history = [
        ("user" if m["role"] == "human" else "assistant", m["content"])
        for m in raw
    ]
    st.session_state.active_session_id = sid

def _refresh_sessions():
    st.session_state.sessions = fetch_sessions(username)

# ── Bootstrap ─────────────────────────────────────────────────────────────────
if "sessions" not in st.session_state:
    _refresh_sessions()

if "active_session_id" not in st.session_state:
    if st.session_state.sessions:
        _load_session(st.session_state.sessions[-1]["session_id"])
    else:
        st.session_state.active_session_id = _new_session_id()
        st.session_state.chat_history = []

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

if "user_menu_open" not in st.session_state:
    st.session_state.user_menu_open = False

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:

    # App title
    st.markdown('<div class="app-title">LangGraph Assistant</div>', unsafe_allow_html=True)

    # New Chat
    st.markdown('<div class="new-chat">', unsafe_allow_html=True)
    if st.button("✏️   New chat", use_container_width=True, key="btn_new_chat"):
        st.session_state.active_session_id = _new_session_id()
        st.session_state.chat_history = []
        st.session_state.user_menu_open = False
        _refresh_sessions()
        st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

    # Upload Documents
    st.markdown('<div class="upload-btn">', unsafe_allow_html=True)
    with st.expander("📎   Upload Documents"):
        uploaded_file = st.file_uploader("Choose file", type=["pdf", "txt"],
                                         label_visibility="collapsed")
        if uploaded_file:
            desc = st.text_input("Describe the document", max_chars=300,
                                 placeholder="E.g. research paper, product manual...")
            if "uploaded_files" not in st.session_state:
                st.session_state.uploaded_files = {}
            fkey = f"{uploaded_file.name}_{desc}"
            if desc:
                if fkey not in st.session_state.uploaded_files:
                    if document_upload_rag(uploaded_file, desc):
                        st.success(f"✓ {uploaded_file.name}")
                        st.session_state.uploaded_files[fkey] = True
                    else:
                        st.error("Upload failed.")
                else:
                    st.caption(f"✓ Already uploaded")
            else:
                st.caption("Add a description to upload.")
    st.markdown('</div>', unsafe_allow_html=True)

    # Recents section
    st.markdown('<div class="sidebar-header">Recents</div>', unsafe_allow_html=True)

    sessions  = st.session_state.get("sessions", [])
    active_id = st.session_state.active_session_id

    if not sessions:
        st.markdown(
            '<p style="font-size:0.85rem;color:#aaa;padding:4px 14px">No conversations yet.</p>',
            unsafe_allow_html=True
        )
    else:
        # Newest at bottom, oldest at top — iterate as-is (API returns oldest first)
        for s in sessions:
            sid      = s["session_id"]
            title    = s["title"] or "New Conversation"
            is_active = (sid == active_id)
            wrapper  = "conv-active" if is_active else ""
            st.markdown(f'<div class="{wrapper}">', unsafe_allow_html=True)
            if st.button(title, key=f"conv_{sid}", use_container_width=True):
                _load_session(sid)
                st.session_state.user_menu_open = False
                st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)

    # Push user menu to bottom
    st.markdown("<div style='flex:1;min-height:60px'></div>", unsafe_allow_html=True)

    # ── User menu at bottom ──
    if st.session_state.user_menu_open:
        st.markdown('<div class="logout-opt">', unsafe_allow_html=True)
        if st.button("↩   Logout", use_container_width=True, key="btn_logout"):
            st.session_state.show_logout_confirm = True
            st.session_state.user_menu_open = False
            st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="user-btn">', unsafe_allow_html=True)
    arrow = "▴" if st.session_state.user_menu_open else "▾"
    if st.button(f"🟢  {username}  ·  {role}  {arrow}", use_container_width=True, key="btn_user_menu"):
        st.session_state.user_menu_open = not st.session_state.user_menu_open
        st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

# ── Logout confirmation ────────────────────────────────────────────────────────
if st.session_state.get("show_logout_confirm"):
    st.warning("Are you sure you want to logout?")
    c1, c2 = st.columns(2)
    with c1:
        if st.button("✅ Yes, logout"):
            for k in list(st.session_state.keys()):
                del st.session_state[k]
            st.switch_page("home.py")
    with c2:
        if st.button("❌ Cancel"):
            st.session_state.show_logout_confirm = False

# ── Main chat area ─────────────────────────────────────────────────────────────
st.title("💬 LangGraph Chat")

for role_msg, text in st.session_state.chat_history:
    st.chat_message(role_msg).write(text)

components.html("""
<script>
(function() {
    const doc = window.parent.document;
    const msgs = doc.querySelectorAll('[data-testid="stChatMessage"]');
    if (msgs.length > 0) {
        msgs[msgs.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
})();
</script>
""", height=0)

user_input = st.chat_input("Message LangGraph Assistant...")

if user_input:
    st.session_state.chat_history.append(("user", user_input))
    with st.spinner("Thinking..."):
        response = query_backend(user_input, st.session_state["active_session_id"])
    st.session_state.chat_history.append(("assistant", response))
    _refresh_sessions()
    st.rerun()
