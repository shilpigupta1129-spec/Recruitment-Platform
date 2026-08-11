import re


def check_qualification(resume_text, job_description):
    """
    Check whether the candidate's education
    satisfies the education requirement in the job description.
    """

    resume_lower = resume_text.lower()
    jd_lower = job_description.lower()

    # Common qualification keywords
    qualification_keywords = [
        "b.sc",
        "bsc",
        "bachelor",
        "b.e",
        "be",
        "b.tech",
        "btech",
        "m.sc",
        "msc",
        "master",
        "m.e",
        "me",
        "m.tech",
        "mtech",
        "computer science",
        "information technology",
        "engineering"
    ]

    required_qualifications = []

    # Find qualifications mentioned in JD
    for qualification in qualification_keywords:
        if re.search(
            r"(?<![a-z0-9+#])"
            + re.escape(qualification)
            + r"(?![a-z0-9+#])",
            jd_lower
        ):
            if qualification not in required_qualifications:
                required_qualifications.append(qualification)

    # Check whether required qualifications
    # are present in resume
    matched_qualifications = []

    for qualification in required_qualifications:
        if re.search(
            r"(?<![a-z0-9+#])"
            + re.escape(qualification)
            + r"(?![a-z0-9+#])",
            resume_lower
        ):
            matched_qualifications.append(qualification)

    # Determine result
    if not required_qualifications:
        status = "No qualification requirement found"

    elif len(matched_qualifications) == len(required_qualifications):
        status = "Matched"

    else:
        status = "Partially Matched"

    return {
        "status": status,
        "required": required_qualifications,
        "matched": matched_qualifications
    }