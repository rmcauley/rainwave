import uuid
from libs import db
from rainwave.user import User

class R4SetupSessionMixin:
  def setup_rainwave_session_and_redirect(self, user_id, destination):
    session_id = str(uuid.uuid4())
    db.c.update(
      "INSERT INTO r4_sessions (session_id, user_id) VALUES (%s, %s)",
      (session_id, user_id,)
    )
    self.set_cookie("r4_session_id", session_id)

    if destination == "app":
      user = User(user_id)
      user.authorize(1, None, bypass=True)
      self.redirect("rw://%s:%s@rainwave.cc" % (user.id, user.ensure_api_key()),)
    else:
      self.redirect("/")
