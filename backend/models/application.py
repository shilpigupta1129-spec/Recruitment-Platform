from sqlalchemy import Column, Integer, String
from backend.database import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, nullable=False)
    candidate_id = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="applied")