from sqlalchemy import Column, Integer, String, Text
from backend.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=False)
    salary = Column(String, nullable=True)
    skills = Column(String, nullable=True)
    recruiter_id = Column(Integer, nullable=False)