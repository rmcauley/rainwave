import api.web
from api.urls import handle_url


@handle_url("/admin/tools/donations")
class UserSearchTool(api.web.HTMLRequest):
    admin_required = True

    def get(self):
        self.write(self.render_string("bare_header.html", title="User Search Tool"))
        self.write("<script>\nwindow.top.refresh_all_screens = false;\n</script>")
        self.write("<h2>User Search Tool</h2>")

        self.write("<input type='text' id='username'><br>")
        self.write(
            "<button onclick=\"window.top.call_api('user_search', { 'username': document.getElementById('username').value });\">Search for user</button>"
        )

        self.write(self.render_string("basic_footer.html"))


@handle_url("/admin/album_list/donations")
class DonationAddTool(api.web.HTMLRequest):
    admin_required = True

    def get(self):
        self.write(self.render_string("bare_header.html", title="Donation Tool"))
        self.write("<h2>Donation Tool</h2>")

        self.write("User ID: <input type='text' id='user_id'><br>")
        self.write("Amount: <input type='text' id='amount'><br>")
        self.write("Message: <input type='text' id='message'><br>")
        self.write("Private: <input type='checkbox' id='private'><br>")
        self.write(
            "<button onclick=\"window.top.call_api('admin/add_donation', { 'donor_id': document.getElementById('user_id').value, 'amount': document.getElementById('amount').value, 'message': document.getElementById('message').value, 'private': document.getElementById('private').checked });\">Add Donation</button>"
        )
        self.write(self.render_string("basic_footer.html"))
