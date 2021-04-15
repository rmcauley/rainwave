import uuid
from libs import db

class R4SetupSessionMixin:
  def setup_rainwave_session(self, user_id):
    session_id = str(uuid.uuid4())
    db.c.update(
      "INSERT INTO r4_sessions (session_id, user_id) VALUES (%s, %s)",
      (session_id, user_id,)
    )
    self.set_cookie("r4_session_id", session_id)
