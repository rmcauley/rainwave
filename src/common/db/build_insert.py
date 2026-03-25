from psycopg import sql


def build_insert(table: str, columns: list[str]) -> sql.Composed:
    return sql.SQL("INSERT INTO {table} ({columns}) VALUES ({values})").format(
        table=sql.Identifier(table),
        columns=sql.SQL(", ").join(map(sql.Identifier, columns)),
        values=sql.SQL(", ").join(sql.Placeholder(name=column) for column in columns),
    )


def build_insert_on_conflict_do_update(
    table: str, columns: list[str], conflict_clause: sql.SQL
) -> sql.Composed:
    return sql.SQL(
        "{insert} ON CONFLICT {conflict_clause} DO UPDATE SET {updates}"
    ).format(
        insert=build_insert(table, columns),
        conflict_clause=conflict_clause,
        updates=sql.SQL(", ").join(
            sql.SQL("{column} = {placeholder}").format(
                column=sql.Identifier(column), placeholder=sql.Placeholder(name=column)
            )
            for column in columns
        ),
    )
