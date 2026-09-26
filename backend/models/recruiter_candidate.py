from sqlalchemy import Column, Integer, String, Text, Float
from backend.database import Base


class RecruiterCandidate(Base):
    __tablename__ = "recruiter_candidates"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    skills = Column(Text, nullable=True)
    education = Column(Text, nullable=True)
    experience = Column(Text, nullable=True)
    extracurricular = Column(Text, nullable=True)

    resume_filename = Column(String, nullable=True)
    job_description = Column(Text, nullable=True)

    semantic_score = Column(Float, nullable=True)
    skill_score = Column(Float, nullable=True)
    qualification_status = Column(String, nullable=True)
    experience_status = Column(String, nullable=True)
    experience_score = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)

    recruitment_status = Column(
        String,
        nullable=True,
        default="Under Review"
    )
