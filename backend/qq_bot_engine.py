class QQBotEngine:
    def __init__(self, skills_engine=None, kb_engine=None):
        self.skills = skills_engine
        self.kb = kb_engine
