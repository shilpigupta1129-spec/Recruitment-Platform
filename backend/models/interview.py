from sqlalchemy import Column, Integer, String
from backend.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, nullable=False)
    job_id = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="started")