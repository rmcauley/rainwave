    def get_sql_limit_string(self) -> str:
        if not self.pagination:
            return ""
        limit = ""
        if self.get_argument("per_page") != None:
            if not self.get_argument("per_page"):
                limit = "LIMIT ALL"
            else:
                limit = "LIMIT %s" % self.get_argument("per_page")
        else:
            limit = "LIMIT 100"
        if self.get_argument("page_start"):
            limit += " OFFSET %s" % self.get_argument("page_start")
        return limit
