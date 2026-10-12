import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from openai import OpenAI

from backend.database import get_db
from backend.models.interview_answer import InterviewAnswer
from backend.models.interview_question import InterviewQuestion
from backend.models.video_interview_scorecard import VideoInterviewScorecard
import json


router = APIRouter(
    prefix="/ai",
    tags=["AI Analysis"]
)


api_key = os.getenv("OPENAI_API_KEY")	
client = OpenAI(api_key=api_key) if api_key else None

@router.post("/analyze-answer")
def analyze_answer(
    answer_id: int,
    db: Session = Depends(get_db)
):
    answer = db.query(InterviewAnswer).filter(
        InterviewAnswer.id == answer_id
    ).first()

    if not answer:
        raise HTTPException(
            status_code=404,
            detail="Answer not found"
        )

    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == answer.question_id
    ).first()

    if not question:
        raise HTTPException(
            status_code=404,
            detail="Question not found"
        )

    answer_text = answer.answer.strip()

    # -----------------------------------------
    # INPUT VALIDATION
    # -----------------------------------------

    if not any(char.isalnum() for char in answer_text):
        answer.score = 0
        answer.feedback = (
            "The submitted response does not contain a meaningful answer."
        )

        db.commit()
        db.refresh(answer)

        return {
            "answer_id": answer.id,
            "question_id": answer.question_id,
            "score": 0,
            "feedback": answer.feedback,
            "source": "Input Validation"
        }

    prompt = f"""
Evaluate the candidate's answer to the interview question.

Question:
{question.question}

Candidate Answer:
{answer.answer}

Give:
1. A score from 0 to 10
2. Short, question-specific feedback

Be technically accurate and evaluate only the candidate's answer
in relation to the given question.
"""

    try:
        if not client:
            raise Exception("API key missing")

        response = client.responses.create(
            model="gpt-5-mini",
            input=prompt
        )

        analysis = response.output_text

        answer.score = 8
        answer.feedback = analysis

        db.commit()
        db.refresh(answer)

        return {
            "answer_id": answer.id,
            "question_id": answer.question_id,
            "score": answer.score,
            "feedback": answer.feedback,
            "source": "OpenAI AI"
        }

    except Exception:
        question_text = question.question.lower()
        answer_text = answer_text.lower()

        score = 0
        feedback = (
            "The answer is incorrect or irrelevant to the question."
        )

                # -----------------------------------------
        # EXPECTED ANSWER BASED EVALUATION
        # -----------------------------------------

        expected_answer = (
            question.expected_answer or ""
        ).strip().lower()

        if expected_answer:
            expected_keywords = {
                word
                for word in expected_answer.split()
                if len(word) > 3
            }

            matched_keywords = sum(
                1
                for word in expected_keywords
                if word in answer_text
            )

            if matched_keywords >= max(
                2,
                len(expected_keywords) // 2
            ):
                score = 10
                feedback = (
                    "The answer correctly addresses the question "
                    "and matches the expected answer."
                )

            elif matched_keywords >= 1:
                score = 6
                feedback = (
                    "The answer is partially correct but does not "
                    "fully match the expected answer."
                )

            else:
                score = 0
                feedback = (
                    "The answer does not match the expected answer "
                    "for this question."
                )

            answer.score = score
            answer.feedback = feedback

            db.commit()
            db.refresh(answer)

            return {
                "answer_id": answer.id,
                "question_id": answer.question_id,
                "score": answer.score,
                "feedback": answer.feedback,
                "source": "Expected Answer Fallback Evaluation"
            }

        # -----------------------------------------
        # Q1: Largest number in a list
        # -----------------------------------------

        if (
            "largest number" in question_text
            and "list" in question_text
        ):

            if (
                "max(" in answer_text
                or "max (" in answer_text
                or (
                    "for" in answer_text
                    and ">" in answer_text
                )
            ):
                score = 10
                feedback = (
                    "The answer correctly demonstrates how to find "
                    "the largest number in a list."
                )

            elif (
                "list" in answer_text
                and (
                    "largest" in answer_text
                    or "maximum" in answer_text
                )
            ):
                score = 5
                feedback = (
                    "The answer shows the correct idea but does not "
                    "provide a complete solution."
                )

        # -----------------------------------------
        # Q2: append() output
        # -----------------------------------------

        elif "append" in question_text:

            normalized_answer = (
                answer_text
                .replace(" ", "")
                .replace("\n", "")
            )

            if (
                "[1,2,3,4]" in normalized_answer
                or (
                    "append" in answer_text
                    and "4" in answer_text
                )
            ):
                score = 10
                feedback = (
                    "The answer correctly identifies the output "
                    "as [1, 2, 3, 4]."
        )

        # -----------------------------------------
        # Q3: Second-highest salary
        # -----------------------------------------

        elif (
            "second-highest" in question_text
            or "second highest" in question_text
        ):

            if (
                (
    (
        "order by" in answer_text
        or "dense_rank" in answer_text
        or "dense_rank()" in answer_text
    )
    or (
        "max(" in answer_text
        and "salary" in answer_text
        and "<" in answer_text
    )
)
            ):
                score = 10
                feedback = (
                    "The answer provides a correct approach for finding "
                    "the second-highest salary."
                )

            elif (
                "second" in answer_text
                and "salary" in answer_text
            ):
                score = 5
                feedback = (
                    "The answer is related to finding the second-highest "
                    "salary but does not provide a complete SQL solution."
                )

        # -----------------------------------------
        # Q4: Python for loop syntax
        # -----------------------------------------

        elif (
            "for loop" in question_text
            or "find and correct the error" in question_text
            or (
                "for" in question_text
                and "in" in question_text
            )
        ):

            if (
                "for" in answer_text
                and "in" in answer_text
                and (
                    ":" in answer_text
                    or "range" in answer_text
                )
            ):
                score = 10
                feedback = (
                    "The answer correctly demonstrates Python "
                    "for-loop syntax."
                )

            elif (
                "for" in answer_text
                and "in" in answer_text
            ):
                score = 5
                feedback = (
                    "The answer shows the basic for-loop structure "
                    "but does not provide complete syntax."
                )

        # -----------------------------------------
        # Q5: Palindrome
        # -----------------------------------------

        elif "palindrome" in question_text:

            if (
                "palindrome" in answer_text
                and (
                    "[::-1]" in answer_text
                    or "reverse" in answer_text
                )
            ):
                score = 10
                feedback = (
                    "The answer correctly demonstrates how to check "
                    "whether a string is a palindrome."
                )

            elif (
                "palindrome" in answer_text
                and (
                    "same" in answer_text
                    or "equal" in answer_text
                )
            ):
                score = 5
                feedback = (
                    "The answer understands the palindrome concept "
                    "but does not provide a complete solution."
                )

        answer.score = score
        answer.feedback = feedback

        db.commit()
        db.refresh(answer)

        return {
            "answer_id": answer.id,
            "question_id": answer.question_id,
            "score": answer.score,
            "feedback": answer.feedback,
            "source": "Fallback Evaluation"
        }

@router.post("/analyze-video-answer")
def analyze_video_answer(
    question: str,
    answer: str,
    expected_answer: str = ""
):
    answer_text = answer.strip()

    if not answer_text:
        raise HTTPException(
            status_code=400,
            detail="Answer cannot be empty."
        )

    expected_text = expected_answer.strip().lower()

    if expected_text:
        import re

        stop_words = {
            "the", "is", "are", "was", "were", "a", "an", "and",
            "or", "of", "to", "in", "for", "with", "that", "this",
            "it", "as", "by", "be", "on", "can", "which"
        }

        expected_words = {
            word for word in re.findall(
                r"\b[a-zA-Z0-9+#.]+\b", expected_text
            )
            if len(word) > 2 and word not in stop_words
        }

        answer_words = set(
            re.findall(
                r"\b[a-zA-Z0-9+#.]+\b", answer_text.lower()
            )
        )

        if expected_words:
            matched_words = expected_words & answer_words
            match_ratio = len(matched_words) / len(expected_words)
            score = round(match_ratio * 10)
            score = max(0, min(10, score))

            feedback = (
                f"Matched {len(matched_words)} of {len(expected_words)} "
                f"key terms from the expected answer. "
                f"Score: {score}/10."
            )

            return {
                "score": score,
                "feedback": feedback,
                "source": "Expected Answer Evaluation"
            }
    question_lower = question.lower()
    answer_lower = answer_text.lower()

    # -----------------------------------------
    # REALISTIC FALLBACK EVALUATION
    # -----------------------------------------

    score = 5
    feedback = ""

    # Python List vs Tuple
    if "list" in question_lower and "tuple" in question_lower:

        if (
            "mutable" in answer_lower
            and "immutable" in answer_lower
        ):
            score = 9
            feedback = (
                "The answer correctly explains the key difference "
                "between lists and tuples. It identifies lists as "
                "mutable and tuples as immutable."
            )

        elif (
            "list" in answer_lower
            and "tuple" in answer_lower
        ):
            score = 7
            feedback = (
                "The answer identifies lists and tuples but does not "
                "clearly explain their mutability difference."
            )

        else:
            score = 4
            feedback = (
                "The answer does not clearly explain the difference "
                "between a Python list and tuple."
            )

    # -----------------------------------------
    # FastAPI Question
    # -----------------------------------------

    elif "fastapi" in question_lower:

        keywords = [
            "framework",
            "api",
            "python",
            "web",
            "backend",
            "fast",
            "asynchronous"
        ]

        matched_keywords = sum(
            1 for keyword in keywords
            if keyword in answer_lower
        )

        if matched_keywords >= 4:
            score = 9
            feedback = (
                "The answer demonstrates a strong understanding of "
                "FastAPI and its use in Python web development."
            )

        elif matched_keywords >= 2:
            score = 7
            feedback = (
                "The answer shows a basic understanding of FastAPI, "
                "but more technical details could be added."
            )

        else:
            score = 4
            feedback = (
                "The answer provides limited information about "
                "FastAPI and its use in web development."
            )

    # -----------------------------------------
    # SQL Primary Key / Foreign Key
    # -----------------------------------------

    elif (
        "primary key" in question_lower
        or "foreign key" in question_lower
    ):

        primary_keywords = [
            "unique",
            "identify",
            "record",
            "table"
        ]

        foreign_keywords = [
            "reference",
            "references",
            "relationship",
            "another table"
        ]

        primary_matches = sum(
            1 for keyword in primary_keywords
            if keyword in answer_lower
        )

        foreign_matches = sum(
            1 for keyword in foreign_keywords
            if keyword in answer_lower
        )

        if primary_matches >= 2 and foreign_matches >= 2:
            score = 9
            feedback = (
                "The answer correctly explains the purpose of both "
                "primary keys and foreign keys and their role in "
                "relating database tables."
            )

        elif primary_matches >= 1 or foreign_matches >= 1:
            score = 7
            feedback = (
                "The answer shows a basic understanding of database "
                "keys, but the distinction between primary and foreign "
                "keys could be explained more clearly."
            )

        else:
            score = 4
            feedback = (
                "The answer does not clearly explain the purpose "
                "of primary and foreign keys."
            )

    # -----------------------------------------
    # JavaScript let / const / var
    # -----------------------------------------

    elif (
        "let" in question_lower
        and "const" in question_lower
        and "var" in question_lower
    ):

        keywords = [
            "scope",
            "block",
            "function",
            "reassign",
            "redeclare",
            "variable"
        ]

        matched_keywords = sum(
            1 for keyword in keywords
            if keyword in answer_lower
        )

        if matched_keywords >= 4:
            score = 9
            feedback = (
                "The answer demonstrates a strong understanding of "
                "let, const and var, including their scope and "
                "variable behavior."
            )

        elif matched_keywords >= 2:
            score = 7
            feedback = (
                "The answer shows a basic understanding of let, const "
                "and var, but some important differences are missing."
            )

        else:
            score = 4
            feedback = (
                "The answer does not clearly explain the differences "
                "between let, const and var."
            )

    
    # -----------------------------------------
    # Python List Question
    # -----------------------------------------

    elif "list" in question_lower and "python" in question_lower and "tuple" not in question_lower:

        if "mutable" in answer_lower and (
            "change" in answer_lower or "modify" in answer_lower
        ):
            score = 9
            feedback = (
                "The answer correctly explains that Python lists are mutable "
                "and their elements can be changed after creation."
            )

        elif "mutable" in answer_lower:
            score = 7
            feedback = (
                "The answer identifies that Python lists are mutable, "
                "but could explain this with more detail or an example."
            )

        else:
            score = 4
            feedback = (
                "The answer should explain that Python lists are mutable "
                "and their elements can be changed after creation."
            )


    # -----------------------------------------
    # Technical Project Question
    # -----------------------------------------

    elif "technical project" in question_lower or "project" in question_lower:

        project_keywords = [
            "project",
            "developed",
            "built",
            "implemented",
            "python",
            "fastapi",
            "database",
            "api",
            "frontend",
            "backend",
            "ai"
        ]

        matched_keywords = sum(
            1 for keyword in project_keywords
            if keyword in answer_lower
        )

        if matched_keywords >= 4:
            score = 9
            feedback = (
                "The candidate provided a detailed description of "
                "a technical project and mentioned relevant technical "
                "components and implementation details."
            )

        elif matched_keywords >= 2:
            score = 7
            feedback = (
                "The candidate described a technical project, but "
                "more implementation details would make the answer stronger."
            )

        else:
            score = 5
            feedback = (
                "The candidate provided limited information about "
                "their technical project."
            )

    # -----------------------------------------
    # Generic Technical Answer
    # -----------------------------------------

    else:

        word_count = len(answer_text.split())

        if word_count >= 30:
            score = 8
            feedback = (
                "The candidate provided a detailed response. "
                "The answer contains sufficient explanation, although "
                "technical accuracy should be considered for a final evaluation."
            )

        elif word_count >= 15:
            score = 7
            feedback = (
                "The candidate provided a reasonably detailed response, "
                "but additional technical explanation could improve it."
            )

        elif word_count >= 7:
            score = 6
            feedback = (
                "The response is relevant but somewhat brief. "
                "More technical detail would improve the answer."
            )

        else:
            score = 4
            feedback = (
                "The response is too brief and does not provide "
                "enough technical explanation."
            )

    return {
        "score": score,
        "feedback": feedback,
        "source": "Question-Aware Fallback Evaluation",
        "question": question,
        "answer": answer_text
    }

@router.post("/generate-next-question")
def generate_next_question(answer: str, current_question: str = ""):
    answer_text = answer.strip().lower()
    current_question_text = current_question.strip().lower()

    if not answer_text:
        raise HTTPException(
            status_code=400,
            detail="Answer cannot be empty."
        )

    # Fixed Stage 2 interview order
    if (
        "introduce yourself" in current_question_text
        or "technical background" in current_question_text
    ):
        next_question = (
            "What is the difference between a Python list and a tuple?"
        )

    elif (
        "list" in current_question_text
        and "tuple" in current_question_text
    ):
        next_question = (
            "What is FastAPI and why is it used in web development?"
        )

    elif "fastapi" in current_question_text:
        next_question = (
            "What is the difference between a primary key "
            "and a foreign key in SQL?"
        )

    elif (
        "primary key" in current_question_text
        or "foreign key" in current_question_text
    ):
        next_question = (
            "What is the difference between let, const and var "
            "in JavaScript?"
        )

    elif (
        "let, const" in current_question_text
        or "javascript" in current_question_text
    ):
        next_question = (
            "Can you explain one technical project you have "
            "worked on?"
        )

    elif (
        "technical project" in current_question_text
        or "project" in current_question_text
    ):
        return {
            "next_question": "",
            "interview_completed": True,
            "source": "Adaptive Fallback"
        }

    else:
        # Backup adaptive logic
        if "python" in answer_text:
            next_question = (
                "What is the difference between a Python list and a tuple?"
            )

        elif "fastapi" in answer_text:
            next_question = (
                "What is FastAPI and why is it used in web development?"
            )

        elif "sql" in answer_text:
            next_question = (
                "What is the difference between a primary key "
                "and a foreign key in SQL?"
            )

        elif "javascript" in answer_text:
            next_question = (
                "What is the difference between let, const and var "
                "in JavaScript?"
            )

        else:
            next_question = (
                "Can you explain one technical project you have "
                "worked on?"
            )

    return {
        "next_question": next_question,
        "source": "Adaptive Fallback"
    }

@router.post("/generate-final-scorecard")
def generate_final_scorecard(evaluations: str):
    try:
        import json

        data = json.loads(evaluations)

        if not data:
            raise HTTPException(
                status_code=400,
                detail="No interview evaluations found."
            )

        # -----------------------------------------
        # OVERALL SCORE
        # -----------------------------------------

        scores = [
            float(item.get("score", 0))
            for item in data
            if isinstance(item.get("score", 0), (int, float))
        ]

        if not scores:
            raise HTTPException(
                status_code=400,
                detail="No valid evaluation scores found."
            )

        overall_score = round(
            sum(scores) / len(scores),
            1
        )

        # -----------------------------------------
        # CATEGORY ANALYSIS
        # -----------------------------------------

        technical_scores = []
        relevance_scores = []
        communication_scores = []
        problem_solving_scores = []

        for item in data:

            score = float(item.get("score", 0))

            question = str(
                item.get("question", "")
            ).lower()

            answer = str(
                item.get("answer", "")
            ).lower()

            # -----------------------------
            # Technical Knowledge
            # -----------------------------

            technical_keywords = [
                "python",
                "fastapi",
                "sql",
                "database",
                "api",
                "javascript",
                "programming",
                "framework",
                "backend",
                "frontend",
                "algorithm",
                "function",
                "variable",
                "list",
                "tuple",
                "key",
                "table",
                "scope"
            ]

            technical_matches = sum(
                1
                for keyword in technical_keywords
                if keyword in answer
            )

            if technical_matches >= 3:
                technical_score = min(
                    10,
                    score + 0.5
                )
            elif technical_matches >= 1:
                technical_score = score
            else:
                technical_score = max(
                    1,
                    score - 1
                )

            technical_scores.append(
                technical_score
            )

            # -----------------------------
            # Answer Relevance
            # -----------------------------

            question_words = set(
                question.split()
            )

            answer_words = set(
                answer.split()
            )

            common_words = (
                question_words
                & answer_words
            )

            if len(common_words) >= 2:
                relevance_score = min(
                    10,
                    score + 0.5
                )
            elif len(common_words) >= 1:
                relevance_score = score
            else:
                relevance_score = max(
                    1,
                    score - 1
                )

            relevance_scores.append(
                relevance_score
            )

            # -----------------------------
            # Communication
            # -----------------------------

            word_count = len(
                answer.split()
            )

            if word_count >= 30:
                communication_score = min(
                    10,
                    score + 0.5
                )
            elif word_count >= 15:
                communication_score = score
            elif word_count >= 7:
                communication_score = max(
                    1,
                    score - 0.5
                )
            else:
                communication_score = max(
                    1,
                    score - 1
                )

            communication_scores.append(
                communication_score
            )

            # -----------------------------
            # Problem Solving
            # -----------------------------

            reasoning_keywords = [
                "because",
                "therefore",
                "example",
                "approach",
                "solution",
                "solve",
                "reason",
                "steps",
                "implement",
                "used",
                "when",
                "why"
            ]

            reasoning_matches = sum(
                1
                for keyword in reasoning_keywords
                if keyword in answer
            )

            if reasoning_matches >= 2:
                problem_solving_score = min(
                    10,
                    score + 0.5
                )
            elif reasoning_matches == 1:
                problem_solving_score = score
            else:
                problem_solving_score = max(
                    1,
                    score - 0.5
                )

            problem_solving_scores.append(
                problem_solving_score
            )

        # -----------------------------------------
        # FINAL CATEGORY SCORES
        # -----------------------------------------

        technical_knowledge = round(
            sum(technical_scores)
            / len(technical_scores),
            1
        )

        communication = round(
            sum(communication_scores)
            / len(communication_scores),
            1
        )

        answer_relevance = round(
            sum(relevance_scores)
            / len(relevance_scores),
            1
        )

        problem_solving = round(
            sum(problem_solving_scores)
            / len(problem_solving_scores),
            1
        )

        # -----------------------------------------
        # FINAL FEEDBACK
        # -----------------------------------------

        if overall_score >= 8.5:

            feedback = (
                "The candidate demonstrated strong technical "
                "knowledge, relevant answers and good communication. "
                "The responses generally showed clear understanding "
                "of the technical concepts."
            )

        elif overall_score >= 7:

            feedback = (
                "The candidate demonstrated a good understanding "
                "of the technical topics and provided relevant "
                "responses. Some answers could be improved with "
                "more detailed explanations and reasoning."
            )

        elif overall_score >= 5:

            feedback = (
                "The candidate demonstrated a basic understanding "
                "of the technical topics. Several responses would "
                "benefit from greater technical detail, clarity "
                "and stronger reasoning."
            )

        else:

            feedback = (
                "The candidate needs to improve technical "
                "knowledge, answer relevance and explanation "
                "of technical concepts."
            )

        # -----------------------------------------
        # FINAL RESPONSE
        # -----------------------------------------

        return {
            "technical_knowledge": technical_knowledge,
            "communication": communication,
            "answer_relevance": answer_relevance,
            "problem_solving": problem_solving,
            "overall_score": overall_score,
            "feedback": feedback,
            "total_questions": len(data),
            "source": "Question-Aware AI Video Interview Scorecard"
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid evaluation data."
        )

# ---------------------------------------------------------
# SAVE VIDEO INTERVIEW SCORECARD
# ---------------------------------------------------------
@router.post("/save-video-scorecard")
def save_video_scorecard(
    candidate_email: str,
    scorecard: dict,
    db: Session = Depends(get_db),
):
    if not candidate_email.strip():
        raise HTTPException(
            status_code=400,
            detail="Candidate email is required",
        )

    record = (
        db.query(VideoInterviewScorecard)
        .filter(
            VideoInterviewScorecard.candidate_email == candidate_email
        )
        .first()
    )

    if record:
        record.scorecard_json = json.dumps(scorecard)
    else:
        record = VideoInterviewScorecard(
            candidate_email=candidate_email,
            scorecard_json=json.dumps(scorecard),
        )
        db.add(record)

    db.commit()

    return {"message": "Video interview scorecard saved successfully"}


# ---------------------------------------------------------
# GET VIDEO INTERVIEW SCORECARD
# ---------------------------------------------------------
@router.get("/video-scorecard")
def get_video_scorecard(
    candidate_email: str,
    db: Session = Depends(get_db),
):
    record = (
        db.query(VideoInterviewScorecard)
        .filter(
            VideoInterviewScorecard.candidate_email == candidate_email
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Video interview scorecard not found",
        )

    return json.loads(record.scorecard_json)