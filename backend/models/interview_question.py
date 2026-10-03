from sqlalchemy import Column, Integer, String, Text
from backend.database import Base


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    question_type = Column(String, nullable=False, default="technical")
    difficulty = Column(String, nullable=False, default="medium")
    expected_answer = Column(Text, nullable=True)