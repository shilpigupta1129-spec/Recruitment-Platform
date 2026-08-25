from sqlalchemy import Column, Integer, String, Text
from backend.database import Base


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, nullable=False)
    phone = Column(String, nullable=True)
    education = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    skills = Column(Text, nullable=True)
    resume_filename = Column(String, nullable=True)