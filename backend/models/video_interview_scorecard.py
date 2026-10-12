from sqlalchemy import Column, Integer, String, Text
from backend.database import Base


class VideoInterviewScorecard(Base):
    __tablename__ = "video_interview_scorecards"

    id = Column(Integer, primary_key=True, index=True)
    candidate_email = Column(String, nullable=False, index=True)
    scorecard_json = Column(Text, nullable=False)
