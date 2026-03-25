from typing import Mapping

from psycopg import sql


def build_insert(table: str, to_insert: Mapping[str, object]) -> sql.Composed:
    columns = list(to_insert.keys())
    return sql.SQL("INSERT INTO {table} ({columns}) VALUES ({values})").format(
        table=sql.Identifier(table),
        columns=sql.SQL(", ").join(map(sql.Identifier, columns)),
        values=sql.SQL(", ").join(sql.Placeholder(name=column) for column in columns),
    )


def build_insert_on_conflict_do_update(
    table: str, to_insert: Mapping[str, object], conflict_clause: sql.SQL
) -> sql.Composed:
    columns = list(to_insert.keys())
    return sql.SQL(
        "{insert} ON CONFLICT {conflict_clause} DO UPDATE SET {updates}"
    ).format(
        insert=build_insert(table, to_insert),
        conflict_clause=conflict_clause,
        updates=sql.SQL(", ").join(
            sql.SQL("{column} = {placeholder}").format(
                column=sql.Identifier(column), placeholder=sql.Placeholder(name=column)
            )
            for column in columns
        ),
    )
