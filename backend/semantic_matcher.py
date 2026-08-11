import re
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


# Load the semantic embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")


def calculate_similarity(resume_text, job_description):
    """
    Compare resume text with job description
    using semantic embeddings and cosine similarity.
    """

    # Convert both texts into embeddings
    resume_embedding = model.encode([resume_text])
    job_embedding = model.encode([job_description])

    # Calculate cosine similarity
    similarity = cosine_similarity(
        resume_embedding,
        job_embedding
    )[0][0]

    # Convert to percentage
    score = similarity * 100

    return round(score, 2)


def extract_skill_matches(resume_text, job_description):
    """
    Find skills that are present in both the resume and job description.
    """

    skills = [
        "Python",
        "C++",
        "Java",
        "JavaScript",
        "SQL",
        "HTML",
        "CSS",
        "React",
        "Node.js",
        "FastAPI",
        "Django",
        "Machine Learning",
        "Data Analysis",
        "Git",
        "GitHub",
        "Docker",
        "AWS",
        "REST API",
        "Flask",
        "MySQL"
    ]

    resume_lower = resume_text.lower()
    jd_lower = job_description.lower()

    matched_skills = []
    missing_skills = []

    for skill in skills:
        skill_lower = skill.lower()

        if re.search(
            r"(?<![A-Za-z0-9+#])" + re.escape(skill_lower) + r"(?![A-Za-z0-9+#])",
            jd_lower
        ):
            if re.search(
                r"(?<![A-Za-z0-9+#])" + re.escape(skill_lower) + r"(?![A-Za-z0-9+#])",
                resume_lower
            ):
                matched_skills.append(skill)
            else:
                missing_skills.append(skill)

    return matched_skills, missing_skills