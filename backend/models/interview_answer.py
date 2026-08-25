from sqlalchemy import Column, Integer, Text
from backend.database import Base


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, nullable=False)
    question_id = Column(Integer, nullable=False)
    answer = Column(Text, nullable=False)
    score = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)