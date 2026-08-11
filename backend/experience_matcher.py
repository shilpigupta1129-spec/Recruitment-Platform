import re


def check_experience(resume_text, job_description):
    """
    Compare the experience-related requirements in the
    job description with the candidate's resume.
    """

    resume_lower = resume_text.lower()
    jd_lower = job_description.lower()

    experience_keywords = [
        "experience",
        "internship",
        "intern",
        "developer",
        "software development",
        "web development",
        "frontend",
        "backend",
        "programming",
        "project",
        "team",
        "problem solving"
    ]

    # Find experience-related requirements in JD
    required_experience = []

    for keyword in experience_keywords:
        if re.search(
            r"(?<![a-z0-9+#])"
            + re.escape(keyword)
            + r"(?![a-z0-9+#])",
            jd_lower
        ):
            if keyword not in required_experience:
                required_experience.append(keyword)

    # Check which requirements appear in resume
    matched_experience = []

    for keyword in required_experience:
        if re.search(
            r"(?<![a-z0-9+#])"
            + re.escape(keyword)
            + r"(?![a-z0-9+#])",
            resume_lower
        ):
            matched_experience.append(keyword)

    # Determine status
    if not required_experience:
        status = "No experience requirement found"

    elif len(matched_experience) == len(required_experience):
        status = "Matched"

    elif len(matched_experience) > 0:
        status = "Partially Matched"

    else:
        status = "Not Matched"

    return {
        "status": status,
        "required": required_experience,
        "matched": matched_experience
    }