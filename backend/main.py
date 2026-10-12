from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.cors import CORSMiddleware
from backend.database import Base, engine
from backend.models.user import User
from backend.models.job import Job
from backend.models.application import Application
from backend.models.candidate_profile import CandidateProfile
from backend.models.interview import Interview
from backend.models.interview_question import InterviewQuestion
from backend.models.interview_answer import InterviewAnswer
from backend.models.recruiter_candidate import RecruiterCandidate
from backend.models.video_interview_scorecard import VideoInterviewScorecard

from backend.routes.auth import router as auth_router
from backend.routes.jobs import router as jobs_router
from backend.routes.applications import router as applications_router
from backend.routes.candidate_profile import router as candidate_profile_router
from backend.routes.interview import router as interview_router
from backend.routes.interview_questions import router as interview_questions_router
from backend.routes.interview_answers import router as interview_answers_router
from backend.routes.ai_analysis import router as ai_analysis_router
from backend.routes.scorecard import router as scorecard_router
from backend.routes.evaluation import router as evaluation_router
from backend.routes.recruiter_assessment import router as recruiter_assessment_router
from backend.routes.recruiter_candidates import router as recruiter_candidates_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)	

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(applications_router, tags=["Applications"])
app.include_router(jobs_router, tags=["Jobs"])
app.include_router(candidate_profile_router, tags=["Candidate Profile"])
app.include_router(interview_router, tags=["Interviews"])
app.include_router(interview_questions_router, tags=["Interview Questions"])
app.include_router(interview_answers_router, tags=["Interview Answers"])
app.include_router(ai_analysis_router, tags=["AI Analysis"])
app.include_router(scorecard_router)
app.include_router(evaluation_router)
app.include_router(recruiter_assessment_router)
app.include_router(recruiter_candidates_router, tags=["Recruiter Candidates"])


@app.get("/")
def home():
    return {"message": "Recruitment Platform Backend is Running"}
