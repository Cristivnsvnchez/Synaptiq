"""add cascade delete on entities and documents

Revision ID: 3a4524db1879
Revises: 157e56aa2f6e
Create Date: 2026-04-03 22:49:41.749789

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a4524db1879'
down_revision: Union[str, Sequence[str], None] = '157e56aa2f6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # accesses.entity_id → entities
    op.drop_constraint("accesses_entity_id_fkey", "accesses", type_="foreignkey")
    op.create_foreign_key(
        "accesses_entity_id_fkey", "accesses", "entities", ["entity_id"], ["id"], ondelete="CASCADE"
    )
    # documents.entity_id → entities
    op.drop_constraint("documents_entity_id_fkey", "documents", type_="foreignkey")
    op.create_foreign_key(
        "documents_entity_id_fkey", "documents", "entities", ["entity_id"], ["id"], ondelete="CASCADE"
    )
    # reminders.entity_id → entities
    op.drop_constraint("reminders_entity_id_fkey", "reminders", type_="foreignkey")
    op.create_foreign_key(
        "reminders_entity_id_fkey", "reminders", "entities", ["entity_id"], ["id"], ondelete="CASCADE"
    )
    # reminders.document_id → documents
    op.drop_constraint("reminders_document_id_fkey", "reminders", type_="foreignkey")
    op.create_foreign_key(
        "reminders_document_id_fkey", "reminders", "documents", ["document_id"], ["id"], ondelete="CASCADE"
    )


def downgrade() -> None:
    op.drop_constraint("reminders_document_id_fkey", "reminders", type_="foreignkey")
    op.create_foreign_key(
        "reminders_document_id_fkey", "reminders", "documents", ["document_id"], ["id"]
    )
    op.drop_constraint("reminders_entity_id_fkey", "reminders", type_="foreignkey")
    op.create_foreign_key(
        "reminders_entity_id_fkey", "reminders", "entities", ["entity_id"], ["id"]
    )
    op.drop_constraint("documents_entity_id_fkey", "documents", type_="foreignkey")
    op.create_foreign_key(
        "documents_entity_id_fkey", "documents", "entities", ["entity_id"], ["id"]
    )
    op.drop_constraint("accesses_entity_id_fkey", "accesses", type_="foreignkey")
    op.create_foreign_key(
        "accesses_entity_id_fkey", "accesses", "entities", ["entity_id"], ["id"]
    )
